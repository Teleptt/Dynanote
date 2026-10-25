import { LogicGateSpec } from '../types';

export type Bit = 0 | 1;
const MAX_TABLE_INPUTS = 6;

/** Propagate input bits through the gate network. Gate inputs are ordered by wire inputIndex. */
export function evaluateLogic(spec: LogicGateSpec, inputs: Record<string, Bit>) {
  const values: Record<string, Bit> = { ...inputs };
  const gates = spec.gates || [];
  const wires = spec.wires || [];
  // Repeated passes settle multi-stage cascades in any declaration order.
  for (let pass = 0; pass < gates.length + 1; pass++) {
    for (const gate of gates) {
      const inVals = wires
        .map((w, order) => ({ w, order }))
        .filter(({ w }) => w.toId === gate.id)
        .sort((x, y) => (x.w.inputIndex ?? x.order) - (y.w.inputIndex ?? y.order))
        .map(({ w }) => values[w.fromId] ?? 0);
      const a = inVals[0] ?? 0, b = inVals[1] ?? 0;
      let out: Bit;
      switch (gate.type) {
        case 'AND': out = (a & b) as Bit; break;
        case 'OR': out = (a | b) as Bit; break;
        case 'NOT': out = (1 - a) as Bit; break;
        case 'XOR': out = (a ^ b) as Bit; break;
        case 'NAND': out = (1 - (a & b)) as Bit; break;
        case 'NOR': out = (1 - (a | b)) as Bit; break;
        case 'XNOR': out = (1 - (a ^ b)) as Bit; break;
        default: out = a;
      }
      values[gate.id] = out;
    }
  }
  const wireStates: Record<string, Bit> = {};
  for (const w of wires) wireStates[w.id] = values[w.fromId] ?? 0;
  for (const out of spec.outputs || []) {
    const src = out.fromGateId || out.fromInputId;
    if (src && values[src] !== undefined) values[out.id] = values[src];
  }
  return { nodeValues: values, wireStates };
}

/** Truth table computed from the circuit itself, so it can never disagree with the wiring. */
export function deriveTruthTable(spec: LogicGateSpec): { inputs: Bit[]; outputs: Bit[] }[] | null {
  const ins = spec.inputs || [], outs = spec.outputs || [];
  if (!ins.length || !outs.length || ins.length > MAX_TABLE_INPUTS) return null;
  const rows = [];
  for (let mask = 0; mask < 1 << ins.length; mask++) {
    // First input is the most significant bit, matching the usual textbook ordering.
    const bits = ins.map((_, i) => ((mask >> (ins.length - 1 - i)) & 1) as Bit);
    const { nodeValues } = evaluateLogic(spec, Object.fromEntries(ins.map((inp, i) => [inp.id, bits[i]])));
    rows.push({ inputs: bits, outputs: outs.map(o => nodeValues[o.id] ?? 0) });
  }
  return rows;
}

/** Rows of a supplied truth table that contradict the circuit, as readable messages. */
export function truthTableMismatches(spec: LogicGateSpec): string[] {
  const problems: string[] = [];
  for (const row of spec.truthTable || []) {
    const inputs = Object.fromEntries((spec.inputs || []).map(inp => [inp.id, (row.inputs[inp.label] ?? row.inputs[inp.id] ?? 0) as Bit]));
    const { nodeValues } = evaluateLogic(spec, inputs);
    for (const out of spec.outputs || []) {
      const stated = row.outputs[out.label] ?? row.outputs[out.id];
      if (stated !== undefined && stated !== nodeValues[out.id]) problems.push(`${JSON.stringify(row.inputs)}: ${out.label} is ${nodeValues[out.id]}, table says ${stated}`);
    }
  }
  return problems;
}
