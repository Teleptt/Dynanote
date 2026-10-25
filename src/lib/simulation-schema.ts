import { SimulationSpec } from '../types';
const domains = ['math','circuit','physics','chemistry','algorithm','logic','orbit','3d','diagram','generative'];
/** Validate external data before any renderer or domain repair code reads it. */
export function assertSimulation(value: unknown): asserts value is SimulationSpec {
  const s = value as any;
  const fail = (message: string): never => { throw new Error('Invalid simulation: ' + message); };
  if (!s || typeof s !== 'object') fail('spec must be an object');
  // Name the rejected value and the allowed ones so a model revision can correct it directly.
  if (!domains.includes(s.domain)) fail(`unsupported domain ${JSON.stringify(s.domain)}; "domain" must be exactly one of ${domains.filter(d => d !== 'generative').join(', ')}`);
  if (typeof s.title !== 'string') fail('title must be text');
  const array = (v: any, label: string) => { if (!Array.isArray(v) || v.length > 10000 || v.some(x => !x || typeof x !== 'object')) fail(label + ' must be an array of objects'); };
  const number = (v: any, label: string) => { if (!Number.isFinite(v)) fail(label + ' must be finite'); };
  const position = (v: any) => { if (!v) fail('missing position'); number(v.x, 'x'); number(v.y, 'y'); };
  array(s.params, 'params');
  const ids = new Set();
  s.params.forEach((p: any) => {
    if (typeof p.id !== 'string' || !/^[A-Za-z_][A-Za-z_0-9]*$/.test(p.id) || ids.has(p.id)) fail('parameter IDs must be unique identifiers');
    ids.add(p.id); ['min','max','default','step'].forEach(k => number(p[k], k));
    if (p.min > p.max || p.step <= 0 || p.default < p.min || p.default > p.max) fail('invalid parameter range');
  });
  const lists: Record<string, string[]> = { math:['functions'], circuit:['components','wires'], physics:['bodies','constraints'], chemistry:['reactants','products','mechanismSteps'], algorithm:['steps'], logic:['inputs','outputs','gates','wires'], orbit:['bodies'], diagram:['shapes','hotspots'], '3d':[], generative:[] };
  lists[s.domain].forEach(k => array(s[k], k));
  if (s.domain === 'math') {
    if (!s.bounds) fail('missing bounds');
    ['xMin','xMax','yMin','yMax'].forEach(k => number(s.bounds[k], k));
    if (s.bounds.xMin >= s.bounds.xMax || s.bounds.yMin >= s.bounds.yMax) fail('bounds must increase');
    s.functions.forEach((f: any) => { if (typeof f.expression !== 'string') fail('missing expression'); });
    if (s.calculus?.integralPartitions !== undefined && (!Number.isInteger(s.calculus.integralPartitions) || s.calculus.integralPartitions < 1 || s.calculus.integralPartitions > 1000)) fail('integral partitions must be 1–1000');
  }
  if (s.domain === 'circuit') {
    const componentIds = new Set(s.components.map((c: any) => c.id));
    if (componentIds.size !== s.components.length) fail('duplicate component IDs');
    s.components.forEach((c: any) => { position(c.pos); number(c.value, 'component value'); if (c.state !== undefined && typeof c.state !== 'boolean') fail('switch state must be true (closed) or false (open)'); });
    s.wires.forEach((w: any) => [w.from,w.to].forEach(p => { if (!p || !componentIds.has(p.compId) || ![0,1].includes(p.pin)) fail('invalid wire endpoint'); }));
  }
  if (s.domain === 'physics') { position(s.gravity); s.bodies.forEach((b: any) => { position(b.pos); number(b.mass,'mass'); if (!b.dimensions) fail('missing body dimensions'); }); }
  if (s.domain === 'logic') [...s.inputs,...s.outputs,...s.gates].forEach((g: any) => position(g.pos));
  if (s.domain === 'orbit') { if (!s.centralBody) fail('missing central body'); number(s.centralBody.mass,'central mass'); s.bodies.forEach((b: any) => ['mass','radius','semiMajorAxis','eccentricity','orbitalPeriod'].forEach(k => number(b[k], k))); }
  if (s.domain === 'chemistry') s.mechanismSteps.forEach((step: any) => { ['atoms','bonds','curvedArrows'].forEach(k => array(step[k], k)); step.atoms.forEach((a: any) => position(a.pos)); });
  if (s.domain === 'diagram') s.hotspots.forEach((h: any) => position(h));
  if (s.domain === '3d') {
    if (!['surface','curve','scatter','vector_field'].includes(s.graphType)) fail('unknown 3D mode');
    const range = (r: any) => { if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isFinite) || r[0] >= r[1]) fail('invalid 3D range'); };
    if (s.graphType === 'surface') { if (!s.surface || typeof s.surface.equation !== 'string') fail('missing surface'); range(s.surface.xRange); range(s.surface.yRange); }
    if (s.graphType === 'curve') { if (!s.curve || !['expressionX','expressionY','expressionZ'].every(k => typeof s.curve[k] === 'string')) fail('missing curve'); range(s.curve.tRange); }
    if (s.graphType === 'scatter') array(s.points, 'points');
    if (s.graphType === 'vector_field') array(s.vectors, 'vectors');
    if (s.surface?.resolution !== undefined && (!Number.isInteger(s.surface.resolution) || s.surface.resolution < 2 || s.surface.resolution > 60)) fail('surface resolution must be 2–60');
    if (s.curve?.tResolution !== undefined && (!Number.isInteger(s.curve.tResolution) || s.curve.tResolution < 2 || s.curve.tResolution > 2000)) fail('curve resolution must be 2–2000');
  }
}
