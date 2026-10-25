import React, { useState, useEffect } from 'react';
import { SimulationSpec, DomainType, AgenticTrace } from '../../types';
import { assertSimulation } from '../../lib/simulation-schema';
import { lazyWithRetry } from './lazy';

const MathVisualizer = lazyWithRetry(() => import('./math/MathVisualizer').then(m => ({ default: m.MathVisualizer })));
const CircuitVisualizer = lazyWithRetry(() => import('./circuits/CircuitVisualizer').then(m => ({ default: m.CircuitVisualizer })));
const PhysicsVisualizer = lazyWithRetry(() => import('./physics/PhysicsVisualizer').then(m => ({ default: m.PhysicsVisualizer })));
const ChemVisualizer = lazyWithRetry(() => import('./chemistry/ChemVisualizer').then(m => ({ default: m.ChemVisualizer })));
const AlgorithmVisualizer = lazyWithRetry(() => import('./algorithms/AlgorithmVisualizer').then(m => ({ default: m.AlgorithmVisualizer })));
const LogicVisualizer = lazyWithRetry(() => import('./logic/LogicVisualizer').then(m => ({ default: m.LogicVisualizer })));
const OrbitVisualizer = lazyWithRetry(() => import('./astronomy/OrbitVisualizer').then(m => ({ default: m.OrbitVisualizer })));
const GenerativeCanvasVisualizer = lazyWithRetry(() => import('./generative/GenerativeCanvasVisualizer').then(m => ({ default: m.GenerativeCanvasVisualizer })));
const ThreeDVisualizer = lazyWithRetry(() => import('./threed/ThreeDVisualizer').then(m => ({ default: m.ThreeDVisualizer })));
const AnnotatedDiagramVisualizer = lazyWithRetry(() => import('./diagrams/AnnotatedDiagramVisualizer').then(m => ({ default: m.AnnotatedDiagramVisualizer })));
import {
  Sliders,
  Code,
  Sparkles,
  Download,
  X,
  Atom,
  Zap,
  Activity,
  Calculator,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  ArrowRight,
  Layers,
  Compass,
  Box,
  MapPin
} from 'lucide-react';

interface VisualWorkbenchProps {
  spec: SimulationSpec | null;
  agentTrace?: AgenticTrace | null;
  onClose?: () => void;
  onRefineWithAI?: (instructions: string) => void;
  onEmbedInNote?: (spec: SimulationSpec) => void;
  isGenerating?: boolean;
}

