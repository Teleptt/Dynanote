import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import React, { useState, useEffect, useRef } from 'react';
import { PhysicsRigSpec } from '../../../types';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface PhysicsVisualizerProps {
  spec: PhysicsRigSpec;
  paramValues: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const PhysicsVisualizer: React.FC<PhysicsVisualizerProps> = ({ spec, paramValues }) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [simTime, setSimTime] = useState<number>(0);

  // Interactive mouse dragging
  const isDraggingRef = useRef<boolean>(false);
  const dragTargetRef = useRef<string | null>(null);

  // Live physics state ref (to avoid React re-render lag at 60 FPS)
  const stateRef = useRef<{
    bodies: Array<{
      id: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      mass: number;
      radius: number;
      color: string;
      isStatic: boolean;
      label?: string;
    }>;
    trail: Array<{ x: number; y: number; alpha: number }>;
  }>({
    bodies: [],
    trail: []
  });

  // Dynamic parameters from sliders
  const gravityVal = paramValues['gravity'] ?? 9.8;
  const stiffnessVal = paramValues['stiffness'] ?? 45;
  const dampingVal = paramValues['damping'] ?? 0.08;

  // Initialize or reset physics rig
  const resetSimulation = () => {
    stateRef.current.trail = [];
    stateRef.current.bodies = spec.bodies.map((b) => ({
      id: b.id,
      x: b.pos.x,
      y: b.pos.y,
      vx: b.velocity?.x || 0,
      vy: b.velocity?.y || 0,
      mass: b.mass || 1,
      radius: b.dimensions?.radius || 20,
      color: b.color || '#7c3aed',
      isStatic: !!b.isStatic,
      label: b.label
    }));
    setSimTime(0);
  };

  useEffect(() => {
    resetSimulation();
  }, [spec]);

  // Physics animation loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const loop = (currentTime: number) => {
      const deltaReal = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const dt = deltaReal * speedMultiplier;

      if (isPlaying) {
        // Physical numerical step (Verlet / Euler)
        const state = stateRef.current;
        const bodies = state.bodies;

        // Apply forces to non-static bodies
        bodies.forEach((b) => {
          if (b.isStatic || (isDraggingRef.current && dragTargetRef.current === b.id)) return;

          // 1. Gravity: F_g = m * g
          let fx = 0;
          let fy = b.mass * gravityVal * 20; // scaled for pixels

          // 2. Damping: F_d = -gamma * v
          fx -= dampingVal * 15 * b.vx;
          fy -= dampingVal * 15 * b.vy;

          // 3. Spring constraints
          spec.constraints.forEach((c) => {
            if (c.type === 'spring') {
              const bodyA = bodies.find((x) => x.id === c.bodyA);
              const bodyB = bodies.find((x) => x.id === c.bodyB);
              if (bodyA && bodyB && (b.id === bodyA.id || b.id === bodyB.id)) {
                const other = b.id === bodyA.id ? bodyB : bodyA;
                const dx = b.x - other.x;
                const dy = b.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const restL = c.restLength || 100;
                const stretch = dist - restL;
                const springF = -stiffnessVal * stretch;

                fx += springF * (dx / dist);
                fy += springF * (dy / dist);
              }
            }
          });

          // Accelerations: a = F / m
          const ax = fx / b.mass;
          const ay = fy / b.mass;

          b.vx += ax * dt;
          b.vy += ay * dt;

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Floor / bounds collision
          if (b.y > 330) {
            b.y = 330;
            b.vy = -b.vy * 0.6;
          }
        });

        // Record trajectory trail for moving bob
        const activeBob = bodies.find((b) => !b.isStatic);
        if (activeBob) {
          state.trail.push({ x: activeBob.x, y: activeBob.y, alpha: 1.0 });
          if (state.trail.length > 50) state.trail.shift();
        }

        setSimTime((t) => t + dt);
      }

      // Render on Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          ctx.fillStyle = themedColor('#18181b');
          ctx.fillRect(0, 0, width, height);

          // Draw ground line
          ctx.strokeStyle = themedColor('#27272a');
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(20, 335);
          ctx.lineTo(width - 20, 335);
          ctx.stroke();

          // Draw trajectory trail
          const trail = stateRef.current.trail;
          for (let i = 0; i < trail.length; i++) {
            ctx.fillStyle = themedColor(`rgba(168, 85, 247, ${((i + 1) / trail.length) * 0.4})`);
            ctx.beginPath();
            ctx.arc(trail[i].x, trail[i].y, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Springs / Constraints
          spec.constraints.forEach((c) => {
            const bodyA = stateRef.current.bodies.find((x) => x.id === c.bodyA);
            const bodyB = stateRef.current.bodies.find((x) => x.id === c.bodyB);
            if (bodyA && bodyB) {
              if (c.type === 'spring') {
                // Coiled spring drawing
                ctx.strokeStyle = themedColor('#a1a1aa');
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(bodyA.x, bodyA.y);

                const coils = 12;
                const dx = bodyB.x - bodyA.x;
                const dy = bodyB.y - bodyA.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len;
                const uy = dy / len;
                const perpX = -uy * 10;
                const perpY = ux * 10;

                for (let i = 1; i <= coils; i++) {
                  const t = i / (coils + 1);
                  const sign = i % 2 === 0 ? 1 : -1;
                  const cx = bodyA.x + ux * len * t + perpX * sign;
                  const cy = bodyA.y + uy * len * t + perpY * sign;
                  ctx.lineTo(cx, cy);
                }
                ctx.lineTo(bodyB.x, bodyB.y);
                ctx.stroke();
              } else {
                // Rod
                ctx.strokeStyle = themedColor('#71717a');
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(bodyA.x, bodyA.y);
                ctx.lineTo(bodyB.x, bodyB.y);
                ctx.stroke();
              }
            }
          });

          // Draw Bodies
          stateRef.current.bodies.forEach((b) => {
            if (b.isStatic) {
              // Ceiling mount
              ctx.fillStyle = themedColor('#3f3f46');
              ctx.fillRect(b.x - 70, b.y - 10, 140, 20);
              ctx.strokeStyle = themedColor('#71717a');
              ctx.strokeRect(b.x - 70, b.y - 10, 140, 20);
            } else {
              // Dynamic bob
              ctx.fillStyle = themedColor(b.color);
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = themedColor('#ffffff');
              ctx.lineWidth = 2;
              ctx.stroke();

              // Mass Label
              if (b.label) {
                ctx.fillStyle = contrastText(themedColor(b.color));
                ctx.font = '10px JetBrains Mono';
                ctx.fillText(b.label, b.x + b.radius + 6, b.y + 4);
              }

              // Draw Velocity Vector (Green)
              if (spec.showVectors?.velocity) {
                ctx.strokeStyle = themedColor('#22c55e');
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x + b.vx * 0.4, b.y + b.vy * 0.4);
                ctx.stroke();
              }

              // Draw Force Vector (Red)
              if (spec.showVectors?.force) {
                ctx.strokeStyle = themedColor('#ef4444');
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x, b.y + gravityVal * 3);
                ctx.stroke();
              }
            }
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [theme.id, isPlaying, speedMultiplier, gravityVal, stiffnessVal, dampingVal, spec]);

  // Mouse drag handlers to pull the physical mass
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find clicked non-static body
    const hit = stateRef.current.bodies.find((b) => {
      if (b.isStatic) return false;
      const dist = Math.hypot(b.x - mx, b.y - my);
      return dist <= b.radius + 10;
    });

    if (hit) {
      isDraggingRef.current = true;
      dragTargetRef.current = hit.id;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragTargetRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const b = stateRef.current.bodies.find((x) => x.id === dragTargetRef.current);
    if (b) {
      b.x = mx;
      b.y = my;
      b.vx = 0;
      b.vy = 0;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragTargetRef.current = null;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-lg overflow-hidden border border-obsidian-border">
      {/* Physics HUD & Playback Control Strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-obsidian-surface border-b border-obsidian-border text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-obsidian-border hover:bg-obsidian-active text-zinc-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-green-400" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={resetSimulation}
            className="p-1 rounded bg-obsidian-border hover:bg-obsidian-active text-zinc-300 transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSpeedMultiplier((s) => (s === 1 ? 0.4 : s === 0.4 ? 1.5 : 1))}
            className="px-2 py-1 rounded bg-obsidian-border hover:bg-obsidian-active text-zinc-300 font-mono text-[11px]"
            title="Cycle Speed"
          >
            {speedMultiplier}x Speed
          </button>

          <span className="text-zinc-400 font-mono ml-2">
            t: <strong className="text-zinc-200">{simTime.toFixed(1)}s</strong>
          </span>
        </div>

        {/* Vector Indicators */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-2 h-0.5 bg-green-500 inline-block"></span>
            Velocity (v)
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-0.5 bg-red-500 inline-block"></span>
            Gravity Force (F)
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
            Trajectory
          </span>
        </div>
      </div>

      {/* Physics Canvas */}
      <div className="relative flex-1 w-full min-h-[340px]">
        <canvas
          ref={canvasRef}
          width={580}
          height={350}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />
        <div className="absolute bottom-2 left-3 text-[11px] text-zinc-500 pointer-events-none font-mono">
          Interactive: Click & drag mass to pull spring
        </div>
      </div>
    </div>
  );
};
