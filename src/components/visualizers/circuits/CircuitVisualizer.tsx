import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import { solveCircuit } from '../../../lib/circuit';
import { circuitBounds, circuitWirePaths, pathFromPoints, viewBoxAttr } from '../../../lib/layout';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CircuitSpec, CircuitComponent, CircuitWire } from '../../../types';

interface CircuitVisualizerProps {
  spec: CircuitSpec;
  paramValues: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const CircuitVisualizer: React.FC<CircuitVisualizerProps> = ({ spec, paramValues }) => {
  const { theme } = useTheme();
  // Local state for interactive switches
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    spec.components.forEach((c) => {
      if (c.type === 'switch') {
        initial[c.id] = c.state !== false;
      }
    });
    return initial;
  });

  // Animated particle phase (0..1)
  const [particleOffset, setParticleOffset] = useState<number>(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => { setSwitchStates(Object.fromEntries(spec.components.filter(c => c.type === 'switch').map(c => [c.id, c.state !== false]))); }, [spec]);
  const measurement = useMemo(() => solveCircuit(spec, paramValues, switchStates), [spec, paramValues, switchStates]);
  const [showValues, setShowValues] = useState(true);
  // A part carries current when its solved current is non-negligible.
  const carries = (id: string) => Math.abs(measurement.components[id]?.current ?? 0) > 1e-9;
  const maxCurrent = Math.max(0, ...Object.values(measurement.components).map((c) => Math.abs(c.current ?? 0)));
  const current = maxCurrent;
  const isCircuitActive = measurement.supported && maxCurrent > 1e-9;
  const bulbPowerWatts = measurement.power;
  const wirePaths = useMemo(() => circuitWirePaths(spec), [spec]);
  const bounds = useMemo(() => circuitBounds(spec), [spec]);
  // One voltage tag per node, placed at the middle of the longest straight run of one of its wires.
  const nodeTags = useMemo(() => {
    const tags = new Map<string, { x: number; y: number; length: number }>();
    wirePaths.forEach((w, i) => {
      const wire = spec.wires[i];
      const nodeId = measurement.pinNode[`${wire.from.compId}:${wire.from.pin}`];
      if (!nodeId) return;
      for (let k = 1; k < w.points.length; k++) {
        const a = w.points[k - 1], b = w.points[k];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length > (tags.get(nodeId)?.length ?? 0)) tags.set(nodeId, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, length });
      }
    });
    return [...tags.entries()];
  }, [wirePaths, spec.wires, measurement.pinNode]);

  // Particle drift animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const speedMultiplier = isCircuitActive ? Math.min(4, Math.max(0.3, current * 8)) : 0;

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (isCircuitActive) {
        setParticleOffset((prev) => (prev + dt * speedMultiplier * 40) % 40);
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isCircuitActive, current]);

  const toggleSwitch = (id: string) => {
    setSwitchStates((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Render individual circuit components
  const renderComponent = (comp: CircuitComponent) => {
    const { x, y } = comp.pos;
    const isHorizontal = !comp.rotation || comp.rotation === 0 || comp.rotation === 180;
    const rotation = comp.rotation || 0;
    // Upright label placed above horizontal symbols and beside vertical ones.
    const label = (text: React.ReactNode, color: string) => (
      <text x={x + (isHorizontal ? 0 : 20)} y={y + (isHorizontal ? -16 : 4)} textAnchor={isHorizontal ? 'middle' : 'start'} fill={themedColor(color)} fontSize="11" fontFamily="monospace">{text}</text>
    );

    switch (comp.type) {
      case 'dc_source':
        return (
          <g key={comp.id}>
           {/* Drawn vertically, so rotate by −90° to make rotation 0 horizontal like other parts. */}
           <g transform={`translate(${x}, ${y}) rotate(${rotation - 90})`}>
            {/* Battery symbol: long plate (+, pin 0), short thick plate (−, pin 1) */}
            <line x1="0" y1="-25" x2="0" y2="-12" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <line x1="-18" y1="-12" x2="18" y2="-12" stroke={themedColor('#38bdf8')} strokeWidth="3" />
            <line x1="-10" y1="0" x2="10" y2="0" stroke={themedColor('#f43f5e')} strokeWidth="4" />
            <line x1="0" y1="0" x2="0" y2="25" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            {/* Labels */}
            <text x="24" y="-8" fill={themedColor('#38bdf8')} fontSize="11" fontWeight="bold">+</text>
            <text x="24" y="6" fill={themedColor('#f43f5e')} fontSize="12" fontWeight="bold">-</text>
           </g>
            {/* Upright value label: left of a vertical battery, above a horizontal one. */}
            <text x={x + (isHorizontal ? 0 : -24)} y={y + (isHorizontal ? -24 : 4)} textAnchor={isHorizontal ? 'middle' : 'end'} fill={themedColor('#e2e8f0')} fontSize="11" fontFamily="monospace">{paramValues[comp.id] ?? comp.value}V DC</text>
          </g>
        );

      case 'resistor':
        return (
          <g key={comp.id}>
           <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
            {/* Zigzag IEEE resistor */}
            <path
              d="M -35 0 L -20 0 L -15 -10 L -5 10 L 5 -10 L 15 10 L 20 0 L 35 0"
              fill="none"
              stroke={themedColor('#fbbf24')}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
           </g>
            {label(<>{paramValues[comp.id] ?? comp.value} {comp.unit || 'Ω'}</>, '#fbbf24')}
          </g>
        );

      case 'capacitor':
        return (
          <g key={comp.id}>
           <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
            {/* Parallel plates */}
            <line x1="-25" y1="0" x2="-6" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <line x1="-6" y1="-16" x2="-6" y2="16" stroke={themedColor('#a78bfa')} strokeWidth="3" />
            <line x1="6" y1="-16" x2="6" y2="16" stroke={themedColor('#a78bfa')} strokeWidth="3" />
            <line x1="6" y1="0" x2="25" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
           </g>
            {label(comp.label, '#a78bfa')}
          </g>
        );

      case 'inductor':
        return (
          <g key={comp.id}>
           <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
            {/* 3 coiled arcs */}
            <line x1="-35" y1="0" x2="-25" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <path
              d="M -25 0 A 7 7 0 0 1 -11 0 A 7 7 0 0 1 3 0 A 7 7 0 0 1 17 0 A 7 7 0 0 1 25 0"
              fill="none"
              stroke={themedColor('#34d399')}
              strokeWidth="2.5"
            />
            <line x1="25" y1="0" x2="35" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
           </g>
            {label(comp.label, '#34d399')}
          </g>
        );

      case 'switch':
        const isOpen = !switchStates[comp.id];
        return (
          <g
            key={comp.id}
            transform={`translate(${x}, ${y}) rotate(${rotation})`}
            onClick={() => toggleSwitch(comp.id)}
            className="cursor-pointer group"
          >
            {/* Click hit box */}
            <rect x="-30" y="-25" width="60" height="50" fill="transparent" />
            {/* Terminal terminals */}
            <circle cx="-20" cy="0" r="4" fill={themedColor('#60a5fa')} />
            <circle cx="20" cy="0" r="4" fill={themedColor('#60a5fa')} />
            {/* Blade arm */}
            <line
              x1="-20"
              y1="0"
              x2={isOpen ? "12" : "20"}
              y2={isOpen ? "-18" : "0"}
              stroke={themedColor('#f59e0b')}
              strokeWidth="3.5"
              strokeLinecap="round"
              className="transition-all duration-200"
            />
            {/* Switch state indicator */}
            <text x="0" y="-24" textAnchor="middle" transform={`rotate(${-rotation})`} fill={isOpen ? themedColor('#ef4444') : themedColor('#22c55e')} fontSize="10" fontWeight="bold">
              {isOpen ? 'OPEN (Click to Close)' : 'CLOSED (Active)'}
            </text>
          </g>
        );

      case 'lamp':
        const glowOpacity = isCircuitActive ? Math.min(1, Math.max(0.15, bulbPowerWatts / 50)) : 0.05;
        return (
          <g key={comp.id} transform={`translate(${x}, ${y})`}>
            {/* Glow halo */}
            <circle cx="0" cy="0" r="28" fill={themedColor('#fde047')} opacity={glowOpacity * 0.4} />
            <circle cx="0" cy="0" r="18" fill={isCircuitActive ? themedColor('#fef08a') : themedColor('#27272a')} stroke={themedColor('#e2e8f0')} strokeWidth="2" />
            {/* Filament X */}
            <line x1="-8" y1="-8" x2="8" y2="8" stroke={themedColor('#ca8a04')} strokeWidth="2" />
            <line x1="-8" y1="8" x2="8" y2="-8" stroke={themedColor('#ca8a04')} strokeWidth="2" />
            <text x="0" y="32" textAnchor="middle" fill={themedColor('#fef08a')} fontSize="10" fontFamily="monospace">
              {isCircuitActive ? `${bulbPowerWatts.toFixed(1)}W` : 'OFF'}
            </text>
          </g>
        );

      case 'ground':
        return (
          <g key={comp.id} transform={`translate(${x}, ${y})`}>
            <line x1="0" y1="-15" x2="0" y2="0" stroke={themedColor('#94a3b8')} strokeWidth="2" />
            <line x1="-16" y1="0" x2="16" y2="0" stroke={themedColor('#94a3b8')} strokeWidth="2.5" />
            <line x1="-10" y1="5" x2="10" y2="5" stroke={themedColor('#94a3b8')} strokeWidth="2" />
            <line x1="-4" y1="10" x2="4" y2="10" stroke={themedColor('#94a3b8')} strokeWidth="1.5" />
            <text x="0" y="22" textAnchor="middle" fill={themedColor('#64748b')} fontSize="9">GND (0V)</text>
          </g>
        );

      default:
        // Generic labelled box so unsupported parts (diode, meters, AC source) still sit on their wires.
        return (
          <g key={comp.id}>
            <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
              <line x1="-25" y1="0" x2="-14" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
              <rect x="-14" y="-10" width="28" height="20" rx="3" fill={themedColor('#18181b')} stroke={themedColor('#94a3b8')} strokeWidth="2" />
              <line x1="14" y1="0" x2="25" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            </g>
            {label(comp.label || comp.type, '#94a3b8')}
          </g>
        );
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-lg overflow-hidden border border-obsidian-border">
      {/* Live Measurement HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 bg-obsidian-surface border-b border-obsidian-border text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isCircuitActive ? themedColor('#22c55e') : themedColor('#ef4444') }} />
            <span className="font-mono text-zinc-300">
              State: <strong className={isCircuitActive ? 'text-green-400' : 'text-red-400'}>{!measurement.supported ? 'SCHEMATIC' : isCircuitActive ? 'CONDUCTING' : 'NO CURRENT'}</strong>
            </span>
          </div>
          <div className="font-mono text-zinc-300">
            Current: <span className="text-amber-400 font-bold">{measurement.supported ? (spec.components.filter((c) => c.type === 'dc_source').length === 1 ? formatSI(measurement.current, 'A') : 'see parts') : 'Unavailable'}</span>
          </div>
          <div className="font-mono text-zinc-300">
            Power: <span className="text-purple-400 font-bold">{measurement.supported ? formatSI(bulbPowerWatts, 'W') : 'Unavailable'}</span>
          </div>
        </div>
        {measurement.supported && (
          <label className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} className="accent-purple-500" />
            Show voltages &amp; currents
          </label>
        )}
        <div className="text-zinc-500 text-[11px] font-mono whitespace-nowrap">
          Click the switch or drag sliders
        </div>
      </div>

      <p role="status" className="px-4 py-2 text-xs text-amber-200">{measurement.reason}</p>
      {/* Circuit SVG Canvas */}
      <div className="relative flex-1 w-full min-h-[340px] flex items-center justify-center p-4">
        <svg
          viewBox={viewBoxAttr(bounds)}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-[460px] select-none"
        >
          {/* Wire Background Grids */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.75" fill={themedColor('#27272a')} />
            </pattern>
            {/* Filter for glowing current wires */}
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="url(#grid)" />

          {/* Circuit Connecting Wires, routed from each component's pins */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {wirePaths.map((w) => (
              <path key={w.id} d={pathFromPoints(w.points)} stroke={themedColor('#3f3f46')} strokeWidth="4" />
            ))}
            {isCircuitActive && wirePaths.filter((_, i) => carries(spec.wires[i].from.compId) || carries(spec.wires[i].to.compId)).map((w) => (
              <React.Fragment key={w.id}>
                <path d={pathFromPoints(w.points)} stroke={themedColor('#fbbf24')} strokeWidth="2.5" filter="url(#wire-glow)" opacity="0.8" />
                {/* Animated electron drift dots */}
                <path d={pathFromPoints(w.points)} stroke={themedColor('#60a5fa')} strokeWidth="3.5" strokeDasharray="6, 20" strokeDashoffset={-particleOffset} opacity="0.95" />
              </React.Fragment>
            ))}
          </g>

          {/* Render All Circuit Components */}
          {spec.components.map(renderComponent)}

          {/* Simulated values: node voltages on the wires, voltage drop and current beside each part */}
          {measurement.supported && showValues && (
            <g fontFamily="monospace" fontSize="10" pointerEvents="none">
              {nodeTags.map(([nodeId, at]) => {
                const v = measurement.nodeVoltages[nodeId];
                if (v === null || v === undefined) return null;
                const text = nodeId === measurement.referenceNode ? '0 V (ref)' : formatSI(v, 'V');
                const width = text.length * 6.2 + 10;
                return (
                  <g key={nodeId}>
                    <rect x={at.x - width / 2} y={at.y - 8} width={width} height={16} rx={8} fill={themedColor('#0c4a6e')} stroke={themedColor('#38bdf8')} strokeWidth="1" />
                    <text x={at.x} y={at.y + 3.5} textAnchor="middle" fill={themedColor('#e0f2fe')}>{text}</text>
                  </g>
                );
              })}
              {spec.components.map((c) => {
                const r = measurement.components[c.id];
                if (!r || !['resistor', 'lamp', 'capacitor', 'inductor', 'dc_source'].includes(c.type)) return null;
                const parts = [Number.isFinite(r.voltage) && c.type !== 'dc_source' ? `ΔV ${formatSI(Math.abs(r.voltage), 'V')}` : '', r.current !== null && c.type !== 'capacitor' ? `I ${formatSI(Math.abs(r.current), 'A')}` : ''].filter(Boolean);
                if (!parts.length) return null;
                const vertical = c.rotation === 90 || c.rotation === 270;
                const x = c.pos.x + (c.type === 'dc_source' && vertical ? -24 : vertical ? 20 : 0);
                const y = c.pos.y + (vertical ? 18 : 26);
                return <text key={c.id} x={x} y={y} textAnchor={c.type === 'dc_source' && vertical ? 'end' : vertical ? 'start' : 'middle'} fill={themedColor('#fde68a')}>{parts.join(' · ')}</text>;
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

/** Engineering notation: 0.0164 A -> "16.4 mA", 5.4 V -> "5.40 V". */
export function formatSI(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  const abs = Math.abs(value);
  if (abs < 1e-12) return `0 ${unit}`;
  const prefixes: Array<[number, string]> = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
  const [scale, prefix] = prefixes.find(([f]) => abs >= f) ?? prefixes[prefixes.length - 1];
  const scaled = value / scale;
  return `${Math.abs(scaled) >= 100 ? scaled.toFixed(0) : Math.abs(scaled) >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)} ${prefix}${unit}`;
}