export const VisualWorkbench: React.FC<VisualWorkbenchProps> = ({
  spec,
  agentTrace,
  onClose,
  onRefineWithAI,
  onEmbedInNote,
  isGenerating = false
}) => {
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'params' | 'agent'>('visual');
  const [refinePrompt, setRefinePrompt] = useState<string>('');

  // Sync parameter values from spec
  useEffect(() => {
    if (!spec) return;
    const initial: Record<string, number> = {};
    spec.params?.forEach((p) => {
      initial[p.id] = p.default;
    });
    setParamValues(initial);
  }, [spec]);

  const handleParamChange = (id: string, val: number) => {
    setParamValues((prev) => ({
      ...prev,
      [id]: val
    }));
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinePrompt.trim() || !onRefineWithAI) return;
    onRefineWithAI(refinePrompt);
    setRefinePrompt('');
  };

  if (!spec) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-obsidian-surface/40 border-l border-obsidian-border text-obsidian-textMuted select-none">
        <div className="w-16 h-16 rounded-2xl bg-obsidian-border/50 flex items-center justify-center mb-4 text-purple-400">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200 mb-1">Visual Simulation Workbench</h3>
        <p className="text-xs text-zinc-400 max-w-xs mb-6">
          Highlight any equation, concept, or circuit description in your note, or click <strong className="text-purple-400">"Visualize Note"</strong> to synthesize an interactive educational visualization.
        </p>
        <div className="flex flex-wrap gap-2 justify-center max-w-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Calculator className="w-3.5 h-3.5 text-purple-400" /> Calculus & Curves
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Circuit Electron Flow
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" /> Physics Mechanics Rig
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Atom className="w-3.5 h-3.5 text-pink-400" /> Chem Mechanism
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Algorithms & Trees
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-amber-500" /> Logic Gates & Flow
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Compass className="w-3.5 h-3.5 text-sky-400" /> Planetary Orbits
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <Box className="w-3.5 h-3.5 text-cyan-400" /> 3D Graphs & Surfaces
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300">
            <MapPin className="w-3.5 h-3.5 text-rose-400" /> Annotated Diagrams & Tours
          </span>
        </div>
      </div>
    );
  }

  const getDomainIcon = (domain: DomainType) => {
    switch (domain) {
      case 'math': return <Calculator className="w-4 h-4 text-purple-400" />;
      case 'circuit': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'physics': return <Activity className="w-4 h-4 text-blue-400" />;
      case 'chemistry': return <Atom className="w-4 h-4 text-pink-400" />;
      case 'algorithm': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'logic': return <Cpu className="w-4 h-4 text-amber-500" />;
      case 'orbit': return <Compass className="w-4 h-4 text-sky-400" />;
      case 'generative': return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case '3d': return <Box className="w-4 h-4 text-cyan-400" />;
      case 'diagram': return <MapPin className="w-4 h-4 text-rose-400" />;
      default: return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const downloadJSON = () => {
    const payload = {
      spec,
      agentTrace: agentTrace || undefined
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.title.replace(/\s+/g, '_').toLowerCase()}_spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checksPassedCount = agentTrace?.validationReport?.checks?.filter((c) => c.passed).length || 0;
  const totalChecksCount = agentTrace?.validationReport?.checks?.length || 0;
  const fixesCount = agentTrace?.correctionsMade?.length || 0;

  return (
    <div className="h-full flex flex-col bg-obsidian-surface border-l border-obsidian-border overflow-hidden">
      {/* Workbench Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-obsidian-sidebar border-b border-obsidian-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded bg-zinc-800 border border-zinc-700">
            {getDomainIcon(spec.domain)}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-zinc-200 truncate">{spec.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">
                {spec.domain} Engine
              </span>
              {agentTrace?.validationReport?.isValid && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                  Checks passed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              activeTab === 'visual' ? 'bg-purple-900/60 text-purple-200 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTab === 'params' ? 'bg-purple-900/60 text-purple-200 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Parameters ({spec.params?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTab === 'agent' ? 'bg-purple-900/60 text-purple-200 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Inspect Agent Reasoning, Validation & Auto-Repairs"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Agent Audit {fixesCount > 0 ? `(${fixesCount} fixes)` : ''}</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTab === 'code' ? 'bg-purple-900/60 text-purple-200 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>DSL JSON</span>
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 ml-2">
          {onEmbedInNote && (
            <button
              onClick={() => onEmbedInNote(spec)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow transition-colors"
              title="Embed this interactive visualizer directly into the note"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Embed in Note</span>
            </button>
          )}
          <button
            onClick={downloadJSON}
            className="p-1.5 rounded hover:bg-obsidian-hover text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Download JSON Spec & Trace"
          >
            <Download className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-obsidian-hover text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Close Workbench"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {activeTab === 'visual' && (
          <div className="flex-1 flex flex-col min-h-[360px]">
            <SpecGuard spec={spec} />
            {spec.domain === 'math' && (
              <MathVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'circuit' && (
              <CircuitVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'physics' && (
              <PhysicsVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'chemistry' && (
              <ChemVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'algorithm' && (
              <AlgorithmVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'logic' && (
              <LogicVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'orbit' && (
              <OrbitVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'generative' && (
              <GenerativeCanvasVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === '3d' && (
              <ThreeDVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
            {spec.domain === 'diagram' && (
              <AnnotatedDiagramVisualizer spec={spec} paramValues={paramValues} onParamChange={handleParamChange} />
            )}
          </div>
        )}

        {/* Agent Audit Log Tab */}
        {activeTab === 'agent' && (
          <div className="flex-1 flex flex-col gap-3 font-sans text-xs">
            {/* Summary card */}
            <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Design Decisions & Review
                </h4>
                <p className="text-zinc-400 mt-1 text-[11px] leading-relaxed">
                  {agentTrace?.plan || 'No agent run is attached to this visualization.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="px-2 py-1 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
                  Attempts: {agentTrace?.attempts || 1}
                </span>
                <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-semibold">
                  {checksPassedCount}/{totalChecksCount} Checks
                </span>
              </div>
            </div>

            {(agentTrace?.assumptions?.length || agentTrace?.limitations?.length) ? (
              <div className="p-3 rounded border border-amber-800 text-xs text-amber-100 space-y-2">
                {agentTrace.assumptions?.map((text, i) => <p key={`a-${i}`}>Assumption: {text}</p>)}
                {agentTrace.limitations?.map((text, i) => <p key={`l-${i}`}>Limitation: {text}</p>)}
              </div>
            ) : null}

            {/* Auto-Repairs applied */}
            {agentTrace && agentTrace.correctionsMade && agentTrace.correctionsMade.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Revision Feedback Addressed ({agentTrace.correctionsMade.length}):
                </span>
                <ul className="flex flex-col gap-1 text-[11px] text-amber-200/90">
                  {agentTrace.correctionsMade.map((fix, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <ArrowRight className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Linters & Validation Checks */}
            {agentTrace?.validationReport?.checks && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
                  Automated Model Checks
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {agentTrace.validationReport.checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {chk.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="font-medium text-zinc-200">{chk.name}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono truncate ml-2">
                        {chk.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cognitive Steps History */}
            {agentTrace?.steps && (
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[10px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
                  Generation History
                </span>
                <div className="flex flex-col gap-1">
                  {agentTrace.steps.map((step, idx) => (
                    <div key={idx} className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-300">{step.title}</span>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-zinc-400 mt-0.5 leading-relaxed">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex-1 bg-zinc-950 rounded-lg p-3 border border-obsidian-border font-mono text-xs text-zinc-300 overflow-auto">
            <pre>{JSON.stringify({ spec, agentTrace }, null, 2)}</pre>
          </div>
        )}

        {/* Parameter Sliders Deck (Visible beneath or on params tab) */}
        {(activeTab === 'params' || activeTab === 'visual') && spec.params && spec.params.length > 0 && (
          <div className="bg-obsidian-sidebar/80 rounded-lg p-3.5 border border-obsidian-border shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Interactive Sliders
              </span>
              <button
                onClick={() => {
                  const reset: Record<string, number> = {};
                  spec.params.forEach((p) => { reset[p.id] = p.default; });
                  setParamValues(reset);
                }}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {spec.params.map((param) => {
                const currentVal = paramValues[param.id] ?? param.default;
                return (
                  <div key={param.id} className="flex flex-col gap-1 bg-zinc-900/90 p-2.5 rounded border border-zinc-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-300 font-medium truncate">{param.label}</span>
                      <span className="font-mono text-purple-300 font-semibold">
                        {currentVal} {param.unit || ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step || 1}
                      value={currentVal}
                      onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{param.min}</span>
                      <span>{param.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Multi-turn Refinement input */}
        <form onSubmit={handleRefineSubmit} className="flex items-center gap-2 mt-auto shrink-0 pt-2">
          <input
            type="text"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="Agentic Refine (e.g. 'Make spring stiffer', 'Add capacitor', 'Increase frequency')..."
            disabled={isGenerating}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-obsidian-border text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isGenerating || !refinePrompt.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:text-zinc-500 text-white text-xs font-medium transition-colors shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Refine</span>
          </button>
        </form>
      </div>
    </div>
  );
};

/** Throws inside the surrounding error boundary when a stored spec is invalid, so the reason is shown instead of a crash deeper down. */
function SpecGuard({ spec }: { spec: unknown }) {
  assertSimulation(spec);
  return null;
}
