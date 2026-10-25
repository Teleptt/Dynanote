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
