import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import React, { useState, useEffect, useRef } from 'react';
import { AlgorithmSpec } from '../../../types';
import { Play, Pause, SkipForward, RotateCcw, Activity } from 'lucide-react';

interface AlgorithmVisualizerProps {
  spec: AlgorithmSpec;
  paramValues?: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const AlgorithmVisualizer: React.FC<AlgorithmVisualizerProps> = ({ spec }) => {
  const { theme } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(400);
  const timerRef = useRef<any>(null);

  const steps = spec.steps || [];
  const currentStep = steps[currentStepIndex] || {
    stepIndex: 0,
    description: spec.description || 'Initial State',
    array: spec.initialData || [25, 60, 45, 80, 15, 90, 30, 70]
  };

  const array = currentStep.array || spec.initialData || [];
  const comparing = new Set(currentStep.comparingIndices || []);
  const swapping = new Set(currentStep.swappingIndices || []);
  const sorted = new Set(currentStep.sortedIndices || []);

  // Step auto-playback
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speedMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMs, steps.length]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const maxVal = Math.max(...array, 100);

  return (
    <div className="w-full flex flex-col items-center bg-zinc-950 rounded-xl border border-zinc-800 p-4 select-none">
      {/* Algorithm Header & Step Status */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono font-semibold uppercase">
            {spec.algorithmType.toUpperCase()}
          </span>
          <span className="font-semibold text-zinc-100">{spec.algorithmName || spec.title}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
          <span>
            Step: <strong className="text-purple-300">{currentStepIndex + 1}</strong> / {steps.length}
          </span>
        </div>
      </div>

      {/* Main Algorithm Visualization Display */}
      {spec.algorithmType === 'sorting' || !spec.algorithmType ? (
        <div className="w-full h-64 flex items-end justify-center gap-2 px-4 pt-6 pb-2">
          {array.map((val, idx) => {
            const heightPercent = Math.max(12, Math.round((val / maxVal) * 100));

            let barColor = 'bg-purple-600/80 border-purple-500';
            let textColor = 'text-purple-200';

            if (swapping.has(idx)) {
              barColor = 'bg-rose-600 border-rose-400 animate-pulse';
              textColor = 'text-rose-200';
            } else if (comparing.has(idx)) {
              barColor = 'bg-amber-500 border-amber-300';
              textColor = 'text-amber-200';
            } else if (sorted.has(idx)) {
              barColor = 'bg-emerald-500 border-emerald-300';
              textColor = 'text-emerald-200';
            }

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end max-w-[42px]">
                <span className={`text-[10px] font-mono mb-1 font-semibold ${textColor}`}>{val}</span>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md border-t border-x transition-all duration-200 flex items-center justify-center shadow-lg ${barColor}`}
                >
                  <span className="text-[9px] font-mono text-zinc-950/70 font-bold hidden sm:inline">
                    [{idx}]
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : spec.algorithmType === 'tree' ? (
        /* Binary Tree Display */
        <div className="w-full h-64 relative flex items-center justify-center p-4">
          <svg className="w-full h-full" viewBox="0 0 500 220">
            {spec.treeNodes?.map((node) => {
              const nx = node.x ?? 250;
              const ny = node.y ?? 50;
              const isVisited = currentStep.visitedNodeIds?.includes(node.id);
              const isActive = currentStep.activeNodeId === node.id;

              return (
                <g key={node.id}>
                  {node.left && (
                    <line x1={nx} y1={ny} x2={nx - 60} y2={ny + 50} stroke={themedColor('#4b5563')} strokeWidth="2" />
                  )}
                  {node.right && (
                    <line x1={nx} y1={ny} x2={nx + 60} y2={ny + 50} stroke={themedColor('#4b5563')} strokeWidth="2" />
                  )}
                  <circle
                    cx={nx}
                    cy={ny}
                    r="18"
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'fill-rose-600 stroke-rose-300'
                        : isVisited
                        ? 'fill-emerald-600 stroke-emerald-300'
                        : 'fill-purple-900 stroke-purple-500'
                    }`}
                    strokeWidth="2"
                  />
                  <text
                    x={nx}
                    y={ny + 4}
                    textAnchor="middle"
                    fill={themedColor('#ffffff')}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        /* Graph Display */
        <div className="w-full h-64 relative flex items-center justify-center p-4">
          <svg className="w-full h-full" viewBox="0 0 500 220">
            {spec.graphEdges?.map((edge, eIdx) => {
              const fromN = spec.graphNodes?.find((n) => n.id === edge.from);
              const toN = spec.graphNodes?.find((n) => n.id === edge.to);
              if (!fromN || !toN) return null;
              return (
                <g key={eIdx}>
                  <line x1={fromN.x} y1={fromN.y} x2={toN.x} y2={toN.y} stroke={themedColor('#374151')} strokeWidth="2" />
                  {edge.weight !== undefined && (
                    <text
                      x={(fromN.x + toN.x) / 2}
                      y={(fromN.y + toN.y) / 2 - 4}
                      fill={themedColor('#9ca3af')}
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {edge.weight}
                    </text>
                  )}
                </g>
              );
            })}
            {spec.graphNodes?.map((node) => {
              const isActive = currentStep.activeNodeId === node.id;
              const isVisited = currentStep.visitedNodeIds?.includes(node.id);
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="16"
                    className={`transition-colors duration-200 ${
                      isActive ? 'fill-rose-600 stroke-rose-400' : isVisited ? 'fill-emerald-600 stroke-emerald-400' : 'fill-zinc-800 stroke-zinc-600'
                    }`}
                    strokeWidth="2"
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill={themedColor('#f3f4f6')}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Step Description Banner */}
      <div className="w-full py-2 px-3 my-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
        <span className="font-mono text-purple-300 text-[11px] leading-relaxed truncate">
          {currentStep.description || 'Step in progress...'}
        </span>
      </div>

      {/* Playback Controls & Speed */}
      <div className="w-full flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800"
            title="Step Forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
            title="Reset to Beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-400" /> Comparing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-rose-500" /> Swapping
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-400" /> Sorted
          </span>
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 font-mono">Speed:</span>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={speedMs}
            onChange={(e) => setSpeedMs(parseInt(e.target.value))}
            className="w-16 accent-purple-500 h-1 bg-zinc-800 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
