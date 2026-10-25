import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import React, { useRef, useEffect, useState } from 'react';
import { OrbitSpec } from '../../../types';
import { Play, Pause, RotateCcw, Compass, Eye } from 'lucide-react';

interface OrbitVisualizerProps {
  spec: OrbitSpec;
  paramValues?: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const OrbitVisualizer: React.FC<OrbitVisualizerProps> = ({ spec }) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showKeplerArea, setShowKeplerArea] = useState<boolean>(false);

  const stateRef = useRef<{
    time: number;
    trails: Record<string, Array<{ x: number; y: number }>>;
  }>({
    time: 0,
    trails: {}
  });

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Deep space background with subtle stars
      ctx.fillStyle = themedColor('#050713');
      ctx.fillRect(0, 0, width, height);

      // Central Star/Planet
      const central = spec.centralBody || { name: 'Sun', mass: 1000, radius: 24, color: themedColor('#f59e0b') };

      // Corona glow
      const grad = ctx.createRadialGradient(centerX, centerY, central.radius * 0.5, centerX, centerY, central.radius * 2.5);
      grad.addColorStop(0, themedColor(central.color));
      grad.addColorStop(0.5, `${themedColor(central.color)}55`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, central.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Central body core
      ctx.fillStyle = themedColor(central.color);
      ctx.beginPath();
      ctx.arc(centerX, centerY, central.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = themedColor('#ffffff');
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(central.name, centerX, centerY + central.radius + 14);

      // Orbiting bodies propagation
      const bodies = spec.bodies || [];
      bodies.forEach((body) => {
        const a = body.semiMajorAxis || 120;
        const e = Math.min(0.9, Math.max(0, body.eccentricity || 0));
        const period = body.orbitalPeriod || 8; // seconds per orbit

        // Focus offset from center of ellipse: c = a * e
        // One focus is at (centerX, centerY)
        const focusOffset = a * e;
        const ellipseCenterX = centerX - focusOffset;
        const b = a * Math.sqrt(Math.max(0.01, 1 - e * e)); // semi-minor axis

        // Draw elliptical orbit path
        ctx.strokeStyle = themedColor('#334155');
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(ellipseCenterX, centerY, a, b, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Mean anomaly M(t) = 2*pi * (t / period)
        const M = (2 * Math.PI * (stateRef.current.time / period)) % (Math.PI * 2);

        // Solve Kepler's equation for Eccentric anomaly E: M = E - e*sin(E) via Newton-Raphson
        let E = M;
        for (let iter = 0; iter < 5; iter++) {
          E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        }

        // True position relative to central focus
        const xPos = ellipseCenterX + a * Math.cos(E);
        const yPos = centerY + b * Math.sin(E);

        // Kepler's Second Law: Sector sweep illustration
        if (showKeplerArea) {
          ctx.fillStyle = themedColor('rgba(168, 85, 247, 0.2)');
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          const startE = E - 0.4;
          for (let th = startE; th <= E; th += 0.05) {
            ctx.lineTo(ellipseCenterX + a * Math.cos(th), centerY + b * Math.sin(th));
          }
          ctx.closePath();
          ctx.fill();
        }

        // Orbit trail
        if (!stateRef.current.trails[body.id]) {
          stateRef.current.trails[body.id] = [];
        }
        const trail = stateRef.current.trails[body.id];
        if (isPlaying) {
          trail.push({ x: xPos, y: yPos });
          if (trail.length > 50) trail.shift();
        }

        ctx.strokeStyle = `${themedColor(body.color)}88`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        trail.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Draw body
        ctx.fillStyle = themedColor(body.color);
        ctx.beginPath();
        ctx.arc(xPos, yPos, body.radius || 7, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = themedColor('#e2e8f0');
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(body.name, xPos, yPos - (body.radius || 7) - 4);

        // Velocity vector overlay
        if (showVectors) {
          // Tangent direction: derivative dx/dE = -a*sin(E), dy/dE = b*cos(E)
          const dx = -a * Math.sin(E);
          const dy = b * Math.cos(E);
          const mag = Math.sqrt(dx * dx + dy * dy);
          const vScale = 28;
          const vx = (dx / (mag || 1)) * vScale;
          const vy = (dy / (mag || 1)) * vScale;

          ctx.strokeStyle = themedColor('#38bdf8');
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(xPos, yPos);
          ctx.lineTo(xPos + vx, yPos + vy);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(vy, vx);
          ctx.fillStyle = themedColor('#38bdf8');
          ctx.beginPath();
          ctx.moveTo(xPos + vx, yPos + vy);
          ctx.lineTo(xPos + vx - 7 * Math.cos(angle - Math.PI / 6), yPos + vy - 7 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(xPos + vx - 7 * Math.cos(angle + Math.PI / 6), yPos + vy - 7 * Math.sin(angle + Math.PI / 6));
          ctx.fill();
        }
      });

      if (isPlaying) {
        stateRef.current.time += 0.016 * timeScale;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [theme.id, isPlaying, timeScale, showVectors, showKeplerArea, spec]);

  const handleReset = () => {
    stateRef.current.time = 0;
    stateRef.current.trails = {};
  };

  return (
    <div className="w-full flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 p-4 select-none">
      {/* Orbit Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-semibold uppercase flex items-center gap-1">
            <Compass className="w-3 h-3 text-blue-400" /> Orbital Mechanics
          </span>
          <span className="font-semibold text-zinc-100">{spec.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showVectors ? 'bg-blue-950 border-blue-700 text-blue-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
            title="Toggle Velocity Vectors"
          >
            <Eye className="w-3 h-3 text-blue-400" />
            <span>Vectors</span>
          </button>
          <button
            onClick={() => setShowKeplerArea(!showKeplerArea)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showKeplerArea ? 'bg-purple-950 border-purple-700 text-purple-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
            title="Kepler 2nd Law Area Sweep"
          >
            <span>Kepler Area</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full my-2 flex items-center justify-center rounded-lg overflow-hidden border border-zinc-800">
        <canvas ref={canvasRef} width={580} height={280} className="w-full max-h-[300px]" />
      </div>

      {/* Orbit Playback Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
            title="Reset Orbits"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Time Scale Warp */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span>Time Warp:</span>
          <input
            type="range"
            min={0.2}
            max={3.0}
            step={0.1}
            value={timeScale}
            onChange={(e) => setTimeScale(parseFloat(e.target.value))}
            className="w-20 accent-blue-500 h-1 bg-zinc-800 rounded cursor-pointer"
          />
          <span className="text-blue-300 w-8">{timeScale.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};
