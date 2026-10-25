import { CircuitSpec } from '../types';

export interface ComponentResult {
  /** Voltage of pin 0 minus pin 1. */
  voltage: number;
  /** Current entering pin 0 and leaving pin 1 (null for open parts such as capacitors). */
  current: number | null;
  /** Power absorbed; negative means the part delivers power (a source). */
  power: number | null;
}

export interface CircuitSolution {
  supported: boolean;
  reason: string;
  /** Node key for every component pin, e.g. "r1:0" -> "n2". */
  pinNode: Record<string, string>;
  /** Volts relative to the reference node; null where a node is floating (no conducting path to the reference). */
  nodeVoltages: Record<string, number | null>;
  referenceNode: string | null;
  components: Record<string, ComponentResult>;
  /** Current delivered by the single source (0 for none or several), kept for the summary readout. */
  current: number;
  voltage: number;
  /** Total power delivered by all sources. */
  power: number;
  resistance: number;
}

const pinKey = (id: string, n: number) => `${id}:${n}`;
// Parts that behave as an ideal 0 V source in DC steady state: their current is solved for directly.
const SHORT_TYPES = new Set(['inductor', 'ammeter']);
// Parts that carry no DC current.
const OPEN_TYPES = new Set(['capacitor', 'voltmeter', 'ground']);

/**
 * DC operating point by modified nodal analysis: resistors, DC sources, switches, ground,
 * inductors (short) and capacitors (open) in any topology. AC sources and diodes are not modelled.
 * For transient circuits this is the steady state reached after the switch-on transient decays.
 */
