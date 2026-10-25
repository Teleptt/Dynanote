import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import { compileExpression } from '../../../lib/expression';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ThreeDGraphSpec } from '../../../types';
import { RotateCw, ZoomIn, ZoomOut, Maximize2, Sparkles, Layers, Eye } from 'lucide-react';

interface ThreeDVisualizerProps {
  spec: ThreeDGraphSpec;
  paramValues?: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

// Colormap color interpolators
function getColormapColor(val01: number, map: string = 'viridis'): [number, number, number] {
  const t = Math.max(0, Math.min(1, val01));
  switch (map) {
    case 'plasma': {
      // Purple -> Red -> Orange -> Yellow
      const r = Math.floor(255 * (0.05 + 0.95 * Math.pow(t, 0.7)));
      const g = Math.floor(255 * (0.01 + 0.9 * Math.pow(t, 1.6)));
      const b = Math.floor(255 * (0.6 * (1 - t) + 0.4 * Math.sin(t * Math.PI)));
      return [r, g, b];
    }
    case 'coolwarm': {
      // Blue -> White -> Red
      const r = Math.floor(255 * (t < 0.5 ? 2 * t * 0.9 : 0.9 + 0.1 * (t - 0.5) * 2));
      const g = Math.floor(255 * (t < 0.5 ? 0.3 + 1.4 * t : 1.0 - 1.4 * (t - 0.5)));
      const b = Math.floor(255 * (t < 0.5 ? 0.9 - 0.2 * t : 0.8 * (1 - (t - 0.5) * 2)));
      return [r, g, b];
    }
    case 'neon': {
      // Magenta -> Cyan -> Electric Green
      const r = Math.floor(255 * (0.8 * (1 - t) + 0.2 * Math.sin(t * Math.PI)));
      const g = Math.floor(255 * (0.2 + 0.8 * t));
      const b = Math.floor(255 * (0.9 * (1 - Math.abs(t - 0.5) * 2) + 0.5 * (1 - t)));
      return [r, g, b];
    }
    case 'viridis':
    default: {
      // Deep Purple -> Teal -> Vibrant Yellow/Green
      const r = Math.floor(255 * (0.28 + 0.65 * Math.pow(t, 2.0)));
      const g = Math.floor(255 * (0.15 + 0.75 * Math.pow(t, 0.9)));
      const b = Math.floor(255 * (0.45 * (1 - t) + 0.5 * Math.sin(t * Math.PI)));
      return [r, g, b];
    }
  }
}

export const ThreeDVisualizer: React.FC<ThreeDVisualizerProps> = ({
  spec,
  paramValues = {}
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // OrbitControls Camera State
  const [pitch, setPitch] = useState<number>(spec.camera?.pitch ?? 0.65); // elevation angle
  const [yaw, setYaw] = useState<number>(spec.camera?.yaw ?? 0.85);     // azimuth angle
  const [zoom, setZoom] = useState<number>(spec.camera?.zoom ?? 1.15);
  const [autoRotate, setAutoRotate] = useState<boolean>(spec.camera?.autoRotate ?? true);
  const [shadingMode, setShadingMode] = useState<'shaded' | 'wireframe' | 'both'>('both');
  const [showContours, setShowContours] = useState<boolean>(spec.surface?.showContours ?? true);

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animTimeRef = useRef<number>(0);

  // Safe Math Function compiler
  const evalSurfaceFn = useMemo(() => {
    if (!spec.surface?.equation) {
      return (x: number, y: number, p: Record<string, number>, t: number) =>
        Math.sin(Math.hypot(x, y) * (p.a || 1.8) - t) * (p.b || 1.2);
    }

    try {
      const surface = compileExpression(spec.surface.equation);
      return (x: number, y: number, p: Record<string, number>, t: number) => surface({ a: 1, b: 1, c: 1, ...p, x, y, t });
    } catch (e) {
      console.warn('Failed to compile 3D surface equation:', e);
      return (x: number, y: number) => Math.sin(Math.hypot(x, y));
    }
  }, [spec.surface?.equation]);

  // Safe Parametric Curve compiler
  const evalCurveFn = useMemo(() => {
    if (!spec.curve?.expressionX || !spec.curve?.expressionY || !spec.curve?.expressionZ) {
      return null;
    }
    try {
      const [cx, cy, cz] = [spec.curve.expressionX, spec.curve.expressionY, spec.curve.expressionZ].map(compileExpression);
      const fnX = (t: number) => cx({ t });
      const fnY = (t: number) => cy({ t });
      const fnZ = (t: number) => cz({ t });
      return { fnX, fnY, fnZ };
    } catch (e) {
      return null;
    }
  }, [spec.curve?.expressionX, spec.curve?.expressionY, spec.curve?.expressionZ]);

  // Mouse drag handlers for OrbitControls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false); // Disable auto-rotate on manual interaction
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setYaw((prev) => prev + dx * 0.008);
    setPitch((prev) => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev + dy * 0.008)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.max(0.4, Math.min(3.5, prev + delta)));
  };

