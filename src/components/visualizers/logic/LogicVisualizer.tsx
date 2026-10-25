import { themedColor, contrastText } from '../../../theme/themes';
import { useTheme } from '../../../theme/useTheme';
import React, { useState, useMemo } from 'react';
import { LogicGateSpec, LogicGateType } from '../../../types';
import { Cpu, Table2 } from 'lucide-react';

interface LogicVisualizerProps {
  spec: LogicGateSpec;
  paramValues?: Record<string, number>;
  onParamChange?: (id: string, val: number) => void;
}

export const LogicVisualizer: React.FC<LogicVisualizerProps> = ({ spec }) => {
  const { theme } = useTheme();
  // Store dynamic input switch states (0 or 1)
  const [inputStates, setInputStates] = useState<Record<string, 0 | 1>>(() => {
    const initial: Record<string, 0 | 1> = {};
    spec.inputs?.forEach((inp) => {
      initial[inp.id] = inp.initialValue ?? 0;
    });
    return initial;
  });

  const [showTruthTable, setShowTruthTable] = useState<boolean>(true);

  const toggleInput = (id: string) => {
    setInputStates((prev) => ({
      ...prev,
      [id]: prev[id] === 1 ? 0 : 1
    }));
  };

  // Evaluate logic propagation
  const { nodeValues, wireStates } = useMemo(() => {
    const values: Record<string, 0 | 1> = { ...inputStates };
    const wires: Record<string, 0 | 1> = {};

    // Evaluate gates (multiple passes for multi-stage cascades)
    const gates = spec.gates || [];
    for (let pass = 0; pass < gates.length + 1; pass++) {
      for (const gate of gates) {
        // Collect inputs to this gate
        const inWires = (spec.wires || []).filter((w) => w.toId === gate.id);
        const inVals = inWires.map((w) => values[w.fromId] ?? 0);

        let outVal: 0 | 1 = 0;
        const a = inVals[0] ?? 0;
        const b = inVals[1] ?? 0;

        switch (gate.type) {
          case 'AND':
            outVal = a === 1 && b === 1 ? 1 : 0;
            break;
          case 'OR':
            outVal = a === 1 || b === 1 ? 1 : 0;
            break;
          case 'NOT':
            outVal = a === 1 ? 0 : 1;
            break;
          case 'XOR':
            outVal = a !== b ? 1 : 0;
            break;
          case 'NAND':
            outVal = !(a === 1 && b === 1) ? 1 : 0;
            break;
          case 'NOR':
            outVal = !(a === 1 || b === 1) ? 1 : 0;
            break;
          case 'XNOR':
            outVal = a === b ? 1 : 0;
            break;
          case 'BUFFER':
          default:
            outVal = a;
            break;
        }

        values[gate.id] = outVal;
      }
    }

    // Set wire states
    (spec.wires || []).forEach((w) => {
      wires[w.id] = values[w.fromId] ?? 0;
    });

    // Evaluate outputs
    (spec.outputs || []).forEach((out) => {
      const srcId = out.fromGateId || out.fromInputId;
      if (srcId && values[srcId] !== undefined) {
        values[out.id] = values[srcId];
      }
    });

    return { nodeValues: values, wireStates: wires };
  }, [inputStates, spec]);

  // Render SVG gate shapes
  const renderGateShape = (type: LogicGateType, x: number, y: number) => {
    switch (type) {
      case 'AND':
        return (
          <path
            d={`M ${x - 24} ${y - 20} L ${x - 4} ${y - 20} A 20 20 0 0 1 ${x - 4} ${y + 20} L ${x - 24} ${y + 20} Z`}
            fill={themedColor('#1e1b4b')}
            stroke={themedColor('#818cf8')}
            strokeWidth="2"
          />
        );
      case 'OR':
        return (
          <path
            d={`M ${x - 24} ${y - 20} Q ${x - 4} ${y - 18} ${x + 16} ${y} Q ${x - 4} ${y + 18} ${x - 24} ${y + 20} Q ${x - 14} ${y} ${x - 24} ${y - 20} Z`}
            fill={themedColor('#1e1b4b')}
            stroke={themedColor('#a855f7')}
            strokeWidth="2"
          />
        );
      case 'XOR':
        return (
          <g>
            <path
              d={`M ${x - 28} ${y - 20} Q ${x - 18} ${y} ${x - 28} ${y + 20}`}
              fill="none"
              stroke={themedColor('#ec4899')}
              strokeWidth="2"
            />
            <path
              d={`M ${x - 22} ${y - 20} Q ${x - 2} ${y - 18} ${x + 18} ${y} Q ${x - 2} ${y + 18} ${x - 22} ${y + 20} Q ${x - 12} ${y} ${x - 22} ${y - 20} Z`}
              fill={themedColor('#1e1b4b')}
              stroke={themedColor('#ec4899')}
              strokeWidth="2"
            />
          </g>
        );
      case 'NOT':
        return (
          <g>
            <polygon points={`${x - 20},${y - 18} ${x + 12},${y} ${x - 20},${y + 18}`} fill={themedColor('#1e1b4b')} stroke={themedColor('#38bdf8')} strokeWidth="2" />
            <circle cx={x + 16} cy={y} r="4" fill={themedColor('#0f172a')} stroke={themedColor('#38bdf8')} strokeWidth="2" />
          </g>
        );
      case 'NAND':
        return (
          <g>
            <path
              d={`M ${x - 24} ${y - 20} L ${x - 6} ${y - 20} A 20 20 0 0 1 ${x - 6} ${y + 20} L ${x - 24} ${y + 20} Z`}
              fill={themedColor('#1e1b4b')}
              stroke={themedColor('#f59e0b')}
              strokeWidth="2"
            />
            <circle cx={x + 18} cy={y} r="4" fill={themedColor('#0f172a')} stroke={themedColor('#f59e0b')} strokeWidth="2" />
          </g>
        );
      default:
        return <rect x={x - 20} y={y - 18} width={40} height={36} rx={4} fill={themedColor('#1e1b4b')} stroke={themedColor('#a855f7')} strokeWidth="2" />;
    }
  };

  const getPosition = (id: string): { x: number; y: number } => {
    const inp = spec.inputs?.find((i) => i.id === id);
    if (inp) return inp.pos;
    const gate = spec.gates?.find((g) => g.id === id);
    if (gate) return { x: gate.pos.x + 16, y: gate.pos.y };
    const out = spec.outputs?.find((o) => o.id === id);
    if (out) return out.pos;
    return { x: 0, y: 0 };
  };

  return (
    <div className="w-full flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 p-4 select-none">
      {/* Logic Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono font-semibold uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-amber-400" /> Digital Logic
          </span>
          <span className="font-semibold text-zinc-100">{spec.title}</span>
        </div>

        <button
          onClick={() => setShowTruthTable(!showTruthTable)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors border ${
            showTruthTable ? 'bg-purple-950 border-purple-700 text-purple-200' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          <Table2 className="w-3 h-3 text-purple-400" />
          <span>Truth Table</span>
        </button>
      </div>

      {/* Main SVG Schematic Canvas */}
      <div className="w-full h-72 relative flex items-center justify-center p-2">
        <svg className="w-full h-full" viewBox="0 0 560 260">
          {/* Grid background dots */}
          <pattern id="logic-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={themedColor('#1f2937')} />
          </pattern>
          <rect width="100%" height="100%" fill="url(#logic-grid)" opacity="0.6" />

          {/* Wires */}
          {spec.wires?.map((wire) => {
            const start = getPosition(wire.fromId);
            const end = getPosition(wire.toId);
            const isHigh = wireStates[wire.id] === 1;

            return (
              <g key={wire.id}>
                <path
                  d={`M ${start.x} ${start.y} C ${start.x + 40} ${start.y}, ${end.x - 40} ${end.y}, ${end.x} ${end.y}`}
                  fill="none"
                  stroke={isHigh ? themedColor('#10b981') : themedColor('#374151')}
                  strokeWidth={isHigh ? '3' : '2'}
                  className="transition-colors duration-200"
                />
              </g>
            );
          })}

          {/* Logic Gates */}
          {spec.gates?.map((gate) => (
            <g key={gate.id}>
              {renderGateShape(gate.type, gate.pos.x, gate.pos.y)}
              <text
                x={gate.pos.x - 6}
                y={gate.pos.y + 4}
                textAnchor="middle"
                fill={themedColor('#e2e8f0')}
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {gate.label || gate.type}
              </text>
            </g>
          ))}

          {/* Input Switches (Interactive click targets) */}
          {spec.inputs?.map((inp) => {
            const val = inputStates[inp.id] ?? 0;
            const isHigh = val === 1;

            return (
              <g
                key={inp.id}
                onClick={() => toggleInput(inp.id)}
                className="cursor-pointer group/switch"
              >
                <circle
                  cx={inp.pos.x}
                  cy={inp.pos.y}
                  r="14"
                  fill={isHigh ? themedColor('#065f46') : themedColor('#1f2937')}
                  stroke={isHigh ? themedColor('#10b981') : themedColor('#6b7280')}
                  strokeWidth="2"
                  className="transition-all group-hover/switch:scale-110"
                />
                <text
                  x={inp.pos.x}
                  y={inp.pos.y + 4}
                  textAnchor="middle"
                  fill={themedColor('#ffffff')}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {val}
                </text>
                <text
                  x={inp.pos.x - 22}
                  y={inp.pos.y + 4}
                  textAnchor="end"
                  fill={themedColor('#9ca3af')}
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {inp.label}
                </text>
              </g>
            );
          })}

          {/* Output LEDs */}
          {spec.outputs?.map((out) => {
            const val = nodeValues[out.id] ?? 0;
            const isHigh = val === 1;

            return (
              <g key={out.id}>
                {/* Glowing aura */}
                {isHigh && (
                  <circle cx={out.pos.x} cy={out.pos.y} r="18" fill={themedColor('#10b981')} opacity="0.3" className="animate-pulse" />
                )}
                <circle
                  cx={out.pos.x}
                  cy={out.pos.y}
                  r="12"
                  fill={isHigh ? themedColor('#10b981') : themedColor('#1e293b')}
                  stroke={isHigh ? themedColor('#34d399') : themedColor('#475569')}
                  strokeWidth="2"
                />
                <text
                  x={out.pos.x}
                  y={out.pos.y + 4}
                  textAnchor="middle"
                  fill={themedColor('#ffffff')}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {val}
                </text>
                <text
                  x={out.pos.x + 20}
                  y={out.pos.y + 4}
                  textAnchor="start"
                  fill={themedColor('#e2e8f0')}
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {out.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Truth Table Drawer */}
      {showTruthTable && spec.truthTable && spec.truthTable.length > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] font-mono overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                {Object.keys(spec.truthTable[0].inputs).map((k) => (
                  <th key={k} className="py-1 px-2">{k}</th>
                ))}
                <th className="py-1 px-1 text-zinc-600">|</th>
                {Object.keys(spec.truthTable[0].outputs).map((k) => (
                  <th key={k} className="py-1 px-2 text-purple-300 font-bold">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.truthTable.map((row, rIdx) => {
                // Check if current row matches current input switch combination
                const isCurrentActive = Object.entries(row.inputs).every(
                  ([k, v]) => inputStates[k] === v
                );

                return (
                  <tr
                    key={rIdx}
                    className={`transition-colors ${
                      isCurrentActive
                        ? 'bg-purple-950/80 text-purple-200 font-bold ring-1 ring-purple-600 rounded'
                        : 'text-zinc-400 hover:bg-zinc-900/60'
                    }`}
                  >
                    {Object.values(row.inputs).map((v, iIdx) => (
                      <td key={iIdx} className="py-0.5 px-2">{v}</td>
                    ))}
                    <td className="py-0.5 px-1 text-zinc-700">|</td>
                    {Object.values(row.outputs).map((v, oIdx) => (
                      <td key={oIdx} className={`py-0.5 px-2 ${v === 1 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Helper text */}
      <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>Click input circles (0/1) to toggle binary inputs and observe signal flow.</span>
      </div>
    </div>
  );
};
