export type CompiledExpression = (scope?: Record<string, number>) => number;
type Node = (scope: Record<string, number>) => number;

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos,
  atan: Math.atan, atan2: Math.atan2, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs,
  log: Math.log, ln: Math.log, log10: Math.log10, pow: Math.pow, min: Math.min,
  max: Math.max, floor: Math.floor, ceil: Math.ceil, round: Math.round, hypot: Math.hypot
};
// [min, max] argument counts; Infinity for variadic functions.
const ARITY: Record<string, [number, number]> = { atan2: [2, 2], pow: [2, 2], min: [1, Infinity], max: [1, Infinity], hypot: [1, Infinity] };
const CONSTANTS: Record<string, number> = { pi: Math.PI, PI: Math.PI, e: Math.E, E: Math.E };
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Arithmetic-only compiler: no property access, assignments, or JavaScript execution.
 * Parses once into a closure tree; syntax and unknown functions throw at compile time,
 * unknown variables throw at evaluation time (scope may differ per call).
 */
export function compileExpression(source: string): CompiledExpression {
  if (source.length > 2000) throw new Error('Expression is too long');
  const tokens = source.match(/(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\*\*|[^\s]/g) || [];
  let i = 0;
  function primary(): Node {
    const token = tokens[i++];
    if (token === '(') { const v = sum(); if (tokens[i++] !== ')') throw new Error('Expected )'); return v; }
    if (/^(?:\d|\.)/.test(token || '') && Number.isFinite(Number(token))) { const n = Number(token); return () => n; }
    if (!token || !/^[A-Za-z_][A-Za-z_0-9]*$/.test(token)) throw new Error('Invalid expression');
    if (tokens[i] === '(') {
      if (!has(FUNCTIONS, token)) throw new Error('Unknown function: ' + token);
      i++; const args = [sum()];
      while (tokens[i] === ',') { i++; args.push(sum()); }
      if (tokens[i++] !== ')') throw new Error('Expected )');
      const [lo, hi] = ARITY[token] || [1, 1];
      if (args.length < lo || args.length > hi) throw new Error(`${token} expects ${lo === hi ? lo : lo + '+'} argument${hi === 1 ? '' : 's'}, got ${args.length}`);
      const fn = FUNCTIONS[token];
      return s => fn(...args.map(a => a(s)));
    }
    const constant = has(CONSTANTS, token) ? CONSTANTS[token] : undefined;
    return s => {
      if (has(s, token)) return s[token];
      if (constant !== undefined) return constant;
      throw new Error('Unknown variable: ' + token);
    };
  }
  function power(): Node { const b = primary(); if (tokens[i] === '^' || tokens[i] === '**') { i++; const x = unary(); return s => b(s) ** x(s); } return b; }
  function unary(): Node { if (tokens[i] === '+') { i++; return unary(); } if (tokens[i] === '-') { i++; const v = unary(); return s => -v(s); } return power(); }
  function product(): Node {
    let v = unary();
    while (['*', '/', '%'].includes(tokens[i])) {
      const op = tokens[i++], l = v, r = unary();
      v = op === '*' ? s => l(s) * r(s) : op === '/' ? s => l(s) / r(s) : s => l(s) % r(s);
    }
    return v;
  }
  function sum(): Node {
    let v = product();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++], l = v, r = product();
      v = op === '+' ? s => l(s) + r(s) : s => l(s) - r(s);
    }
    return v;
  }
  const root = sum(); if (i !== tokens.length) throw new Error('Unexpected token: ' + tokens[i]);
  return (scope = {}) => root(scope);
}

export function evaluateExpression(source: string, scope: Record<string, number> = {}): number {
  return compileExpression(source)(scope);
}
