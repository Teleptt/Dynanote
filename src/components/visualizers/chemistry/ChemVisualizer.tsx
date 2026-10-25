import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import React, { useState } from 'react';
import { ChemReactionSpec, ChemAtom, ChemBond, CurvedArrow } from '../../../types';
import { ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';

interface ChemVisualizerProps {
  spec: ChemReactionSpec;
  paramValues: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const ChemVisualizer: React.FC<ChemVisualizerProps> = ({ spec, paramValues }) => {
  const { theme } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const steps = spec.mechanismSteps || [];
  const currentStep = steps[currentStepIndex] || steps[0];

  const getElementColor = (element: string) => {
    switch (element.toUpperCase()) {
      case 'C': return '#9ca3af'; // Carbon: Slate
      case 'O': return '#ef4444'; // Oxygen: Red
      case 'N': return '#3b82f6'; // Nitrogen: Blue
      case 'BR': return '#92400e'; // Bromine: Amber/Brown
      case 'CL': return '#22c55e'; // Chlorine: Green
      case 'H': return '#f3f4f6'; // Hydrogen: White
      default: return '#c084fc';
    }
  };


  const getAtomRadius = (element: string) => {
    switch (element.toUpperCase()) {
      case 'BR':
      case 'I': return 18;
      case 'C':
      case 'N':
      case 'O': return 15;
      case 'H': return 10;
      default: return 14;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-lg overflow-hidden border border-obsidian-border">
      {/* Chemical Reaction Equation Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-obsidian-surface border-b border-obsidian-border text-xs">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300 font-mono text-[11px] uppercase">
            {spec.reactionType || 'Mechanism'}
          </span>
          <span className="font-mono text-zinc-100 font-semibold text-sm tracking-wide">
            {spec.equation}
          </span>
        </div>
        <div className="text-zinc-400 font-mono text-xs">
          Step {currentStepIndex + 1} of {Math.max(steps.length, 1)}
        </div>
      </div>

      {/* Mechanism Step Description */}
      {currentStep && (
        <div className="px-4 py-2 bg-zinc-900/60 border-b border-obsidian-border/60 text-xs text-zinc-300 flex items-center justify-between">
          <p className="line-clamp-1 italic text-zinc-300">
            {currentStep.description}
          </p>
          <div className="flex items-center gap-1.5 ml-4 shrink-0">
            <button
              onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
              disabled={currentStepIndex === 0}
              className="p-1 rounded bg-obsidian-border hover:bg-obsidian-active disabled:opacity-30 disabled:hover:bg-obsidian-border text-zinc-300"
              title="Previous Step"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={currentStepIndex >= steps.length - 1}
              className="p-1 rounded bg-obsidian-border hover:bg-obsidian-active disabled:opacity-30 disabled:hover:bg-obsidian-border text-zinc-300"
              title="Next Step"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2D Molecular Canvas with Curved Mechanism Arrows */}
      <div className="relative flex-1 w-full min-h-[320px] flex items-center justify-center p-4">
        <svg viewBox="0 0 540 320" className="w-full h-full max-h-[440px] select-none">
          <defs>
            {/* Arrowhead marker for curved electron arrows */}
            <marker
              id="curved-arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 Z" fill={themedColor('#ec4899')} />
            </marker>
          </defs>

          {/* Render Chemical Bonds */}
          {currentStep?.bonds.map((bond: ChemBond) => {
            const atomA = currentStep.atoms.find((a) => a.id === bond.from);
            const atomB = currentStep.atoms.find((a) => a.id === bond.to);
            if (!atomA || !atomB) return null;

            return (
              <g key={bond.id}>
                <line
                  x1={atomA.pos.x}
                  y1={atomA.pos.y}
                  x2={atomB.pos.x}
                  y2={atomB.pos.y}
                  stroke={themedColor('#52525b')}
                  strokeWidth={bond.order === 2 ? 6 : 3}
                  strokeLinecap="round"
                />
                {bond.order === 2 && (
                  <line
                    x1={atomA.pos.x}
                    y1={atomA.pos.y}
                    x2={atomB.pos.x}
                    y2={atomB.pos.y}
                    stroke={themedColor('#18181b')}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

          {/* Render Curved Mechanism Arrows (Electron Pushing) */}
          {currentStep?.curvedArrows?.map((arrow: CurvedArrow) => {
            let startPos = { x: 120, y: 160 };
            let endPos = { x: 260, y: 160 };

            if (arrow.from.type === 'lone_pair') {
              const atom = currentStep.atoms.find((a) => a.id === arrow.from.id);
              if (atom) startPos = { x: atom.pos.x + 12, y: atom.pos.y - 12 };
            } else if (arrow.from.type === 'bond') {
              const bond = currentStep.bonds.find((b) => b.id === arrow.from.id);
              if (bond) {
                const a1 = currentStep.atoms.find((a) => a.id === bond.from);
                const a2 = currentStep.atoms.find((a) => a.id === bond.to);
                if (a1 && a2) {
                  startPos = { x: (a1.pos.x + a2.pos.x) / 2, y: (a1.pos.y + a2.pos.y) / 2 };
                }
              }
            }

            if (arrow.to.type === 'atom') {
              const atom = currentStep.atoms.find((a) => a.id === arrow.to.id);
              if (atom) endPos = { x: atom.pos.x, y: atom.pos.y - 14 };
            }

            // Calculate Bezier control point for the arc
            const midX = (startPos.x + endPos.x) / 2;
            const midY = Math.min(startPos.y, endPos.y) - 45;
            const pathData = `M ${startPos.x} ${startPos.y} Q ${midX} ${midY} ${endPos.x} ${endPos.y}`;

            return (
              <g key={arrow.id} className="animate-pulse">
                <path
                  d={pathData}
                  fill="none"
                  stroke={themedColor('#ec4899')}
                  strokeWidth="2.5"
                  strokeDasharray="4, 2"
                  markerEnd="url(#curved-arrowhead)"
                />
                {arrow.label && (
                  <text
                    x={midX}
                    y={midY - 8}
                    fill={themedColor('#f472b6')}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {arrow.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Atoms */}
          {currentStep?.atoms.map((atom: ChemAtom) => {
            const radius = getAtomRadius(atom.element);
            const color = getElementColor(atom.element);

            return (
              <g key={atom.id} transform={`translate(${atom.pos.x}, ${atom.pos.y})`}>
                {/* Atom sphere */}
                <circle
                  cx="0"
                  cy="0"
                  r={radius}
                  fill={color}
                  stroke={themedColor('#27272a')}
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                />
                {/* Element Symbol */}
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={contrastText(getElementColor(atom.element))}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {atom.element}
                </text>

                {/* Formal Charge */}
                {atom.charge !== undefined && atom.charge !== 0 && (
                  <g transform={`translate(${radius - 2}, ${-radius + 4})`}>
                    <circle cx="0" cy="0" r="7" fill={atom.charge < 0 ? themedColor('#ef4444') : themedColor('#3b82f6')} />
                    <text x="0" y="3" textAnchor="middle" fill={themedColor('#ffffff')} fontSize="9" fontWeight="bold">
                      {atom.charge > 0 ? `+${atom.charge > 1 ? atom.charge : ''}` : atom.charge === -1 ? '–' : `${atom.charge}`}
                    </text>
                  </g>
                )}

                {/* Lone pairs */}
                {atom.lonePairs && (
                  <g>
                    {Array.from({ length: atom.lonePairs }).map((_, li) => {
                      const angle = (li * Math.PI) / 2 + Math.PI / 4;
                      const dist = radius + 6;
                      const px = Math.cos(angle) * dist;
                      const py = Math.sin(angle) * dist;
                      return (
                        <circle key={li} cx={px} cy={py} r="2" fill={themedColor('#ec4899')} />
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-obsidian-surface border-t border-obsidian-border text-[11px] font-mono">
        <span className="text-zinc-400">Atom Key:</span>
        <span className="flex items-center gap-1 text-zinc-300"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> C (Carbon)</span>
        <span className="flex items-center gap-1 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> O (Oxygen)</span>
        <span className="flex items-center gap-1 text-amber-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-700 inline-block"></span> Br (Bromine)</span>
        <span className="flex items-center gap-1 text-zinc-100"><span className="w-2.5 h-2.5 rounded-full bg-zinc-200 inline-block"></span> H (Hydrogen)</span>
        <span className="flex items-center gap-1 text-pink-400 ml-auto">
          <span className="w-3 h-0.5 bg-pink-500 inline-block"></span> Electron Pushing Arrow
        </span>
      </div>
    </div>
  );
};
