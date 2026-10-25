import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import { compileExpression, CompiledExpression } from '../../../lib/expression';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MathPlotSpec } from '../../../types';

interface MathVisualizerProps {
  spec: MathPlotSpec;
  paramValues: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const MathVisualizer: React.FC<MathVisualizerProps> = ({ spec, paramValues, onParamChange }) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);

  // Compile each plotted expression once; invalid ones evaluate to NaN.
  const compiled = useMemo(() => {
    const map = new Map<string, CompiledExpression | null>();
    for (const fn of spec.functions || []) {
      if (map.has(fn.expression)) continue;
      try { map.set(fn.expression, compileExpression(fn.expression)); } catch { map.set(fn.expression, null); }
    }
    return map;
  }, [spec.functions]);

  // Evaluate math expression with parameter bindings
  const evaluateExpr = (expr: string, x: number): number => {
    try {
      const fn = compiled.get(expr);
      if (!fn) return NaN;
      const res = fn({ ...paramValues, x });
      return typeof res === 'number' && !isNaN(res) && isFinite(res) ? res : NaN;
    } catch (e) {
      return NaN;
    }
  };

  const bounds = spec.bounds || { xMin: -5, xMax: 5, yMin: -3, yMax: 3 };

  // Calculate numerical derivative for tangent
  const getDerivative = (expr: string, x: number): number => {
    const h = 0.0001;
    return (evaluateExpr(expr, x + h) - evaluateExpr(expr, x - h)) / (2 * h);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = themedColor('#18181b');
    ctx.fillRect(0, 0, width, height);

    // Coordinate transforms
    const toScreenX = (x: number) => ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width;
    const toScreenY = (y: number) => height - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * height;
    const toMathX = (px: number) => bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
    const toMathY = (py: number) => bounds.yMin + ((height - py) / height) * (bounds.yMax - bounds.yMin);

    // Draw Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = themedColor('#27272a');
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = themedColor('#71717a');

    const xStep = Math.max(1, Math.round((bounds.xMax - bounds.xMin) / 10));
    const yStep = Math.max(1, Math.round((bounds.yMax - bounds.yMin) / 8));

    for (let x = Math.ceil(bounds.xMin); x <= bounds.xMax; x += xStep) {
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
      ctx.fillText(x.toString(), sx + 3, height - 6);
    }

    for (let y = Math.ceil(bounds.yMin); y <= bounds.yMax; y += yStep) {
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
      if (y !== 0) ctx.fillText(y.toString(), 6, sy - 3);
    }

    // Draw Axes
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = themedColor('#52525b');
    const originX = toScreenX(0);
    const originY = toScreenY(0);

    // X Axis
    if (originY >= 0 && originY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();
    }

    // Y Axis
    if (originX >= 0 && originX <= width) {
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();
    }

    // Draw Riemann Sum rectangles if enabled
    if (spec.calculus?.showIntegral && spec.functions.length > 0) {
      const primaryFn = spec.functions[0];
      const a = spec.calculus.integralA ?? 0;
      const b = spec.calculus.integralB ?? 3;
      const n = spec.calculus.integralPartitions ?? 15;
      const dx = (b - a) / n;

      ctx.fillStyle = themedColor('rgba(124, 58, 237, 0.22)');
      ctx.strokeStyle = themedColor('rgba(124, 58, 237, 0.6)');
      ctx.lineWidth = 1;

      for (let i = 0; i < n; i++) {
        const xi = a + i * dx;
        const yi = evaluateExpr(primaryFn.expression, xi + dx / 2); // Midpoint Riemann
        const rx = toScreenX(xi);
        const rw = toScreenX(xi + dx) - rx;
        const ry = toScreenY(Math.max(0, yi));
        const rZero = toScreenY(0);
        const rh = Math.abs(rZero - toScreenY(yi));

        ctx.fillRect(rx, Math.min(ry, rZero), rw, rh);
        ctx.strokeRect(rx, Math.min(ry, rZero), rw, rh);
      }
    }

    // Plot functions
    spec.functions.forEach((fn) => {
      ctx.strokeStyle = themedColor(fn.color);
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const stepPx = 2;
      let first = true;

      for (let px = 0; px <= width; px += stepPx) {
        const mx = toMathX(px);
        const my = evaluateExpr(fn.expression, mx);
        if (!Number.isFinite(my)) { first = true; continue; }
        const py = toScreenY(my);

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          // Clamp extreme values to prevent canvas artifacting
          if (py > -100 && py < height + 100) {
            ctx.lineTo(px, py);
          } else {
            ctx.moveTo(px, py);
          }
        }
      }
      ctx.stroke();
    });

    // Tangent line at tangentX
    const activeTangentX = paramValues['tangentX'] ?? spec.calculus?.tangentX ?? 1.5;
    if (spec.calculus?.showTangent && spec.functions.length > 0) {
      const primaryFn = spec.functions[0];
      const y0 = evaluateExpr(primaryFn.expression, activeTangentX);
      const slope = getDerivative(primaryFn.expression, activeTangentX);

      const tanLength = 2.5;
      const x1 = activeTangentX - tanLength;
      const y1 = y0 - slope * tanLength;
      const x2 = activeTangentX + tanLength;
      const y2 = y0 + slope * tanLength;

      ctx.strokeStyle = themedColor('#ef4444');
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(x1), toScreenY(y1));
      ctx.lineTo(toScreenX(x2), toScreenY(y2));
      ctx.stroke();
      ctx.setLineDash([]);

      // Point of tangency dot
      const sx0 = toScreenX(activeTangentX);
      const sy0 = toScreenY(y0);
      ctx.fillStyle = themedColor('#ef4444');
      ctx.beginPath();
      ctx.arc(sx0, sy0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label slope
      ctx.fillStyle = themedColor('#fca5a5');
      ctx.font = '11px JetBrains Mono';
      ctx.fillText(`m = dy/dx = ${slope.toFixed(2)}`, sx0 + 8, sy0 - 8);
    }

    // Hovered point tracker
    if (hoveredPoint) {
      ctx.strokeStyle = themedColor('rgba(255,255,255,0.2)');
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoveredPoint.x, 0);
      ctx.lineTo(hoveredPoint.x, height);
      ctx.moveTo(0, hoveredPoint.y);
      ctx.lineTo(width, hoveredPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const mathX = toMathX(hoveredPoint.x);
      const mathY = toMathY(hoveredPoint.y);
      ctx.fillStyle = themedColor('#e4e4e7');
      ctx.font = '11px JetBrains Mono';
      ctx.fillText(`(x: ${mathX.toFixed(2)}, y: ${mathY.toFixed(2)})`, hoveredPoint.x + 8, hoveredPoint.y - 8);
    }
  }, [theme.id, spec, paramValues, hoveredPoint, bounds]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoveredPoint({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-lg overflow-hidden border border-obsidian-border">
      {/* Legend & Calculus Pills */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-obsidian-surface border-b border-obsidian-border text-xs">
        {spec.functions.map((fn) => (
          <div key={fn.id} className="flex items-center gap-1.5 font-mono">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: themedColor(fn.color) }} />
            <span className="text-zinc-200">{fn.label || fn.expression}</span>
          </div>
        ))}
        {spec.calculus?.showTangent && (
          <span className="ml-auto flex items-center gap-1 text-red-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            Tangent Line
          </span>
        )}
        {spec.calculus?.showIntegral && (
          <span className="flex items-center gap-1 text-purple-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
            Riemann Sum (Area)
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-[300px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
};