  // 60 FPS 3D Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      animTimeRef.current += dt;

      if (autoRotate && !isDraggingRef.current) {
        setYaw((y) => y + 0.006);
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Clear Canvas with rich dark slate background
      ctx.fillStyle = themedColor('#060a17');
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient stars / grid background
      ctx.strokeStyle = themedColor('#1e293b22');
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }

      // 3D Matrix Projection Transform
      // Rotation matrices:
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const focalLength = 550;
      const baseScale = 85 * zoom;

      const project3D = (x: number, y: number, z: number): { px: number; py: number; depth: number } => {
        // Rotate around Y axis (Yaw)
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        // Rotate around X axis (Pitch)
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        // Perspective camera distance
        const cameraDist = 450;
        const depth = z2 + cameraDist;
        const factor = focalLength / Math.max(20, depth);

        return {
          px: cx + x1 * baseScale * factor * 0.012,
          py: cy - y2 * baseScale * factor * 0.012,
          depth
        };
      };

      // 1. Draw 3D Coordinate Bounding Box & Axes
      const boxSize = 2.4;
      const origin = project3D(0, 0, 0);
      const axisX = project3D(boxSize * 1.2, 0, 0);
      const axisY = project3D(0, boxSize * 1.2, 0);
      const axisZ = project3D(0, 0, boxSize * 1.2);

      // Coordinate axes
      ctx.lineWidth = 1.5;
      // X-Axis (Red/Rose)
      ctx.strokeStyle = themedColor('#f43f5e');
      ctx.beginPath(); ctx.moveTo(origin.px, origin.py); ctx.lineTo(axisX.px, axisX.py); ctx.stroke();
      // Y-Axis (Emerald)
      ctx.strokeStyle = themedColor('#10b981');
      ctx.beginPath(); ctx.moveTo(origin.px, origin.py); ctx.lineTo(axisY.px, axisY.py); ctx.stroke();
      // Z-Axis (Sky Blue)
      ctx.strokeStyle = themedColor('#38bdf8');
      ctx.beginPath(); ctx.moveTo(origin.px, origin.py); ctx.lineTo(axisZ.px, axisZ.py); ctx.stroke();

      // Axis Labels
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = themedColor('#f43f5e'); ctx.fillText('X', axisX.px + 4, axisX.py);
      ctx.fillStyle = themedColor('#10b981'); ctx.fillText('Z (elevation)', axisY.px, axisY.py - 6);
      ctx.fillStyle = themedColor('#38bdf8'); ctx.fillText('Y', axisZ.px + 4, axisZ.py);

