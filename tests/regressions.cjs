const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, filename);
const { evaluateExpression } = require('../src/lib/expression.ts');
const { parseVault, attachResult } = require('../src/lib/vault.ts');
const { solveSeriesCircuit } = require('../src/lib/circuit.ts');
const { assertSimulation } = require('../src/lib/simulation-schema.ts');
const { extractAndValidateSimulation: parse } = require('../src/services/ai/json-cleaner.ts');
const { AgenticOrchestrator } = require('../src/services/ai/agent/agentic-orchestrator.ts');
const { MockOfflineProvider } = require('../src/services/ai/mock-provider.ts');
const { DEFAULT_NOTES } = require('../src/data/default-notes.ts');
test('arithmetic precedence, functions, parameters and hostile input', () => {
  assert.equal(evaluateExpression('-2^2 + pow(3,2)'),5);
  assert.equal(evaluateExpression('2^3^2'),512);
  assert.equal(evaluateExpression('sin(pi/2)*a',{a:3}),3);
  for(const expression of ['globalThis.localStorage.clear()', 'fetch("x")', 'x.constructor', '(()=>1)()', 'constructor(1)', 'x=1', '1;2']) assert.throws(()=>evaluateExpression(expression,{x:1}));
});
test('empty vault survives and corrupt storage is rejected', () => {
  assert.deepEqual(parseVault('[]'),[]);
  assert.throws(()=>parseVault('[{}]'));
  assert.throws(()=>parseVault(JSON.stringify([DEFAULT_NOTES[0],DEFAULT_NOTES[0]])));
});
test('generation preserves intervening edits and ignores deleted notes', () => {
  const note={...DEFAULT_NOTES[0],content:'new edits'};
  const updated=attachResult([note],note.id,latest=>({content:latest.content+'\nembedded'}));
  assert.equal(updated[0].content,'new edits\nembedded');
  assert.deepEqual(attachResult([],note.id,()=>({content:'stale'})),[]);
});
test('all offline declarative domains round-trip and validate', async () => {
  const provider=new MockOfflineProvider();
  for(const domain of ['math','circuit','physics','chemistry','algorithm','logic','orbit','3d','diagram']) {
    const response=await provider.generateSimulation({noteContent:'Example',domainHint:domain});
    assert.doesNotThrow(()=>assertSimulation(response.spec),domain);
    assert.equal(parse(JSON.stringify(response)).spec.domain,domain);
  }
});
test('existing example specs are structurally valid',()=>{
  for(const note of DEFAULT_NOTES) if(note.attachedSimulation) assert.doesNotThrow(()=>assertSimulation(note.attachedSimulation),note.title);
});
test('invalid specs and unknown domains are rejected',()=>{
  assert.throws(()=>assertSimulation({domain:'physics',title:'x',params:[]}));
  assert.throws(()=>parse('{"domain":"unknown","title":"x"}'));
});
test('JSON string contents are not rewritten',()=>{
  const spec={domain:'math',title:'literal , } stays',params:[],bounds:{xMin:-1,xMax:1,yMin:-1,yMax:1},functions:[{id:'f',expression:'x',color:'red'}]};
  assert.equal(parse(JSON.stringify(spec)).spec.title,spec.title);
});
test('invalid result never reports success after retry exhaustion',async()=>{
  const events=[];
  const provider={id:'mock',name:'Stub',generateSimulation:async()=>({spec:{domain:'generative',title:'blocked',params:[],renderCode:'anything'},explanation:'x'})};
  await assert.rejects(()=>AgenticOrchestrator.execute(provider,{noteContent:'x',onStatusUpdate:e=>events.push(e)},{}),/failed validation/);
  assert.equal(events.some(e=>e.step==='done'),false);
});
test('DC series measurements use topology and individual values',async()=>{
  const {spec}=await new MockOfflineProvider().generateSimulation({noteContent:'circuit',domainHint:'circuit'});
  assert.equal(solveSeriesCircuit(spec,{},{}).current,12/50);
  assert.equal(solveSeriesCircuit(spec,{r1:100,v1:20},{}).current,0.2);
  assert.equal(solveSeriesCircuit(spec,{}, {sw1:false}).current,0);
  assert.equal(solveSeriesCircuit({...spec,wires:spec.wires.slice(1)}, {}, {}).supported,false);
  assert.equal(solveSeriesCircuit({...spec,simulationType:'transient'}, {}, {}).supported,false);
});

