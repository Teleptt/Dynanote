import { assertSimulation } from '../../lib/simulation-schema';
import React, { useState, useEffect, useMemo } from 'react';
import { SimulationSpec, DomainType } from '../../types';
const MathVisualizer = React.lazy(() => import('../visualizers/math/MathVisualizer').then(m => ({ default: m.MathVisualizer })));
const CircuitVisualizer = React.lazy(() => import('../visualizers/circuits/CircuitVisualizer').then(m => ({ default: m.CircuitVisualizer })));
const PhysicsVisualizer = React.lazy(() => import('../visualizers/physics/PhysicsVisualizer').then(m => ({ default: m.PhysicsVisualizer })));
const ChemVisualizer = React.lazy(() => import('../visualizers/chemistry/ChemVisualizer').then(m => ({ default: m.ChemVisualizer })));
const AlgorithmVisualizer = React.lazy(() => import('../visualizers/algorithms/AlgorithmVisualizer').then(m => ({ default: m.AlgorithmVisualizer })));
const LogicVisualizer = React.lazy(() => import('../visualizers/logic/LogicVisualizer').then(m => ({ default: m.LogicVisualizer })));
const OrbitVisualizer = React.lazy(() => import('../visualizers/astronomy/OrbitVisualizer').then(m => ({ default: m.OrbitVisualizer })));
const GenerativeCanvasVisualizer = React.lazy(() => import('../visualizers/generative/GenerativeCanvasVisualizer').then(m => ({ default: m.GenerativeCanvasVisualizer })));
const ThreeDVisualizer = React.lazy(() => import('../visualizers/threed/ThreeDVisualizer').then(m => ({ default: m.ThreeDVisualizer })));
const AnnotatedDiagramVisualizer = React.lazy(() => import('../visualizers/diagrams/AnnotatedDiagramVisualizer').then(m => ({ default: m.AnnotatedDiagramVisualizer })));
import {
  ExternalLink,
  Sliders,
  Code2,
  Trash2,
  Check,
  Calculator,
  Zap,
  Activity,
  Atom,
  Sparkles,
  AlertCircle,
  Layers,
  Cpu,
  Compass,
  Box,
  MapPin
} from 'lucide-react';

interface EmbeddedSimulationWidgetProps {
  content: string;
  onUpdateContent: (newContent: string) => void;
  onDelete: () => void;
  onOpenWorkbench?: (spec: SimulationSpec) => void;
}

