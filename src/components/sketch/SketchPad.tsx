import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Trash2, Undo, PenTool, Eraser, Check, X } from 'lucide-react';

interface SketchPadProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateSketch: (base64Image: string, prompt?: string) => void;
  isSimulating?: boolean;
}

export const SketchPad: React.FC<SketchPadProps> = ({
  isOpen,
  onClose,
  onSimulateSketch,
  isSimulating = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#ffffff');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [instructions, setInstructions] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill dark background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = mode === 'eraser' ? '#18181b' : color;
    ctx.lineWidth = mode === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSimulate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL('image/png');
    onSimulateSketch(base64, instructions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-obsidian-surface border border-obsidian-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-obsidian-sidebar border-b border-obsidian-border">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Multimodal Digital Sketch Pad</h3>
            <span className="text-[11px] text-zinc-400 font-mono">Draw a circuit, pendulum, reaction, or curve</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-obsidian-hover text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-obsidian-border text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('pen')}
              className={`p-1.5 rounded transition-colors ${
                mode === 'pen' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Pen"
            >
              <PenTool className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={`p-1.5 rounded transition-colors ${
                mode === 'eraser' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </button>

            {/* Colors */}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-700">
              {['#ffffff', '#38bdf8', '#fbbf24', '#f43f5e', '#a855f7', '#22c55e'].map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setMode('pen'); }}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    color === c && mode === 'pen' ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Line width */}
            <div className="flex items-center gap-1.5 ml-3 pl-2 border-l border-zinc-700">
              <span className="text-zinc-400 text-[11px]">Size:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-16 accent-purple-500 cursor-pointer h-1 bg-zinc-700 rounded"
              />
            </div>
          </div>

          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Clear</span>
          </button>
        </div>

        {/* Drawing Canvas Area */}
        <div className="relative flex items-center justify-center p-3 bg-zinc-950">
          <canvas
            ref={canvasRef}
            width={600}
            height={340}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="border border-zinc-800 rounded-lg cursor-crosshair shadow-inner"
          />
        </div>

        {/* Bottom Action Footer */}
        <div className="p-3 bg-obsidian-sidebar border-t border-obsidian-border flex items-center gap-3">
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Optional prompt (e.g. 'Turn this into an RLC circuit with animated current flow')..."
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-obsidian-border text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Translating Sketch...' : 'Simulate Sketch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