const { SimulationOutputError } = require('../src/services/ai/json-cleaner.ts');
const { reviewSimulation } = require('../src/services/ai/agent/review-simulation.ts');
const mathSpec = (expression='x') => ({domain:'math',title:'Requested model',params:[],bounds:{xMin:-2,xMax:2,yMin:-2,yMax:2},functions:[{id:'f',expression,color:'red'}]});
function scriptedProvider(outputs) {
  const calls=[];
  return { id:'openai', name:'Scripted test provider', calls,
    generateSimulation:async request=>{calls.push(request); const output=outputs[calls.length-1]; if(output instanceof Error) throw output; return {spec:output,explanation:'Test',tokensUsed:10,modelUsed:'actual-model',proposal:{summary:'Choose the requested relationship',assumptions:['SI units'],limitations:[]}};}
  };
}
test('agent recovers parser and schema failures, preserving full refinement context',async()=>{
  const original=mathSpec();
  const provider=scriptedProvider([
    new SimulationOutputError('Malformed JSON', '{"broken"'),
    {domain:'math', title:'Missing bounds',params:[],functions:[]},
    mathSpec('x^2')
  ]);
  const result=await AgenticOrchestrator.execute(provider,{noteContent:'Original note',selectedText:'x squared',instructions:'Keep the axis labels',currentSpec:original,domainHint:'math'},{});
  assert.equal(result.agentTrace.attempts,3);
  for(const request of provider.calls) {
    assert.equal(request.noteContent,'Original note'); assert.equal(request.selectedText,'x squared');
    assert.match(request.instructions,/Keep the axis labels/);
    assert.match(request.instructions,/Current specification/);
  }
  assert.match(provider.calls[2].instructions,/Malformed JSON/);
  assert.match(provider.calls[2].instructions,/Missing bounds/);
  assert.equal(result.modelUsed,'actual-model');
  assert.equal(result.tokensUsed,20);
  assert.deepEqual(result.agentTrace.assumptions,['SI units']);
  assert.equal(result.agentTrace.steps.some(s=>s.status==='running'),false);
});
test('agent permits a better representation after model feedback',async()=>{
  const diagram={domain:'diagram',title:'Same relationship explained',params:[],shapes:[],hotspots:[{id:'a',label:'A',title:'Relationship',description:'Explanation',x:50,y:50}]};
  const provider=scriptedProvider([mathSpec('unknown(x)'),diagram]);
  const response=await AgenticOrchestrator.execute(provider,{noteContent:'Explain the relationship',domainHint:'math'},{});
  assert.equal(response.spec.domain,'diagram'); assert.equal(provider.calls.length,2);
});
test('warnings do not cause retries or rewrite singular functions',async()=>{
  const spec=mathSpec('1/x'), before=JSON.stringify(spec);
  const provider=scriptedProvider([spec]);
  const response=await AgenticOrchestrator.execute(provider,{noteContent:'Explain the singularity'},{});
  assert.equal(provider.calls.length,1);
  assert.equal(JSON.stringify(spec),before);
  assert.equal(response.spec.functions[0].expression,'1/x');
  assert.ok(response.agentTrace.limitations.length);
});
test('review respects negative parameters and does not clamp physical values',()=>{
  const spec=mathSpec('a*x'); spec.params=[{id:'a',label:'Slope',min:-10,max:10,default:-3,step:1}];
  assert.equal(reviewSimulation(spec).isValid,true);
  const physics={domain:'physics',title:'Small mass',params:[],gravity:{x:0,y:0},bodies:[{id:'a',type:'circle',pos:{x:1,y:1},mass:0.01,dimensions:{radius:5},color:'red'}],constraints:[{id:'spring',type:'spring',bodyA:'a',stiffness:1000}],showVectors:{}};
  const before=JSON.stringify(physics); const report=reviewSimulation(physics);
  assert.equal(report.isValid,true); assert.ok(report.warnings.length); assert.equal(JSON.stringify(physics),before);
});
test('unchanged failed drafts stop early and failure carries the audit',async()=>{
  const spec=mathSpec('missing(x)'); const provider=scriptedProvider([spec,spec,spec]);
  await assert.rejects(()=>AgenticOrchestrator.execute(provider,{noteContent:'x',maxAttempts:6},{}),error=>error.attempts===2 && /unchanged/.test(error.message) && error.steps.at(-1).status==='error');
  assert.equal(provider.calls.length,2);
});
test('request budget is honored and transport errors are not scientific retries',async()=>{
  const provider=scriptedProvider([mathSpec('missing(x)'),mathSpec()]);
  await assert.rejects(()=>AgenticOrchestrator.execute(provider,{noteContent:'x',maxAttempts:1},{})); assert.equal(provider.calls.length,1);
  const network=scriptedProvider([new Error('Unauthorized')]);
  await assert.rejects(()=>AgenticOrchestrator.execute(network,{noteContent:'x'},{}),/Unauthorized/); assert.equal(network.calls.length,1);
  const cancelled=scriptedProvider([mathSpec()]); const controller=new AbortController(); controller.abort();
  await assert.rejects(()=>AgenticOrchestrator.execute(cancelled,{noteContent:'x',signal:controller.signal},{}),{name:'AbortError'}); assert.equal(cancelled.calls.length,0);
});
test('parser never invents a replacement model and preserves public design metadata',()=>{
  assert.throws(()=>parse('{"domain":"math","title":"Missing model","params":[]}'),SimulationOutputError);
  const response=parse(JSON.stringify({spec:mathSpec(),proposal:{summary:'Linear plot',assumptions:['Dimensionless'],limitations:['Illustration']},explanation:'Explore slope'}));
  assert.deepEqual(response.proposal,{summary:'Linear plot',assumptions:['Dimensionless'],limitations:['Illustration']});
});
test('offline examples remain compatible with the read-only reviewer',async()=>{
  const provider=new MockOfflineProvider();
  for(const domain of ['math','circuit','physics','chemistry','algorithm','logic','orbit','3d','diagram']) {
    const {spec}=await provider.generateSimulation({noteContent:'Example',domainHint:domain});
    const report=reviewSimulation(spec); assert.equal(report.isValid,true,`${domain}: ${report.errors}`);
  }
});
test('all seven provider adapters preserve design metadata and cancellation signals',async()=>{
  const originalFetch=global.fetch, originalWindow=global.window;
  global.window={location:{origin:'http://localhost'}};
  const signal=new AbortController().signal;
  const envelope=JSON.stringify({spec:mathSpec(),explanation:'A line',proposal:{summary:'Plot the relationship',assumptions:['Test assumption'],limitations:['Test limitation']}});
  const payload={choices:[{message:{content:envelope}}],candidates:[{content:{parts:[{text:envelope}]}}],content:[{text:envelope}],response:envelope,usage:{total_tokens:15}};
  const calls=[];
  global.fetch=async(url,options)=>{calls.push(options);return {ok:true,json:async()=>payload};};
  try {
    for(const [file,name] of [['openai','OpenAIProvider'],['anthropic','AnthropicProvider'],['gemini','GeminiProvider'],['groq','GroqProvider'],['openrouter','OpenRouterProvider'],['ollama','OllamaProvider'],['custom-openai','CustomOpenAIProvider']]) {
      const Provider=require(`../src/services/ai/${file}-provider.ts`)[name];
      const result=await new Provider().generateSimulation({noteContent:'Test note',signal},{apiKey:'test-placeholder',model:'test-model',baseURL:'https://example.invalid'});
      assert.equal(result.proposal.summary,'Plot the relationship',file);
      assert.equal(calls.at(-1).signal,signal,file);
    }
  } finally {global.fetch=originalFetch;global.window=originalWindow;}
});
test('service never replaces a failed refinement or invalid model with an offline example',async()=>{
  const originalStorage=global.localStorage, originalWarn=console.warn;
  const memory=new Map();
  global.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
  console.warn=()=>{};
  try {
    const {aiService}=require('../src/services/ai/ai-service.ts');
    aiService.updateSettings({activeProvider:'openai',agenticVerification:true,fallbackToOfflineOnFailure:true});
    let offlineCalls=0;
    aiService.registerProvider({id:'mock',name:'Example',generateSimulation:async()=>{offlineCalls++; return {spec:mathSpec(),explanation:'Example'};}});
    aiService.registerProvider(scriptedProvider([new Error('Network unavailable')]));
    await assert.rejects(()=>aiService.generateVisualSimulation({noteContent:'x',currentSpec:mathSpec(),instructions:'Change slope'}),/Network unavailable/);
    aiService.registerProvider(scriptedProvider([mathSpec('missing(x)'),mathSpec('missing(x)')]));
    await assert.rejects(()=>aiService.generateVisualSimulation({noteContent:'x'}),/failed validation/);
    assert.equal(offlineCalls,0);
    aiService.updateSettings({agenticVerification:false});
    const provider=scriptedProvider([mathSpec('2*x')]); aiService.registerProvider(provider);
    await aiService.generateVisualSimulation({noteContent:'x',currentSpec:mathSpec(),instructions:'Double slope'});
    assert.match(provider.calls[0].instructions,/Current specification/);
    assert.match(provider.calls[0].instructions,/Double slope/);
  } finally {global.localStorage=originalStorage;console.warn=originalWarn;}
});
test('compiled expressions match one-shot evaluation and fail early on syntax', () => {
  const { compileExpression } = require('../src/lib/expression.ts');
  const fn = compileExpression('a*sin(x)^2 - -x/2 + pi');
  for (const x of [-3, 0, 0.5, 2]) assert.equal(fn({ a: 2, x }), evaluateExpression('a*sin(x)^2 - -x/2 + pi', { a: 2, x }));
  assert.equal(compileExpression('x')({ x: 1 }), 1);
  assert.equal(compileExpression('e')({ e: 7 }), 7);
  assert.equal(compileExpression('e')(), Math.E);
  for (const bad of ['1 +', 'foo(1)', 'x.y', '(1']) assert.throws(() => compileExpression(bad), bad);
  assert.throws(() => compileExpression('y')({ x: 1 }), /Unknown variable/);
});
test('function arity is checked at compile time', () => {
  const { compileExpression } = require('../src/lib/expression.ts');
  for (const bad of ['atan2(1)', 'pow(2)', 'sin(1,2)', 'min()']) assert.throws(() => compileExpression(bad), bad);
  assert.equal(compileExpression('max(1,5,3)')(), 5);
});
test('vault rejects notes with bad timestamps or simulations', () => {
  const base = { ...DEFAULT_NOTES[0] };
  assert.throws(() => parseVault(JSON.stringify([{ ...base, createdAt: 'x' }])), /createdAt/);
  assert.throws(() => parseVault(JSON.stringify([{ ...base, attachedSimulation: { domain: 'nope' } }])), /simulation/);
  assert.equal(parseVault(JSON.stringify(DEFAULT_NOTES)).length, DEFAULT_NOTES.length);
});
test('markdown notes round-trip with metadata and simulation', () => {
  const { noteToMarkdown, markdownToNote, markdownFileName } = require('../src/lib/markdown-note.ts');
  const note = DEFAULT_NOTES.find(n => n.attachedSimulation);
  const back = markdownToNote(noteToMarkdown(note));
  for (const k of ['title', 'folder', 'content']) assert.equal(back[k], note[k]);
  assert.deepEqual(back.tags, note.tags);
  assert.deepEqual(back.attachedSimulation, note.attachedSimulation);
  assert.notEqual(back.id, note.id);
  const plain = markdownToNote('# Heading Title\n\nbody', 'file.md');
  assert.equal(plain.title, 'Heading Title'); assert.equal(plain.folder, 'Imported');
  assert.equal(markdownToNote('no heading', 'lab.md').title, 'lab');
  assert.throws(() => markdownToNote('---\nsimulation: {"domain":"bad"}\n---\nx'));
  assert.equal(markdownFileName({ title: 'a/b: c?' }), 'a b c.md');
});
test('demo notes: quoted numbers match their models', () => {
  const { DEMO_NOTES } = require('../src/data/demo-notes.ts');
  const { compileExpression } = require('../src/lib/expression.ts');
  const { reviewSimulation } = require('../src/services/ai/agent/review-simulation.ts');
  const byId = id => DEMO_NOTES.find(n => n.id === id);
  for (const n of DEMO_NOTES) if (n.attachedSimulation) assert.ok(reviewSimulation(n.attachedSimulation).isValid, n.title);
  // Projectile: y(R)=0 at R=v²sin2θ/g, peak H, complementary angles share the range.
  const path = compileExpression(byId('demo-1-projectile').attachedSimulation.functions[0].expression);
  const R = (v, d, g) => v * v * Math.sin(2 * d * Math.PI / 180) / g;
  assert.ok(Math.abs(R(20, 45, 9.81) - 40.8) < 0.05);
  assert.ok(Math.abs(path({ v: 20, d: 45, g: 9.81, x: R(20, 45, 9.81) })) < 1e-9);
  assert.ok(Math.abs(path({ v: 20, d: 45, g: 9.81, x: R(20, 45, 9.81) / 2 }) - 10.2) < 0.05);
  assert.ok(Math.abs(R(20, 30, 9.81) - R(20, 60, 9.81)) < 1e-9);
  // Ohm: live solver agrees with the text.
  const m = solveSeriesCircuit(byId('demo-2-ohm').attachedSimulation, {}, {});
  assert.ok(m.supported, m.reason);
  assert.ok(Math.abs(m.current * 1000 - 16.4) < 0.05); assert.ok(Math.abs(m.power - 0.147) < 0.001);
  // Binary search: replay the algorithm and compare with every step.
  const bs = byId('demo-3-binary-search').attachedSimulation, arr = bs.initialData, mids = [];
  for (let lo = 0, hi = arr.length - 1; lo <= hi;) { const mid = (lo + hi) >> 1; mids.push(mid); if (arr[mid] === 56) break; if (arr[mid] < 56) lo = mid + 1; else hi = mid - 1; }
  assert.deepEqual(mids, [5, 8, 6, 7]);
  assert.deepEqual(bs.steps.slice(1, 4).map(s => s.comparingIndices[0]), mids.slice(0, 3));
  assert.deepEqual(bs.steps[4].sortedIndices, [7]);
  // Kepler: periods follow T² ∝ a³ within 1%.
  const [first, ...rest] = byId('demo-4-kepler').attachedSimulation.bodies;
  for (const b of rest) assert.ok(Math.abs(b.orbitalPeriod / (first.orbitalPeriod * (b.semiMajorAxis / first.semiMajorAxis) ** 1.5) - 1) < 0.01, b.name);
});
test('example notes: all specs pass the reviewer and the quicksort trace is a real Hoare partition', () => {
  const { reviewSimulation } = require('../src/services/ai/agent/review-simulation.ts');
  for (const n of DEFAULT_NOTES) {
    assert.equal(n.attachedTrace, undefined, `${n.title} must not ship a fabricated trace`);
    if (n.attachedSimulation) { const r = reviewSimulation(n.attachedSimulation); assert.ok(r.isValid, `${n.title}: ${r.errors.join('; ')}`); }
  }
  const steps = DEFAULT_NOTES.find(n => n.id === 'note-algo-1').attachedSimulation.steps;
  const a = [...steps[0].array], swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
  let i = 1, j = a.length - 1; const p = a[0], snapshots = [];
  while (true) { while (i <= j && a[i] <= p) i++; while (a[j] > p) j--; if (i >= j) break; swap(i, j); snapshots.push([...a]); }
  swap(0, j); snapshots.push([...a]);
  assert.deepEqual(snapshots, [steps[3].array, steps[4].array, steps[5].array]);
  assert.deepEqual(steps.at(-1).array, [...steps[0].array].sort((x, y) => x - y));
  // Full adder truth table matches binary addition.
  for (const row of DEFAULT_NOTES.find(n => n.id === 'note-logic-1').attachedSimulation.truthTable) {
    const total = row.inputs['Input A'] + row.inputs['Input B'] + row.inputs['Carry In (Cin)'];
    assert.deepEqual([row.outputs['Sum (S)'], row.outputs['Carry Out (Cout)']], [total % 2, total >> 1]);
  }
});
test('logic truth tables are derived from wiring and wrong tables are caught', () => {
  const { deriveTruthTable, truthTableMismatches } = require('../src/lib/logic.ts');
  const { reviewSimulation } = require('../src/services/ai/agent/review-simulation.ts');
  const adder = DEFAULT_NOTES.find(n => n.id === 'note-logic-1').attachedSimulation;
  const rows = deriveTruthTable(adder);
  assert.equal(rows.length, 8);
  for (const r of rows) { const t = r.inputs[0] + r.inputs[1] + r.inputs[2]; assert.deepEqual(r.outputs, [t % 2, t >> 1]); }
  assert.deepEqual(truthTableMismatches(adder), []);
  const wrong = structuredClone(adder); wrong.truthTable[3].outputs['Sum (S)'] = 1;
  assert.equal(truthTableMismatches(wrong).length, 1);
  assert.equal(reviewSimulation(wrong).isValid, false);
  // Gate inputs follow inputIndex, not wire order: A AND NOT B.
  const notB = { domain: 'logic', title: 't', params: [], inputs: [{ id: 'a', label: 'A', pos: { x: 0, y: 0 }, initialValue: 0 }, { id: 'b', label: 'B', pos: { x: 0, y: 0 }, initialValue: 0 }],
    gates: [{ id: 'n', type: 'NOT', pos: { x: 0, y: 0 } }, { id: 'g', type: 'AND', pos: { x: 0, y: 0 } }], outputs: [{ id: 'o', label: 'O', pos: { x: 0, y: 0 }, fromGateId: 'g' }],
    wires: [{ id: 'w1', fromId: 'n', toId: 'g', inputIndex: 1 }, { id: 'w2', fromId: 'b', toId: 'n', inputIndex: 0 }, { id: 'w3', fromId: 'a', toId: 'g', inputIndex: 0 }] };
  assert.deepEqual(deriveTruthTable(notB).map(r => r.outputs[0]), [0, 0, 1, 0]);
});
test('circuit switch state must be boolean', () => {
  const spec = structuredClone(DEFAULT_NOTES.find(n => n.id === 'demo-2-ohm').attachedSimulation);
  spec.components[1].state = 'closed';
  assert.throws(() => assertSimulation(spec), /switch state/);
  spec.components[1].state = false;
  assert.equal(solveSeriesCircuit(spec, {}, {}).current, 0);
});
test('layout: trees, circuit wires and frames stay consistent', () => {
  const { layoutTree, fitViewBox, circuitWirePaths, circuitBounds, pinGeometry } = require('../src/lib/layout.ts');
  // Balanced tree from links only; children sit below and on the correct side of their parent; no shared positions.
  const nodes = [{ id: 'r', value: 34, left: 'a', right: 'b', x: 999, y: -500 }, { id: 'a', value: 15, left: 'c' }, { id: 'b', value: 63, right: 'd' }, { id: 'c', value: 3 }, { id: 'd', value: 88 }];
  const pos = layoutTree(nodes);
  assert.ok(pos.a.x < pos.r.x && pos.b.x > pos.r.x && pos.a.y > pos.r.y && pos.c.y > pos.a.y);
  assert.equal(new Set(Object.values(pos).map(p => `${p.x},${p.y}`)).size, nodes.length);
  assert.deepEqual(Object.keys(layoutTree([{ id: 'x', value: 1, left: 'x' }])), ['x']); // cycles terminate
  // Frame contains everything.
  const box = fitViewBox(Object.values(pos).map(p => ({ ...p, r: 20 })), 8);
  for (const p of Object.values(pos)) assert.ok(p.x - 20 >= box.x && p.x + 20 <= box.x + box.width && p.y - 20 >= box.y && p.y + 20 <= box.y + box.height);
  // Every wire starts and ends exactly on a pin, uses only right angles, and lies inside the frame.
  for (const n of DEFAULT_NOTES.filter(n => n.attachedSimulation?.domain === 'circuit')) {
    const spec = n.attachedSimulation, b = circuitBounds(spec), byId = new Map(spec.components.map(c => [c.id, c]));
    for (const [w, path] of spec.wires.map((w, i) => [w, circuitWirePaths(spec)[i]])) {
      assert.deepEqual(path.points[0], pinGeometry(byId.get(w.from.compId), w.from.pin).at, n.title);
      assert.deepEqual(path.points.at(-1), pinGeometry(byId.get(w.to.compId), w.to.pin).at, n.title);
      path.points.forEach((p, i) => {
        assert.ok(p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height, `${n.title} ${w.id} out of frame`);
        if (i) assert.ok(p.x === path.points[i - 1].x || p.y === path.points[i - 1].y, `${n.title} ${w.id} diagonal`);
      });
    }
  }
  // Rotation moves pins: a resistor at 90° has its pins above and below.
  const r = { id: 'r', type: 'resistor', value: 1, unit: '', label: '', pos: { x: 0, y: 0 }, rotation: 90 };
  assert.deepEqual([pinGeometry(r, 0).at, pinGeometry(r, 1).at], [{ x: 0, y: -35 }, { x: 0, y: 35 }]);
});
test('circuit wires ignore model bends that would draw diagonals', () => {
  const { circuitWirePaths } = require('../src/lib/layout.ts');
  const spec = structuredClone(DEFAULT_NOTES.find(n => n.id === 'demo-2-ohm').attachedSimulation);
  spec.wires[0].points = [{ x: 90, y: 70 }]; // does not line up with either pin
  spec.wires[1].points = [{ x: 220, y: 90 }]; // on the straight line between pins: kept
  const [w0, w1] = circuitWirePaths(spec);
  w0.points.forEach((p, i) => i && assert.ok(p.x === w0.points[i - 1].x || p.y === w0.points[i - 1].y));
  assert.ok(!w0.points.some(p => p.x === 90 && p.y === 70));
  assert.ok(w1.points.some(p => p.x === 220 && p.y === 90));
});
test('rejected domains are named with the allowed list, and the prompt routes gate circuits to logic', () => {
  const { SYSTEM_PROMPT } = require('../src/services/ai/prompt-templates.ts');
  assert.throws(() => assertSimulation({ domain: 'logic_gates', title: 't', params: [] }), /"logic_gates".*math, circuit, physics, chemistry, algorithm, logic, orbit, 3d, diagram/);
  assert.match(SYSTEM_PROMPT, /Set "domain" to exactly one of these names/);
  assert.match(SYSTEM_PROMPT, /use\s+logic \(not diagram\) for any gate circuit/);
});
