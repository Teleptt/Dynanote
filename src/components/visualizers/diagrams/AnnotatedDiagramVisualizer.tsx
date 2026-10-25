import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import React, { useState } from 'react';
import { AnnotatedDiagramSpec, DiagramHotspot } from '../../../types';
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Info
} from 'lucide-react';

interface AnnotatedDiagramVisualizerProps {
  spec: AnnotatedDiagramSpec;
  paramValues?: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const AnnotatedDiagramVisualizer: React.FC<AnnotatedDiagramVisualizerProps> = ({
  spec
}) => {
  const { theme } = useTheme();
  const [selectedHotspot, setSelectedHotspot] = useState<DiagramHotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<DiagramHotspot | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [tourIndex, setTourIndex] = useState<number | null>(null); // null when not in tour mode

  const viewBoxWidth = spec.viewBox?.width ?? 640;
  const viewBoxHeight = spec.viewBox?.height ?? 420;

  // Filtered hotspots based on active category
  const filteredHotspots = spec.hotspots.filter((h) => {
    if (activeCategory === 'all') return true;
    return h.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  const tourSteps = spec.guidedTourSteps || [];
  const currentTourStep = tourIndex !== null && tourSteps[tourIndex] ? tourSteps[tourIndex] : null;
  const currentTourHotspot = currentTourStep
    ? spec.hotspots.find((h) => h.id === currentTourStep.hotspotId) || null
    : null;

  // Active highlighted hotspot is either tour hotspot, clicked hotspot, or hovered hotspot
  const activeFocusHotspot = currentTourHotspot || selectedHotspot || hoveredHotspot;

  const startTour = () => {
    if (tourSteps.length > 0) {
      setTourIndex(0);
      setSelectedHotspot(null);
    }
  };

  const nextTourStep = () => {
    if (tourIndex !== null && tourIndex < tourSteps.length - 1) {
      setTourIndex(tourIndex + 1);
    } else {
      setTourIndex(null); // End of tour
    }
  };

  const prevTourStep = () => {
    if (tourIndex !== null && tourIndex > 0) {
      setTourIndex(tourIndex - 1);
    }
  };

  const exitTour = () => {
    setTourIndex(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-xl overflow-hidden select-none border border-zinc-800">
      {/* Diagram Top Bar: Title, Category Filters, and Tour Button */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-zinc-100">{spec.title}</span>
          {spec.topicCategory && (
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 capitalize">
              {spec.topicCategory}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layer Filter Chips */}
          {spec.categories && spec.categories.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-purple-900/70 text-purple-200'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              {spec.categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-purple-900/70 text-purple-200'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Guided Tour Trigger */}
          {tourSteps.length > 0 && (
            <button
              onClick={tourIndex === null ? startTour : exitTour}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                tourIndex !== null
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
              title="Step-by-step walkthrough of diagram components"
            >
              {tourIndex !== null ? (
                <>
                  <X className="w-3 h-3" />
                  <span>Exit Tour</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Guided Tour</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center p-3 bg-zinc-950/90 overflow-hidden min-h-[360px]">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full max-h-[460px] object-contain drop-shadow-md"
        >
          <defs>
            {/* Ambient gradients */}
            <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={themedColor('#a855f7')} stopOpacity="0.8" />
              <stop offset="100%" stopColor={themedColor('#a855f7')} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="activeSpotlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={themedColor('#38bdf8')} stopOpacity="0.9" />
              <stop offset="100%" stopColor={themedColor('#38bdf8')} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Render Diagram Vector Shapes */}
          <g className="diagram-shapes">
            {spec.shapes.map((shape) => {
              const fill = themedColor(shape.fill || '#1e293b');
              const stroke = themedColor(shape.stroke || '#475569');
              const strokeWidth = shape.strokeWidth ?? 1.5;
              const opacity = shape.opacity ?? 1.0;

              switch (shape.type) {
                case 'path':
                  return (
                    <path
                      key={shape.id}
                      d={shape.d}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  );
                case 'ellipse':
                  return (
                    <ellipse
                      key={shape.id}
                      cx={shape.x}
                      cy={shape.y}
                      rx={shape.radiusX ?? shape.radius ?? 20}
                      ry={shape.radiusY ?? shape.radius ?? 20}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                    />
                  );
                case 'circle':
                  return (
                    <circle
                      key={shape.id}
                      cx={shape.x}
                      cy={shape.y}
                      r={shape.radius ?? 15}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                    />
                  );
                case 'rect':
                  return (
                    <rect
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width ?? 40}
                      height={shape.height ?? 30}
                      rx={4}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                    />
                  );
                case 'polygon':
                  return (
                    <polygon
                      key={shape.id}
                      points={shape.points}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                    />
                  );
                case 'text':
                  return (
                    <text
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      fill={fill || themedColor('#cbd5e1')}
                      fontSize={11}
                      fontWeight="600"
                      textAnchor="middle"
                      opacity={opacity}
                    >
                      {shape.label}
                    </text>
                  );
                default:
                  return null;
              }
            })}
          </g>

          {/* 2. Render Leader Lines connecting Hotspots */}
          <g className="diagram-leader-lines">
            {filteredHotspots.map((h) => {
              const isFocused = activeFocusHotspot?.id === h.id;
              const hx = (h.x / 100) * viewBoxWidth;
              const hy = (h.y / 100) * viewBoxHeight;

              return (
                <g key={`leader-${h.id}`}>
                  {/* Glowing anchor dot */}
                  <circle
                    cx={hx}
                    cy={hy}
                    r={isFocused ? 4.5 : 2.5}
                    fill={isFocused ? themedColor('#38bdf8') : themedColor(h.color)}
                  />
                </g>
              );
            })}
          </g>

          {/* 3. Render Interactive Glowing Hotspot Pins */}
          <g className="diagram-hotspots">
            {filteredHotspots.map((h) => {
              const isFocused = activeFocusHotspot?.id === h.id;
              const isTourActive = currentTourHotspot?.id === h.id;
              const hx = (h.x / 100) * viewBoxWidth;
              const hy = (h.y / 100) * viewBoxHeight;
              const pinColor = isTourActive
                ? themedColor('#f59e0b')
                : isFocused
                ? themedColor('#38bdf8')
                : themedColor(h.color);

              return (
                <g
                  key={h.id}
                  transform={`translate(${hx}, ${hy})`}
                  onClick={() => setSelectedHotspot(h)}
                  onMouseEnter={() => setHoveredHotspot(h)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                  className="cursor-pointer group"
                >
                  {/* Pulsating concentric glow ring */}
                  <circle
                    r={isFocused ? 22 : 14}
                    fill={pinColor}
                    opacity={isFocused ? 0.35 : 0.18}
                    className={isFocused ? 'animate-ping' : ''}
                  />

                  {/* Outer ring */}
                  <circle
                    r={isFocused ? 14 : 11}
                    fill={themedColor('#0f172a')}
                    stroke={pinColor}
                    strokeWidth={isFocused ? 2.5 : 1.8}
                  />

                  {/* Pin label text */}
                  <text
                    y={3.5}
                    textAnchor="middle"
                    fill={themedColor('#f8fafc')}
                    fontSize={isFocused ? 10 : 9}
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {h.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Detail Card / Callout Popover */}
        {activeFocusHotspot && (
          <div className="absolute top-4 right-4 max-w-xs p-3.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 shadow-2xl text-xs flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 z-20">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                  style={{ backgroundColor: themedColor(activeFocusHotspot.color) }}
                >
                  {activeFocusHotspot.label}
                </span>
                <span className="font-bold text-zinc-100 text-sm">
                  {activeFocusHotspot.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-zinc-300 leading-relaxed text-[11px]">
              {activeFocusHotspot.description}
            </p>

            {activeFocusHotspot.details && activeFocusHotspot.details.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1 border-t border-zinc-800 pt-1.5">
                {activeFocusHotspot.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span className="text-purple-400 font-bold shrink-0">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Guided Tour Bottom Controller Bar */}
      {tourIndex !== null && currentTourStep && (
        <div className="px-4 py-2.5 bg-amber-950/40 border-t border-amber-900/60 flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
              Step {tourIndex + 1} of {tourSteps.length}
            </span>
            <span className="font-semibold text-amber-200 text-xs">
              {currentTourStep.stepTitle}
            </span>
            <span className="text-amber-300/80 text-[11px] hidden sm:inline">
              — {currentTourStep.stepExplanation}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevTourStep}
              disabled={tourIndex === 0}
              className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-[11px] flex items-center gap-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              onClick={nextTourStep}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] flex items-center gap-0.5"
            >
              <span>{tourIndex === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