      // 2. Render 3D Surface Mesh
      if (spec.graphType === 'surface' || (!spec.graphType && spec.surface)) {
        const xMin = spec.surface?.xRange?.[0] ?? -2.8;
        const xMax = spec.surface?.xRange?.[1] ?? 2.8;
        const yMin = spec.surface?.yRange?.[0] ?? -2.8;
        const yMax = spec.surface?.yRange?.[1] ?? 2.8;
        const res = Math.min(45, spec.surface?.resolution ?? 28);
        const colormap = spec.surface?.colorMap || 'viridis';

        const dx = (xMax - xMin) / res;
        const dy = (yMax - yMin) / res;

        // Sample heights
        const heights: number[][] = [];
        let zMin = Infinity;
        let zMax = -Infinity;

        for (let i = 0; i <= res; i++) {
          heights[i] = [];
          const vx = xMin + i * dx;
          for (let j = 0; j <= res; j++) {
            const vy = yMin + j * dy;
            const z = evalSurfaceFn(vx, vy, paramValues, animTimeRef.current * 0.8);
            heights[i][j] = z;
            if (z < zMin) zMin = z;
            if (z > zMax) zMax = z;
          }
        }

        const zSpan = Math.max(0.001, zMax - zMin);

        // Build Quads with depth for Painter's Algorithm
        interface Quad {
          p0: { px: number; py: number; depth: number };
          p1: { px: number; py: number; depth: number };
          p2: { px: number; py: number; depth: number };
          p3: { px: number; py: number; depth: number };
          avgZ01: number;
          avgDepth: number;
          normalShade: number;
        }

        const quads: Quad[] = [];

        // Directional Light vector in 3D
        const lx = 0.45;
        const ly = 0.8;
        const lz = 0.4;
        const lLen = Math.hypot(lx, ly, lz);

        for (let i = 0; i < res; i++) {
          const x0 = xMin + i * dx;
          const x1 = x0 + dx;
          for (let j = 0; j < res; j++) {
            const y0 = yMin + j * dy;
            const y1 = y0 + dy;

            const z00 = heights[i][j];
            const z10 = heights[i + 1][j];
            const z11 = heights[i + 1][j + 1];
            const z01 = heights[i][j + 1];

            // In our 3D space: x = X, z = Y (depth), y = Z (vertical elevation)
            const p0 = project3D(x0, z00, y0);
            const p1 = project3D(x1, z10, y0);
            const p2 = project3D(x1, z11, y1);
            const p3 = project3D(x0, z01, y1);

            // Approximate surface normal via cross product
            const nx = -(z10 - z00) / dx;
            const ny = 1.0;
            const nz = -(z01 - z00) / dy;
            const nLen = Math.hypot(nx, ny, nz);
            const dot = Math.max(0.15, (nx * lx + ny * ly + nz * lz) / (nLen * lLen));

            const avgH = (z00 + z10 + z11 + z01) / 4;
            const normH = (avgH - zMin) / zSpan;
            const avgD = (p0.depth + p1.depth + p2.depth + p3.depth) / 4;

            quads.push({
              p0,
              p1,
              p2,
              p3,
              avgZ01: normH,
              avgDepth: avgD,
              normalShade: dot
            });
          }
        }

        // Sort quads back to front (Painter's algorithm)
        quads.sort((a, b) => b.avgDepth - a.avgDepth);

        // Render Quads
        quads.forEach((q) => {
          const [rBase, gBase, bBase] = getColormapColor(q.avgZ01, colormap);
          const shade = 0.4 + 0.6 * q.normalShade;
          const r = Math.min(255, Math.floor(rBase * shade));
          const g = Math.min(255, Math.floor(gBase * shade));
          const b = Math.min(255, Math.floor(bBase * shade));

          ctx.beginPath();
          ctx.moveTo(q.p0.px, q.p0.py);
          ctx.lineTo(q.p1.px, q.p1.py);
          ctx.lineTo(q.p2.px, q.p2.py);
          ctx.lineTo(q.p3.px, q.p3.py);
          ctx.closePath();

          if (shadingMode === 'shaded' || shadingMode === 'both') {
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();
          }

          if (shadingMode === 'wireframe' || shadingMode === 'both') {
            ctx.strokeStyle =
              shadingMode === 'both'
                ? `rgba(0, 0, 0, 0.28)`
                : `rgb(${r}, ${g}, ${b})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });

        // 3. Render Projected Contour Rings on Floor Plane
        if (showContours) {
          ctx.lineWidth = 1.2;
          const floorY = zMin - 0.25;
          const numLevels = 6;
          for (let l = 1; l <= numLevels; l++) {
            const targetZ = zMin + (l / (numLevels + 1)) * zSpan;
            const [cr, cg, cb] = getColormapColor(l / (numLevels + 1), colormap);
            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.35)`;

            for (let i = 0; i < res; i += 2) {
              for (let j = 0; j < res; j += 2) {
                if (Math.abs(heights[i][j] - targetZ) < zSpan * 0.12) {
                  const vx = xMin + i * dx;
                  const vy = yMin + j * dy;
                  const pFloor = project3D(vx, floorY, vy);
                  ctx.beginPath();
                  ctx.arc(pFloor.px, pFloor.py, 1.5, 0, Math.PI * 2);
                  ctx.stroke();
                }
              }
            }
          }
        }
      }

      // 4. Render 3D Parametric Space Curve (e.g. Lorenz Attractor / Helix)
      if (spec.graphType === 'curve' || spec.curve) {
        const tMin = spec.curve?.tRange?.[0] ?? 0;
        const tMax = spec.curve?.tRange?.[1] ?? 25;
        const tSteps = spec.curve?.tResolution ?? 350;
        const color = themedColor(spec.curve?.color);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i <= tSteps; i++) {
          const tVal = tMin + (i / tSteps) * (tMax - tMin);
          // Default chaotic flow or user curve
          let cx = Math.sin(tVal * 0.8) * 1.8;
          let cy = Math.cos(tVal * 0.6) * 1.5;
          let cz = (tVal / tMax) * 3 - 1.5;

          if (evalCurveFn) {
            try {
              cx = Number(evalCurveFn.fnX(tVal)) || cx;
              cy = Number(evalCurveFn.fnY(tVal)) || cy;
              cz = Number(evalCurveFn.fnZ(tVal)) || cz;
            } catch (err) {}
          }

          const pt = project3D(cx, cz, cy);
          if (!started) {
            ctx.moveTo(pt.px, pt.py);
            started = true;
          } else {
            ctx.lineTo(pt.px, pt.py);
          }
        }
        ctx.stroke();

        // Animated Trajectory Particle
        const headT = tMin + ((animTimeRef.current * 2.0) % (tMax - tMin));
        let px = Math.sin(headT * 0.8) * 1.8;
        let py = Math.cos(headT * 0.6) * 1.5;
        let pz = (headT / tMax) * 3 - 1.5;
        if (evalCurveFn) {
          try {
            px = Number(evalCurveFn.fnX(headT)) || px;
            py = Number(evalCurveFn.fnY(headT)) || py;
            pz = Number(evalCurveFn.fnZ(headT)) || pz;
          } catch (err) {}
        }
        const headPt = project3D(px, pz, py);

        ctx.fillStyle = themedColor('#f43f5e');
        ctx.beginPath();
        ctx.arc(headPt.px, headPt.py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = themedColor('#ffffff');
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 5. Render 3D Vector Arrows if defined
      if (spec.vectors && spec.vectors.length > 0) {
        spec.vectors.forEach((v) => {
          const o = project3D(v.origin[0], v.origin[2], v.origin[1]);
          const d = project3D(
            v.origin[0] + v.direction[0],
            v.origin[2] + v.direction[2],
            v.origin[1] + v.direction[1]
          );

          ctx.strokeStyle = themedColor(v.color);
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(o.px, o.py);
          ctx.lineTo(d.px, d.py);
          ctx.stroke();

          // Arrowhead
          ctx.fillStyle = themedColor(v.color);
          ctx.beginPath();
          ctx.arc(d.px, d.py, 3.5, 0, Math.PI * 2);
          ctx.fill();

          if (v.label) {
            ctx.fillStyle = themedColor('#e2e8f0');
            ctx.font = '10px sans-serif';
            ctx.fillText(v.label, d.px + 4, d.py - 2);
          }
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [theme.id, pitch, yaw, zoom, autoRotate, shadingMode, showContours, spec, paramValues, evalSurfaceFn]);

  const resetCamera = () => {
    setPitch(0.65);
    setYaw(0.85);
    setZoom(1.15);
    setAutoRotate(true);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950 rounded-xl overflow-hidden select-none border border-zinc-800">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={480}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full max-h-[500px] cursor-grab active:cursor-grabbing block"
      />

      {/* OrbitControls Overlay HUD */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/85 backdrop-blur-md border border-zinc-800 text-xs text-zinc-300 pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-semibold text-zinc-100">{spec.title}</span>
        <span className="text-[10px] font-mono text-zinc-500">
          Pitch: {(pitch * (180 / Math.PI)).toFixed(0)}° | Yaw: {(yaw * (180 / Math.PI)).toFixed(0)}°
        </span>
      </div>

      {/* Interactive Controls Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded flex items-center gap-1 text-[11px] font-medium transition-colors ${
              autoRotate
                ? 'bg-purple-900/70 text-purple-200 border border-purple-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Toggle Cinematic 3D Spin"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>Spin</span>
          </button>

          <button
            onClick={() =>
              setShadingMode((prev) =>
                prev === 'both' ? 'shaded' : prev === 'shaded' ? 'wireframe' : 'both'
              )
            }
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-1 text-[11px]"
            title="Cycle Shading Mode (Solid / Wireframe / Hybrid)"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="capitalize">{shadingMode}</span>
          </button>

          <button
            onClick={() => setShowContours(!showContours)}
            className={`p-1.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
              showContours
                ? 'text-sky-300 bg-sky-950/60 border border-sky-800/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Toggle Contour Rings on Floor"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Contours</span>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-zinc-800 text-zinc-400">
          <button
            onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
            className="p-1 rounded hover:text-white hover:bg-zinc-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            className="p-1 rounded hover:text-white hover:bg-zinc-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetCamera}
            className="p-1 rounded hover:text-white hover:bg-zinc-800 ml-1"
            title="Reset 3D View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