export const EmbeddedSimulationWidget: React.FC<EmbeddedSimulationWidgetProps> = ({
  content,
  onUpdateContent,
  onDelete,
  onOpenWorkbench
}) => {
  const [isEditingJson, setIsEditingJson] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>(content);
  const [showParams, setShowParams] = useState<boolean>(true);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});

  // Parse JSON simulation specification
  const { spec, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object' || !parsed.domain) {
        return { spec: null, parseError: 'Invalid simulation specification: missing domain property' };
      }
      assertSimulation(parsed);
      return { spec: parsed as SimulationSpec, parseError: null };
    } catch (e: any) {
      return { spec: null, parseError: e.message || 'JSON parse error' };
    }
  }, [content]);

  // Synchronize parameter values when spec updates
  useEffect(() => {
    if (!spec?.params) return;
    const initial: Record<string, number> = {};
    spec.params.forEach((p) => {
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

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      assertSimulation(parsed);
      onUpdateContent(JSON.stringify(parsed, null, 2));
      setIsEditingJson(false);
    } catch (e) {
      // Keep editor open if invalid
    }
  };

  const getDomainIcon = (domain?: DomainType) => {
    switch (domain) {
      case 'math':
        return <Calculator className="w-3.5 h-3.5 text-purple-400" />;
      case 'circuit':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'physics':
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'chemistry':
        return <Atom className="w-3.5 h-3.5 text-pink-400" />;
      case 'algorithm':
        return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
      case 'logic':
        return <Cpu className="w-3.5 h-3.5 text-amber-500" />;
      case 'orbit':
        return <Compass className="w-3.5 h-3.5 text-sky-400" />;
      case 'generative':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case '3d':
        return <Box className="w-3.5 h-3.5 text-cyan-400" />;
      case 'diagram':
        return <MapPin className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  if (parseError || !spec) {
    return (
      <div className="my-3 p-4 rounded-xl bg-zinc-950/90 border border-red-900/60 shadow-lg text-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-red-900/40 text-red-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>Embedded Simulation Error</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditingJson(!isEditingJson)}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px]"
            >
              {isEditingJson ? 'Close Editor' : 'Edit JSON'}
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-950 text-red-400 hover:text-red-300"
              title="Delete Embed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-zinc-400 font-mono text-[11px] mb-2">{parseError}</p>

        {isEditingJson ? (
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 font-mono text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSaveJson}
              className="self-end px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Save JSON
            </button>
          </div>
        ) : (
          <pre className="p-2 rounded bg-zinc-900/60 text-[10px] font-mono text-zinc-500 overflow-x-auto max-h-32">
            {content}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="my-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 hover:border-purple-500/50 shadow-xl overflow-hidden transition-all group/embed">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/70 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-zinc-800 border border-zinc-700">
            {getDomainIcon(spec.domain)}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-zinc-100 truncate block text-xs">
              {spec.title}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              {spec.domain} • Live Interactive Embed
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {spec.params && spec.params.length > 0 && (
            <button
              onClick={() => setShowParams(!showParams)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                showParams
                  ? 'bg-purple-950/80 text-purple-200 border border-purple-800/60'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle Interactive Parameter Sliders"
            >
              <Sliders className="w-3 h-3" />
              <span>Sliders</span>
            </button>
          )}

          {onOpenWorkbench && (
            <button
              onClick={() => onOpenWorkbench(spec)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors border border-zinc-800"
              title="Open full inspector in Workbench"
            >
              <span>Workbench</span>
              <ExternalLink className="w-3 h-3 text-purple-400" />
            </button>
          )}

          <button
            onClick={() => {
              setJsonText(content);
              setIsEditingJson(!isEditingJson);
            }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Edit Specification DSL"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-950/60 text-zinc-500 hover:text-red-400 transition-colors ml-0.5"
            title="Remove Embedded Visualization"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Body */}
      {isEditingJson ? (
        <div className="p-3 bg-zinc-950 flex flex-col gap-2">
          <textarea
            rows={10}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 font-mono text-xs text-purple-200 focus:outline-none focus:border-purple-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsEditingJson(false)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveJson}
              className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Apply Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="relative p-2 bg-zinc-950/90 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          {spec.domain === 'math' && (
            <MathVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'circuit' && (
            <CircuitVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'physics' && (
            <PhysicsVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'chemistry' && (
            <ChemVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'algorithm' && (
            <AlgorithmVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'logic' && (
            <LogicVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'orbit' && (
            <OrbitVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'generative' && (
            <GenerativeCanvasVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === '3d' && (
            <ThreeDVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
          {spec.domain === 'diagram' && (
            <AnnotatedDiagramVisualizer
              spec={spec}
              paramValues={paramValues}
              onParamChange={handleParamChange}
            />
          )}
        </div>
      )}

      {/* Interactive Parameter Sliders Drawer */}
      {showParams && !isEditingJson && spec.params && spec.params.length > 0 && (
        <div className="px-4 py-3 bg-zinc-900/70 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
          {spec.params.map((p) => {
            const current = paramValues[p.id] ?? p.default;
            return (
              <div key={p.id} className="flex items-center gap-2.5 bg-zinc-950/40 px-2.5 py-1.5 rounded border border-zinc-800/50">
                <span className="text-[11px] text-zinc-300 font-medium shrink-0">
                  {p.label}:
                </span>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={current}
                  onChange={(e) => handleParamChange(p.id, parseFloat(e.target.value))}
                  className="flex-1 accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer min-w-[60px]"
                />
                <span className="font-mono text-[10px] text-purple-300 bg-zinc-800/80 px-1.5 py-0.5 rounded min-w-[42px] text-right shrink-0">
                  {current.toFixed(p.step < 0.1 ? 2 : (Number.isInteger(p.step) ? 0 : 1))}
                  {p.unit ? ` ${p.unit}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
