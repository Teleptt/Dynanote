import { CircuitComponent, CircuitSpec, TreeNode } from '../types';

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };

/** Smallest viewBox containing every point (each with its own radius), plus padding; never smaller than minSize. */
export function fitViewBox(items: Array<Point & { r?: number }>, pad = 20, minSize = { width: 200, height: 120 }): Box {
  if (!items.length) return { x: 0, y: 0, ...minSize };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of items) {
    const r = p.r ?? 0;
    x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r);
    x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r);
  }
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  // Grow around the centre up to the minimum so small layouts are not blown up.
  const w = Math.max(x1 - x0, minSize.width), h = Math.max(y1 - y0, minSize.height);
  return { x: (x0 + x1 - w) / 2, y: (y0 + y1 - h) / 2, width: w, height: h };
}

export const viewBoxAttr = (b: Box) => `${b.x} ${b.y} ${b.width} ${b.height}`;

/**
 * Tidy binary-tree layout from the left/right links alone: x by in-order position, y by depth.
 * Model-supplied coordinates are ignored, so trees can never overlap or leave the frame.
 */
export function layoutTree(nodes: TreeNode[], gapX = 52, gapY = 64): Record<string, Point> {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const children = new Set(nodes.flatMap(n => [n.left, n.right]).filter((id): id is string => !!id && byId.has(id)));
  const roots = nodes.filter(n => !children.has(n.id));
  const pos: Record<string, Point> = {};
  let column = 0;
  const visit = (id: string | undefined, depth: number) => {
    const n = id ? byId.get(id) : undefined;
    if (!n || pos[n.id]) return; // guards against cycles and shared children
    pos[n.id] = { x: 0, y: depth * gapY }; // reserve before recursing
    visit(n.left, depth + 1);
    pos[n.id].x = column++ * gapX;
    visit(n.right, depth + 1);
  };
  for (const r of roots.length ? roots : nodes.slice(0, 1)) visit(r.id, 0);
  // Anything unreachable (malformed links) goes on its own row below, rather than vanishing.
  const maxDepth = Math.max(0, ...Object.values(pos).map(p => p.y));
  nodes.filter(n => !pos[n.id]).forEach((n, i) => { pos[n.id] = { x: i * gapX, y: maxDepth + gapY }; });
  return pos;
}

// Half-length of each component symbol along its axis; pins sit at ±this distance.
const HALF_LENGTH: Record<string, number> = { resistor: 35, inductor: 35, capacitor: 25, switch: 20, dc_source: 25, ac_source: 25, lamp: 20, ground: 15 };
// Every two-terminal part, sources included, lies horizontally at rotation 0 and vertically at 90 (pin 0 on top).
const VERTICAL_AT_ZERO = new Set(['ground']);

/** Where a pin is, and which way a wire should leave it. Pin 0 is the start of the symbol's axis (left/top before rotation). */
export function pinGeometry(comp: CircuitComponent, pin: number): { at: Point; dir: Point } {
  const half = HALF_LENGTH[comp.type] ?? 25;
  const base = VERTICAL_AT_ZERO.has(comp.type) ? 90 : 0;
  const angle = ((base + (comp.rotation || 0)) * Math.PI) / 180;
  const sign = pin === 0 ? -1 : 1;
  const dir = { x: Math.round(Math.cos(angle) * sign * 1e6) / 1e6, y: Math.round(Math.sin(angle) * sign * 1e6) / 1e6 };
  if (comp.type === 'ground') return { at: { x: comp.pos.x, y: comp.pos.y - half }, dir: { x: 0, y: -1 } };
  return { at: { x: comp.pos.x + dir.x * half, y: comp.pos.y + dir.y * half }, dir };
}

/** Orthogonal route between two pins: a short stub out of each pin, then the fewest bends that respect both exits. */
export function routeWire(a: { at: Point; dir: Point }, b: { at: Point; dir: Point }, stub = 12): Point[] {
  const p = { x: a.at.x + a.dir.x * stub, y: a.at.y + a.dir.y * stub };
  const q = { x: b.at.x + b.dir.x * stub, y: b.at.y + b.dir.y * stub };
  const horizontal = (d: Point) => Math.abs(d.x) > Math.abs(d.y);
  let middle: Point[];
  if (horizontal(a.dir) && horizontal(b.dir)) {
    // Both leave sideways: same direction -> run to the outermost x; facing -> meet halfway.
    const x = a.dir.x === b.dir.x ? (a.dir.x > 0 ? Math.max(p.x, q.x) : Math.min(p.x, q.x)) : (p.x + q.x) / 2;
    middle = [{ x, y: p.y }, { x, y: q.y }];
  } else if (!horizontal(a.dir) && !horizontal(b.dir)) {
    const y = a.dir.y === b.dir.y ? (a.dir.y > 0 ? Math.max(p.y, q.y) : Math.min(p.y, q.y)) : (p.y + q.y) / 2;
    middle = [{ x: p.x, y }, { x: q.x, y }];
  } else {
    middle = [horizontal(a.dir) ? { x: q.x, y: p.y } : { x: p.x, y: q.y }];
  }
  const pts = [a.at, p, ...middle, q, b.at];
  return pts.filter((pt, i) => i === 0 || pt.x !== pts[i - 1].x || pt.y !== pts[i - 1].y);
}

export const pathFromPoints = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');

/** Wire polylines for a circuit, routed from pin geometry unless the spec gives usable right-angle bends. */
export function circuitWirePaths(spec: CircuitSpec): { id: string; points: Point[] }[] {
  const byId = new Map(spec.components.map(c => [c.id, c]));
  return spec.wires.flatMap(w => {
    const from = byId.get(w.from.compId), to = byId.get(w.to.compId);
    if (!from || !to) return [];
    const a = pinGeometry(from, w.from.pin), b = pinGeometry(to, w.to.pin);
    // Model-supplied bends often assume different pin positions; use them only if they form a right-angle path.
    const via = w.points?.length ? [a.at, ...w.points, b.at] : null;
    const orthogonal = via?.every((p, i) => i === 0 || p.x === via[i - 1].x || p.y === via[i - 1].y);
    return [{ id: w.id, points: orthogonal ? via! : routeWire(a, b) }];
  });
}

/** Everything a circuit draws, with room for labels around each symbol. */
export function circuitBounds(spec: CircuitSpec): Box {
  // Labels extend up to ~70px beside a symbol (e.g. "12V DC", "OPEN (Click to Close)").
  const items: Array<Point & { r?: number }> = spec.components.map(c => ({ ...c.pos, r: c.type === 'dc_source' || c.type === 'switch' ? 72 : 48 }));
  // Simulated-value readouts sit to the right of vertical parts and to the left of vertical sources.
  for (const c of spec.components) if (c.rotation === 90 || c.rotation === 270) items.push({ x: c.pos.x + (c.type === 'dc_source' ? -130 : 130), y: c.pos.y });
  for (const w of circuitWirePaths(spec)) items.push(...w.points);
  return fitViewBox(items, 16, { width: 320, height: 200 });
}
