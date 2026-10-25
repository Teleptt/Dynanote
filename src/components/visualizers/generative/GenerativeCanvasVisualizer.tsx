import React from 'react';
import { GenerativeCanvasSpec } from '../../../types';
// Legacy notes remain readable, but arbitrary generated scripts never execute.
export const GenerativeCanvasVisualizer: React.FC<{ spec: GenerativeCanvasSpec; paramValues?: Record<string, number>; onParamChange?: (id: string, value: number) => void }> = () => (
  <div role="status" className="p-6 text-sm text-amber-200">Script-based simulations have been retired for safety. Your saved specification is preserved. Generate a math plot, 3D surface, or annotated diagram instead.</div>
);
