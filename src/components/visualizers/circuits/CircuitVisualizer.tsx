import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import { solveSeriesCircuit } from '../../../lib/circuit';
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
  const measurement = solveSeriesCircuit(spec, paramValues, switchStates);
  const { current } = measurement;
  const isCircuitActive = measurement.supported && current !== 0;
  const currentMilliAmps = current * 1000;
  const bulbPowerWatts = measurement.power;

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

    switch (comp.type) {
      case 'dc_source':
        return (
          <g key={comp.id} transform={`translate(${x}, ${y})`}>
            {/* Battery symbol: long plate, short thick plate */}
            <line x1="0" y1="-25" x2="0" y2="-12" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <line x1="-18" y1="-12" x2="18" y2="-12" stroke={themedColor('#38bdf8')} strokeWidth="3" />
            <line x1="-10" y1="0" x2="10" y2="0" stroke={themedColor('#f43f5e')} strokeWidth="4" />
            <line x1="0" y1="0" x2="0" y2="25" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            {/* Labels */}
            <text x="24" y="-8" fill={themedColor('#38bdf8')} fontSize="11" fontWeight="bold">+</text>
            <text x="24" y="6" fill={themedColor('#f43f5e')} fontSize="12" fontWeight="bold">-</text>
            <text x="-48" y="4" fill={themedColor('#e2e8f0')} fontSize="11" fontFamily="monospace">{paramValues[comp.id] ?? comp.value}V DC</text>
          </g>
        );

      case 'resistor':
        return (
          <g key={comp.id} transform={`translate(${x}, ${y})`}>
            {/* Zigzag IEEE resistor */}
            <path
              d="M -35 0 L -20 0 L -15 -10 L -5 10 L 5 -10 L 15 10 L 20 0 L 35 0"
              fill="none"
              stroke={themedColor('#fbbf24')}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="0" y="-16" textAnchor="middle" fill={themedColor('#fbbf24')} fontSize="11" fontFamily="monospace">
              {paramValues[comp.id] ?? comp.value} {comp.unit || 'Ω'}
            </text>
          </g>
        );

      case 'capacitor':
        return (
          <g key={comp.id} transform={`translate(${x}, ${y}) rotate(${comp.rotation || 0})`}>
            {/* Parallel plates */}
            <line x1="-25" y1="0" x2="-6" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <line x1="-6" y1="-16" x2="-6" y2="16" stroke={themedColor('#a78bfa')} strokeWidth="3" />
            <line x1="6" y1="-16" x2="6" y2="16" stroke={themedColor('#a78bfa')} strokeWidth="3" />
            <line x1="6" y1="0" x2="25" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <text x="0" y="28" textAnchor="middle" fill={themedColor('#a78bfa')} fontSize="10" fontFamily="monospace">
              {comp.label}
            </text>
          </g>
        );

      case 'inductor':
        return (
          <g key={comp.id} transform={`translate(${x}, ${y})`}>
            {/* 3 coiled arcs */}
            <line x1="-35" y1="0" x2="-25" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <path
              d="M -25 0 A 7 7 0 0 1 -11 0 A 7 7 0 0 1 3 0 A 7 7 0 0 1 17 0 A 7 7 0 0 1 25 0"
              fill="none"
              stroke={themedColor('#34d399')}
              strokeWidth="2.5"
            />
            <line x1="25" y1="0" x2="35" y2="0" stroke={themedColor('#e2e8f0')} strokeWidth="2.5" />
            <text x="0" y="-12" textAnchor="middle" fill={themedColor('#34d399')} fontSize="10" fontFamily="monospace">
              {comp.label}
            </text>
          </g>
        );

      case 'switch':
        const isOpen = !switchStates[comp.id];
        return (
          <g
            key={comp.id}
            transform={`translate(${x}, ${y})`}
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
            <text x="0" y="-24" textAnchor="middle" fill={isOpen ? themedColor('#ef4444') : themedColor('#22c55e')} fontSize="10" fontWeight="bold">
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
        return null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-lg overflow-hidden border border-obsidian-border">
      {/* Live Measurement HUD Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-obsidian-surface border-b border-obsidian-border text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isCircuitActive ? themedColor('#22c55e') : themedColor('#ef4444') }} />
            <span className="font-mono text-zinc-300">
              State: <strong className={isCircuitActive ? 'text-green-400' : 'text-red-400'}>{!measurement.supported ? 'SCHEMATIC' : isCircuitActive ? 'CONDUCTING' : 'IDLE / OPEN'}</strong>
            </span>
          </div>
          <div className="font-mono text-zinc-300">
            Current: <span className="text-amber-400 font-bold">{measurement.supported ? `${currentMilliAmps.toFixed(1)} mA` : 'Unavailable'}</span>
          </div>
          <div className="font-mono text-zinc-300">
            Power: <span className="text-purple-400 font-bold">{measurement.supported ? `${bulbPowerWatts.toFixed(1)} W` : 'Unavailable'}</span>
          </div>
        </div>
        <div className="text-zinc-500 text-[11px] font-mono">
          Interactive: Click the switch or drag sliders
        </div>
      </div>

      <p role="status" className="px-4 py-2 text-xs text-amber-200">{measurement.reason}</p>
      {/* Circuit SVG Canvas */}
      <div className="relative flex-1 w-full min-h-[340px] flex items-center justify-center p-4">
        <svg
          viewBox="0 0 580 340"
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

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Circuit Connecting Wires */}
          <g>
            {/* Main Outer Loop Path */}
            <path
              d="M 100 165 L 100 90 L 170 90 M 210 90 L 265 90 M 335 90 L 385 90 M 455 90 L 470 90 L 470 165 M 470 215 L 470 290 L 100 290 L 100 215"
              fill="none"
              stroke={themedColor('#3f3f46')}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Parallel bulb branch */}
            <path
              d="M 300 90 L 300 165 M 300 215 L 300 290"
              fill="none"
              stroke={themedColor('#3f3f46')}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Glowing Active Wires when current is flowing */}
            {isCircuitActive && (
              <>
                <path
                  d="M 100 165 L 100 90 L 170 90 M 210 90 L 265 90 M 335 90 L 385 90 M 455 90 L 470 90 L 470 165 M 470 215 L 470 290 L 100 290 L 100 215"
                  fill="none"
                  stroke={themedColor('#fbbf24')}
                  strokeWidth="2.5"
                  filter="url(#wire-glow)"
                  opacity="0.8"
                />
                <path
                  d="M 300 90 L 300 165 M 300 215 L 300 290"
                  fill="none"
                  stroke={themedColor('#fbbf24')}
                  strokeWidth="2.5"
                  filter="url(#wire-glow)"
                  opacity="0.8"
                />

                {/* Animated Electron Drift Dots */}
                <path
                  d="M 100 215 L 100 290 L 470 290 L 470 90 L 100 90 L 100 165"
                  fill="none"
                  stroke={themedColor('#60a5fa')}
                  strokeWidth="3.5"
                  strokeDasharray="6, 20"
                  strokeDashoffset={-particleOffset}
                  strokeLinecap="round"
                  opacity="0.95"
                />
              </>
            )}
          </g>

          {/* Render All Circuit Components */}
          {spec.components.map(renderComponent)}
        </svg>
      </div>
    </div>
  );
};