export function solveCircuit(spec: CircuitSpec, params: Record<string, number>, switches: Record<string, boolean>): CircuitSolution {
  const empty = (reason: string, extra: Partial<CircuitSolution> = {}): CircuitSolution =>
    ({ supported: false, reason, pinNode: {}, nodeVoltages: {}, referenceNode: null, components: {}, current: 0, voltage: 0, power: 0, resistance: 0, ...extra });
  if (spec.simulationType === 'ac') return empty('Schematic only: AC analysis is not simulated.');
  const unsupported = spec.components.find(c => ['ac_source', 'diode'].includes(c.type));
  if (unsupported) return empty(`Schematic only: ${unsupported.type.replace('_', ' ')} "${unsupported.label || unsupported.id}" is not simulated.`);

  // 1. Nodes: pins joined by wires.
  const parent = new Map<string, string>();
  for (const c of spec.components) for (const n of [0, 1]) parent.set(pinKey(c.id, n), pinKey(c.id, n));
  const find = (x: string): string => { const p = parent.get(x)!; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  for (const w of spec.wires) {
    const a = pinKey(w.from.compId, w.from.pin), b = pinKey(w.to.compId, w.to.pin);
    if (!parent.has(a) || !parent.has(b)) return empty('Invalid wire endpoint.');
    parent.set(find(a), find(b));
  }
  const nodeNames = new Map<string, string>();
  const pinNode: Record<string, string> = {};
  for (const key of parent.keys()) {
    const root = find(key);
    if (!nodeNames.has(root)) nodeNames.set(root, `n${nodeNames.size}`);
    pinNode[key] = nodeNames.get(root)!;
  }
  const node = (id: string, n: number) => pinNode[pinKey(id, n)];

  // 2. Elements. Switches act as shorts when closed and are absent when open.
  type Element = { id: string; a: string; b: string } & ({ kind: 'R'; g: number } | { kind: 'V'; v: number });
  const elements: Element[] = [];
  for (const c of spec.components) {
    const a = node(c.id, 0), b = node(c.id, 1);
    const value = params[c.id] ?? c.value;
    if (c.type === 'resistor' || (c.type === 'lamp' && /Ω|ohm/i.test(c.unit))) {
      if (!Number.isFinite(value) || value <= 0) return empty(`Resistor "${c.label || c.id}" needs a positive resistance.`);
      elements.push({ id: c.id, a, b, kind: 'R', g: 1 / value });
    } else if (c.type === 'lamp') {
      return empty(`Lamp "${c.label || c.id}" has no resistance in ohms, so it cannot be simulated.`);
    } else if (c.type === 'dc_source') {
      if (!Number.isFinite(value)) return empty('Invalid source voltage.');
      elements.push({ id: c.id, a, b, kind: 'V', v: value });
    } else if (c.type === 'switch') {
      if (switches[c.id] ?? c.state !== false) elements.push({ id: c.id, a, b, kind: 'V', v: 0 });
    } else if (SHORT_TYPES.has(c.type)) {
      elements.push({ id: c.id, a, b, kind: 'V', v: 0 });
    } else if (!OPEN_TYPES.has(c.type)) {
      return empty(`Schematic only: ${c.type} is not simulated.`);
    }
  }

  // 3. Reference: a ground symbol if present, otherwise the negative terminal of the first source.
  const ground = spec.components.find(c => c.type === 'ground');
  const firstSource = spec.components.find(c => c.type === 'dc_source');
  const referenceNode = ground ? node(ground.id, 0) : firstSource ? node(firstSource.id, 1) : null;
  if (!referenceNode) return empty('Schematic only: add a DC source to simulate voltages.', { pinNode });

  // 4. Only nodes joined to the reference through conducting parts have defined voltages.
  const adjacency = new Map<string, string[]>();
  for (const e of elements) { adjacency.set(e.a, [...(adjacency.get(e.a) || []), e.b]); adjacency.set(e.b, [...(adjacency.get(e.b) || []), e.a]); }
  const connected = new Set([referenceNode]);
  for (const queue = [referenceNode]; queue.length;) for (const next of adjacency.get(queue.pop()!) || []) if (!connected.has(next)) { connected.add(next); queue.push(next); }
  const active = elements.filter(e => connected.has(e.a));
  const unknownNodes = [...connected].filter(n => n !== referenceNode);
  const index = new Map(unknownNodes.map((n, i) => [n, i]));
  const sources = active.filter(e => e.kind === 'V');
  const size = unknownNodes.length + sources.length;

  // 5. Assemble and solve G·x = z (node voltages, then source currents).
  const A = Array.from({ length: size }, () => new Array(size + 1).fill(0));
  const at = (n: string) => index.get(n);
  active.forEach(e => {
    const i = at(e.a), j = at(e.b);
    if (e.kind === 'R') {
      if (i !== undefined) A[i][i] += e.g;
      if (j !== undefined) A[j][j] += e.g;
      if (i !== undefined && j !== undefined) { A[i][j] -= e.g; A[j][i] -= e.g; }
    }
  });
  sources.forEach((e, k) => {
    const row = unknownNodes.length + k, i = at(e.a), j = at(e.b);
    if (e.kind !== 'V') return;
    if (i !== undefined) { A[i][row] += 1; A[row][i] += 1; }
    if (j !== undefined) { A[j][row] -= 1; A[row][j] -= 1; }
    A[row][size] = e.v;
  });
  const x = gaussianSolve(A);
  if (!x) return empty('Short circuit: a source is shorted, or sources are connected in parallel with different voltages.', { pinNode });

  const nodeVoltages: Record<string, number | null> = {};
  for (const name of nodeNames.values()) nodeVoltages[name] = name === referenceNode ? 0 : connected.has(name) ? x[index.get(name)!] : null;
  const volts = (n: string) => nodeVoltages[n];
  // The KCL stamp (+1 at pin 0's node) makes each source unknown the current entering pin 0.
  const sourceCurrent = new Map(sources.map((e, k) => [e.id, x[unknownNodes.length + k]]));

  const components: Record<string, ComponentResult> = {};
  for (const c of spec.components) {
    const va = volts(node(c.id, 0)), vb = volts(node(c.id, 1));
    const voltage = va === null || vb === null ? NaN : va - vb;
    const element = active.find(e => e.id === c.id);
    let current: number | null = null;
    if (element?.kind === 'R') current = voltage * element.g;
    else if (element?.kind === 'V') current = sourceCurrent.get(c.id) ?? 0;
    else if (OPEN_TYPES.has(c.type) || c.type === 'switch') current = c.type === 'ground' ? null : 0;
    components[c.id] = { voltage, current, power: current === null || !Number.isFinite(voltage) ? null : voltage * current };
  }

  const dcSources = spec.components.filter(c => c.type === 'dc_source');
  const delivered = dcSources.reduce((sum, c) => sum - (components[c.id].power ?? 0), 0);
  const single = dcSources.length === 1 ? dcSources[0] : null;
  // Current out of the + terminal into the circuit.
  const current = single ? -(components[single.id].current ?? 0) : 0;
  const voltage = single ? components[single.id].voltage : 0;
  const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  const steady = spec.simulationType === 'transient' ? 'DC steady state (after the switch-on transient decays)' : 'DC operating point';
  return {
    supported: true,
    reason: Object.values(nodeVoltages).some(v => v === null) ? `${steady}; some nodes are floating` : steady,
    pinNode, nodeVoltages, referenceNode, components,
    current: clean(current), voltage, power: clean(delivered),
    resistance: current ? voltage / current : Infinity
  };
}

/** Gaussian elimination with partial pivoting on an augmented matrix; null when singular. */
function gaussianSolve(A: number[][]): number[] | null {
  const n = A.length;
  const scale = Math.max(1e-30, ...A.flat().map(Math.abs));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-12 * scale) return null;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      if (f) for (let k = col; k <= n; k++) A[r][k] -= f * A[col][k];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}
