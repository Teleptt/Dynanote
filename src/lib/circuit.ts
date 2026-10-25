import { CircuitSpec } from '../types';
/** Deliberately bounded solver: a single DC series loop, with explicit unsupported states. */
export function solveSeriesCircuit(spec: CircuitSpec, params: Record<string, number>, switches: Record<string, boolean>) {
  const unsupported = (reason: string) => ({ supported: false, reason, current: 0, resistance: 0, voltage: 0, power: 0 });
  if (spec.simulationType !== 'dc' || spec.components.some(c => !['dc_source','resistor','switch'].includes(c.type))) return unsupported('Schematic only: measurements support DC series resistors and switches.');
  const sources = spec.components.filter(c => c.type === 'dc_source');
  if (sources.length !== 1) return unsupported('Measurements require exactly one DC source.');
  const parent = new Map<string, string>();
  const pin = (id: string, n: number) => `${id}:${n}`;
  for (const c of spec.components) for (const n of [0,1]) parent.set(pin(c.id,n),pin(c.id,n));
  function find(x: string): string { const p = parent.get(x)!; if (p === x) return x; const root = find(p); parent.set(x,root); return root; }
  for (const w of spec.wires) { const a = pin(w.from.compId,w.from.pin), b = pin(w.to.compId,w.to.pin); if (!parent.has(a) || !parent.has(b)) return unsupported('Invalid wire endpoint.'); parent.set(find(a),find(b)); }
  const graph = new Map<string,string[]>();
  for (const c of spec.components) {
    const a = find(pin(c.id,0)), b = find(pin(c.id,1));
    if (a === b) return unsupported('A component is shorted by a wire.');
    graph.set(a,[...(graph.get(a)||[]),b]); graph.set(b,[...(graph.get(b)||[]),a]);
  }
  if ([...graph.values()].some(edges => edges.length !== 2)) return unsupported('Incomplete or branching circuit: only a closed series loop is supported.');
  const seen = new Set<string>(); const queue = [graph.keys().next().value as string];
  while (queue.length) { const n = queue.pop()!; if (seen.has(n)) continue; seen.add(n); queue.push(...graph.get(n)!); }
  if (seen.size !== graph.size) return unsupported('Disconnected circuit loops.');
  const resistors = spec.components.filter(c => c.type === 'resistor');
  const values = resistors.map(c => params[c.id] ?? c.value);
  if (!values.length || values.some(v => !Number.isFinite(v) || v <= 0)) return unsupported('Positive resistance is required.');
  const resistance = values.reduce((a,b) => a+b,0), voltage = params[sources[0].id] ?? sources[0].value;
  if (!Number.isFinite(voltage)) return unsupported('Invalid voltage.');
  const closed = spec.components.filter(c => c.type === 'switch').every(c => switches[c.id] ?? c.state !== false);
  const current = closed ? voltage / resistance : 0;
  return { supported: true, reason: closed ? 'DC series model' : 'Open switch', current, resistance, voltage, power: current * current * resistance };
}
