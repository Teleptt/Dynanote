import { SimulationBoundary } from '../visualizers/SimulationBoundary';
import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import {
  parseMarkdownToBlocks,
  serializeBlocksToMarkdown,
  EditorBlock,
  BlockType
} from '../../lib/markdown-blocks';
import { SimulationSpec } from '../../types';
import { EmbeddedSimulationWidget } from './EmbeddedSimulationWidget';
import {
  Sparkles,
  Plus,
  Trash2,
  Code,
  Sigma,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  List,
  Check,
  Edit2,
  ExternalLink
} from 'lucide-react';

interface LivePreviewEditorProps {
  content: string;
  onChange: (updatedContent: string) => void;
  onVisualizeSelection: (
    selectedText: string,
    options?: { directEmbed?: boolean; targetBlockId?: string }
  ) => void;
  onOpenWorkbench?: (spec: SimulationSpec) => void;
}

export const LivePreviewEditor: React.FC<LivePreviewEditorProps> = ({
  content,
  onChange,
  onVisualizeSelection,
  onOpenWorkbench
}) => {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => parseMarkdownToBlocks(content));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [floatingSelection, setFloatingSelection] = useState<{
    text: string;
    coords: { x: number; y: number } | null;
    targetBlockId?: string;
  }>({ text: '', coords: null });

  // Keep internal blocks in sync when external content changes from note switcher
  const lastContentRef = useRef(content);
  useEffect(() => {
    if (content !== lastContentRef.current) {
      setBlocks(parseMarkdownToBlocks(content));
      lastContentRef.current = content;
    }
  }, [content]);

  // Synchronize block changes back to markdown
  const updateBlocksAndSync = (newBlocks: EditorBlock[]) => {
    setBlocks(newBlocks);
    const serialized = serializeBlocksToMarkdown(newBlocks);
    lastContentRef.current = serialized;
    onChange(serialized);
  };

  const handleBlockContentChange = (id: string, newText: string) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, content: newText } : b));
    updateBlocksAndSync(next);
  };

  const handleBlockTypeChange = (id: string, newType: BlockType) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, type: newType } : b));
    updateBlocksAndSync(next);
  };

  const handleDeleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      updateBlocksAndSync([{ id: `b-${Date.now()}`, type: 'paragraph', content: '' }]);
      return;
    }
    const next = blocks.filter((b) => b.id !== id);
    updateBlocksAndSync(next);
    setActiveBlockId(null);
  };

  const handleAddBlock = (afterId: string, type: BlockType = 'paragraph', initialText = '') => {
    const newBlock: EditorBlock = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      content: initialText
    };
    const index = blocks.findIndex((b) => b.id === afterId);
    const next = [...blocks];
    if (index >= 0) {
      next.splice(index + 1, 0, newBlock);
    } else {
      next.push(newBlock);
    }
    updateBlocksAndSync(next);
    setActiveBlockId(newBlock.id);
  };

  // Listen for text selections across the document to trigger floating AI action menu
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 3) {
      const text = sel.toString().trim();
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Find closest parent block element with data-block-id
        let targetBlockId: string | undefined;
        let node: Node | null = range.startContainer;
        while (node && node !== document.body) {
          if (node instanceof HTMLElement && node.dataset?.blockId) {
            targetBlockId = node.dataset.blockId;
            break;
          }
          node = node.parentNode;
        }

        setFloatingSelection({
          text,
          coords: {
            x: rect.left + rect.width / 2,
            y: rect.top - 8
          },
          targetBlockId
        });
        return;
      } catch (e) {
        // Range bounding box fallback
      }
    }
    setFloatingSelection({ text: '', coords: null });
  };

  // Render inline formatting: $math$, **bold**, *italic*, ***bold italic***, `code`, ~~strike~~, [links](url)
  const renderInlineFormatted = (text: string) => {
    if (!text) return <span className="text-zinc-600 italic">Empty paragraph (click to edit)...</span>;

    // Split paragraphs across newlines so distinct lines stay separated
    const lines = text.split('\n');

    return (
      <div className="space-y-1">
        {lines.map((line, lineIdx) => {
          if (!line.trim() && lines.length > 1) {
            return <div key={lineIdx} className="h-2" />;
          }
          return (
            <div key={lineIdx} className="leading-relaxed">
              {formatInlineTokens(line)}
            </div>
          );
        })}
      </div>
    );
  };

  const formatInlineTokens = (text: string): React.ReactNode => {
    if (!text) return null;

    interface TokenData {
      type: 'math_display' | 'math_inline' | 'code' | 'link' | 'bold_italic' | 'bold' | 'italic' | 'strike';
      content?: string;
      label?: string;
      url?: string;
    }

    const tokens = new Map<string, TokenData>();
    let counter = 0;

    const createToken = (data: TokenData) => {
      const key = `\uE000${counter++}\uE001`;
      tokens.set(key, data);
      return key;
    };

    // 1. Math block ($$ ... $$)
    let processed = text.replace(/\$\$([^\$]+?)\$\$/g, (_, math) =>
      createToken({ type: 'math_display', content: math.trim() })
    );

    // 2. Inline math ($ ... $)
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) =>
      createToken({ type: 'math_inline', content: math.trim() })
    );

    // 3. Inline code (` ... `)
    processed = processed.replace(/`([^`\n]+)`/g, (_, code) =>
      createToken({ type: 'code', content: code })
    );

    // 4. Links [text](url)
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
      createToken({ type: 'link', label, url })
    );

    // 5. Bold & Italic (***...***)
    processed = processed.replace(/\*\*\*([^*]+?)\*\*\*/g, (_, inner) =>
      createToken({ type: 'bold_italic', content: inner })
    );

    // 6. Bold (**...** or __...__)
    processed = processed.replace(/\*\*([^*]+?)\*\*/g, (_, inner) =>
      createToken({ type: 'bold', content: inner })
    );
    processed = processed.replace(/__([^_]+?)__/g, (_, inner) =>
      createToken({ type: 'bold', content: inner })
    );

    // 7. Strikethrough (~~...~~)
    processed = processed.replace(/~~([^~]+?)~~/g, (_, inner) =>
      createToken({ type: 'strike', content: inner })
    );

    // 8. Italic (*...* without spaces inside or word-bounded _..._)
    processed = processed.replace(/(^|[^*])\*([^\s*](?:[^*\n]*?[^\s*])?)\*(?!\*)/g, (_, prefix, inner) =>
      prefix + createToken({ type: 'italic', content: inner })
    );
    processed = processed.replace(/\b_([^_]+?)_\b/g, (_, inner) =>
      createToken({ type: 'italic', content: inner })
    );

    const renderTree = (str: string, parentKey: string = 'root'): React.ReactNode[] => {
      const parts = str.split(/(\uE000\d+\uE001)/g);
      return parts.map((part, pIdx) => {
        const k = `${parentKey}-${pIdx}`;
        if (tokens.has(part)) {
          const tok = tokens.get(part)!;
          switch (tok.type) {
            case 'math_inline': {
              try {
                const html = katex.renderToString(tok.content || '', {
                  displayMode: false,
                  throwOnError: false,
                  output: 'html'
                });
                return (
                  <span
                    key={k}
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="inline-math mx-0.5 px-1 py-0.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-purple-200"
                  />
                );
              } catch (e) {
                return <code key={k} className="text-red-400 font-mono text-xs">${tok.content}$</code>;
              }
            }
            case 'math_display': {
              try {
                const html = katex.renderToString(tok.content || '', {
                  displayMode: true,
                  throwOnError: false,
                  output: 'html'
                });
                return (
                  <div
                    key={k}
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="my-2 py-2 px-3 bg-zinc-900/60 rounded border border-zinc-800 text-center overflow-x-auto text-purple-200"
                  />
                );
              } catch (e) {
                return <div key={k} className="text-red-400 font-mono text-xs my-1">LaTeX Error: ${tok.content}$</div>;
              }
            }
            case 'code':
              return (
                <code key={k} className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-purple-300 font-mono text-xs border border-zinc-700/50">
                  {tok.content}
                </code>
              );
            case 'link':
              return (
                <a
                  key={k}
                  href={tok.url && /^(https?:|mailto:)/i.test(tok.url) ? tok.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
                >
                  {tok.label}
                </a>
              );
            case 'bold_italic':
              return (
                <strong key={k} className="font-bold text-zinc-100 italic">
                  {renderTree(tok.content || '', `${k}-bi`)}
                </strong>
              );
            case 'bold':
              return (
                <strong key={k} className="font-bold text-zinc-100">
                  {renderTree(tok.content || '', `${k}-b`)}
                </strong>
              );
            case 'italic':
              return (
                <em key={k} className="italic text-zinc-300">
                  {renderTree(tok.content || '', `${k}-i`)}
                </em>
              );
            case 'strike':
              return (
                <del key={k} className="line-through text-zinc-500">
                  {renderTree(tok.content || '', `${k}-s`)}
                </del>
              );
            default:
              return <span key={k}>{tok.content}</span>;
          }
        }
        return <span key={k}>{part}</span>;
      });
    };

    return <>{renderTree(processed)}</>;
  };

  // Safe KaTeX display math renderer (output: 'html' eliminates duplicate MathML symbols)
  const renderKaTeXDisplay = (latex: string) => {
    try {
      const html = katex.renderToString(latex.trim() || '\\text{Empty Equation}', {
        displayMode: true,
        throwOnError: false,
        output: 'html'
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (e: any) {
      return (
        <div className="text-red-400 font-mono text-xs p-2 text-center">
          LaTeX Error: {e.message}
        </div>
      );
    }
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      className="relative w-full max-w-4xl mx-auto py-6 px-8 min-h-full flex flex-col gap-2 font-sans select-text"
    >
      {/* Floating Action Menu for highlighted text */}
      {floatingSelection.coords && floatingSelection.text && (
        <div
          style={{
            position: 'fixed',
            left: `${floatingSelection.coords.x}px`,
            top: `${floatingSelection.coords.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
          className="z-50 flex items-center gap-1.5 p-1 bg-zinc-900 border border-purple-500/80 rounded-lg shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => {
              onVisualizeSelection(floatingSelection.text, {
                directEmbed: true,
                targetBlockId: floatingSelection.targetBlockId
              });
              setFloatingSelection({ text: '', coords: null });
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow transition-colors"
            title="Synthesize and embed live interactive simulation directly below selection"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Embed in Note</span>
          </button>
          <button
            onClick={() => {
              onVisualizeSelection(floatingSelection.text, {
                directEmbed: false,
                targetBlockId: floatingSelection.targetBlockId
              });
              setFloatingSelection({ text: '', coords: null });
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700"
            title="Inspect simulation in side-by-side Workbench"
          >
            <span>Workbench</span>
            <ExternalLink className="w-3 h-3 text-purple-400" />
          </button>
        </div>
      )}

      {/* Render Document Blocks */}
      {blocks.map((block) => {
        const isActive = activeBlockId === block.id;

        return (
          <div
            key={block.id}
            data-block-id={block.id}
            className={`group relative rounded-lg transition-all duration-150 ${
              isActive
                ? 'bg-zinc-900/90 ring-1 ring-purple-500/80 p-2 shadow-lg'
                : 'hover:bg-zinc-900/30 p-2'
            }`}
          >
            {/* Block Hover Actions (Delete, Change Type, Add Block) */}
            <div className="absolute right-2 -top-3 hidden group-hover:flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-md px-1.5 py-0.5 shadow z-10 text-[10px] text-zinc-400">
              <button
                onClick={() => handleAddBlock(block.id, 'paragraph')}
                className="hover:text-purple-300 p-0.5"
                title="Add Paragraph Below"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleAddBlock(block.id, 'math_display', 'f(x) = ')}
                className="hover:text-purple-300 p-0.5"
                title="Add Math Equation Below"
              >
                <Sigma className="w-3 h-3" />
              </button>
              <button
                onClick={() =>
                  onVisualizeSelection(block.content, {
                    directEmbed: true,
                    targetBlockId: block.id
                  })
                }
                className="hover:text-purple-300 p-0.5 text-purple-400"
                title="Visualize & Embed for this block"
              >
                <Sparkles className="w-3 h-3" />
              </button>
              <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />
              <button
                onClick={() => handleDeleteBlock(block.id)}
                className="hover:text-red-400 p-0.5"
                title="Delete Block"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* 1. Heading 1 */}
            {block.type === 'h1' && (
              <div>
                {isActive ? (
                  <input
                    type="text"
                    autoFocus
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBlock(block.id, 'paragraph');
                      }
                    }}
                    placeholder="Heading 1..."
                    className="w-full bg-transparent text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  />
                ) : (
                  <h1
                    onClick={() => setActiveBlockId(block.id)}
                    className="text-2xl font-bold text-zinc-100 cursor-pointer tracking-tight"
                  >
                    {block.content ? renderInlineFormatted(block.content) : <span className="text-zinc-600">Heading 1...</span>}
                  </h1>
                )}
              </div>
            )}

            {/* 2. Heading 2 */}
            {block.type === 'h2' && (
              <div>
                {isActive ? (
                  <input
                    type="text"
                    autoFocus
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBlock(block.id, 'paragraph');
                      }
                    }}
                    placeholder="Heading 2..."
                    className="w-full bg-transparent text-xl font-bold text-zinc-100 border-b border-zinc-800 pb-1 placeholder-zinc-600 focus:outline-none"
                  />
                ) : (
                  <h2
                    onClick={() => setActiveBlockId(block.id)}
                    className="text-xl font-bold text-zinc-100 border-b border-zinc-800/80 pb-1 cursor-pointer tracking-tight"
                  >
                    {block.content ? renderInlineFormatted(block.content) : <span className="text-zinc-600">Heading 2...</span>}
                  </h2>
                )}
              </div>
            )}

            {/* 3. Heading 3 */}
            {block.type === 'h3' && (
              <div>
                {isActive ? (
                  <input
                    type="text"
                    autoFocus
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBlock(block.id, 'paragraph');
                      }
                    }}
                    placeholder="Heading 3..."
                    className="w-full bg-transparent text-base font-semibold text-purple-300 placeholder-zinc-600 focus:outline-none"
                  />
                ) : (
                  <h3
                    onClick={() => setActiveBlockId(block.id)}
                    className="text-base font-semibold text-purple-300 cursor-pointer"
                  >
                    {block.content ? renderInlineFormatted(block.content) : <span className="text-zinc-600">Heading 3...</span>}
                  </h3>
                )}
              </div>
            )}

            {/* 4. Display Math Block: $$ ... $$ */}
            {block.type === 'math_display' && (
              <div className="my-1">
                {isActive ? (
                  /* In-Place LaTeX Equation Workbench */
                  <div className="bg-zinc-950 rounded-lg p-3 border border-purple-500/80 shadow-xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800">
                      <span className="font-semibold text-purple-300 flex items-center gap-1.5 font-mono">
                        <Sigma className="w-3.5 h-3.5 text-purple-400" />
                        LaTeX Math Equation
                      </span>
                      <button
                        onClick={() => setActiveBlockId(null)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium text-[11px]"
                      >
                        <Check className="w-3 h-3" /> Done
                      </button>
                    </div>

                    {/* Live equation KaTeX preview */}
                    <div className="py-3 px-4 rounded bg-zinc-900/60 border border-zinc-800 text-center overflow-x-auto min-h-[50px] flex items-center justify-center">
                      {renderKaTeXDisplay(block.content)}
                    </div>

                    {/* LaTeX source input */}
                    <textarea
                      autoFocus
                      rows={2}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          setActiveBlockId(null);
                        }
                      }}
                      placeholder="e.g. \frac{d^2x}{dt^2} + \gamma \frac{dx}{dt} + k x = 0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-500 resize-y"
                    />

                    {/* Quick Math Symbols Insert Buttons */}
                    <div className="flex flex-wrap gap-1 text-[11px] font-mono">
                      {[
                        { label: '\\frac{a}{b}', insert: '\\frac{a}{b}' },
                        { label: '\\int_a^b', insert: '\\int_{a}^{b} f(x) dx' },
                        { label: '\\sqrt{x}', insert: '\\sqrt{x}' },
                        { label: '\\sum', insert: '\\sum_{i=1}^{n}' },
                        { label: '\\sin(x)', insert: '\\sin(x)' },
                        { label: '\\vec{v}', insert: '\\vec{v}' },
                        { label: '\\alpha', insert: '\\alpha' },
                        { label: '\\omega', insert: '\\omega' },
                        { label: '\\partial', insert: '\\frac{\\partial y}{\\partial x}' }
                      ].map((sym) => (
                        <button
                          key={sym.label}
                          type="button"
                          onClick={() => handleBlockContentChange(block.id, `${block.content} ${sym.insert}`)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                        >
                          {sym.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Rendered KaTeX Display Equation */
                  <div
                    onClick={() => setActiveBlockId(block.id)}
                    className="relative group/math py-3 px-4 bg-zinc-950/70 hover:bg-zinc-900/80 rounded-lg border border-zinc-800/80 hover:border-purple-500/60 transition-all cursor-pointer text-center overflow-x-auto shadow-inner"
                    title="Click to edit LaTeX equation"
                  >
                    {renderKaTeXDisplay(block.content)}
                    <span className="absolute right-2 top-2 opacity-0 group-hover/math:opacity-100 transition-opacity text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 flex items-center gap-1">
                      <Edit2 className="w-2.5 h-2.5" /> Edit LaTeX
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 5. Bullet List Item */}
            {block.type === 'list_item' && (
              <div className="flex items-start gap-2 ml-4">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                {isActive ? (
                  <input
                    type="text"
                    autoFocus
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBlock(block.id, 'list_item');
                      }
                    }}
                    className="flex-1 bg-transparent text-sm text-zinc-200 focus:outline-none"
                  />
                ) : (
                  <div
                    onClick={() => setActiveBlockId(block.id)}
                    className="flex-1 text-sm text-zinc-200 cursor-pointer leading-relaxed"
                  >
                    {renderInlineFormatted(block.content)}
                  </div>
                )}
              </div>
            )}

            {/* 6. Code Block */}
            {block.type === 'code' && (
              <div className="my-1">
                {isActive ? (
                  <textarea
                    autoFocus
                    rows={4}
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    className="w-full bg-zinc-950 border border-purple-500 rounded-lg p-3 font-mono text-xs text-purple-200 focus:outline-none resize-y"
                  />
                ) : (
                  <pre
                    onClick={() => setActiveBlockId(block.id)}
                    className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-xs text-purple-300 overflow-x-auto cursor-pointer"
                  >
                    <code>{block.content}</code>
                  </pre>
                )}
              </div>
            )}

            {/* 7. Blockquote */}
            {block.type === 'quote' && (
              <div className="border-l-2 border-purple-500 pl-3 my-1">
                {isActive ? (
                  <input
                    type="text"
                    autoFocus
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    className="w-full bg-transparent text-sm italic text-zinc-300 focus:outline-none"
                  />
                ) : (
                  <blockquote
                    onClick={() => setActiveBlockId(block.id)}
                    className="text-sm italic text-zinc-400 cursor-pointer"
                  >
                    {renderInlineFormatted(block.content)}
                  </blockquote>
                )}
              </div>
            )}

            {/* 8. Embedded Simulation Widget */}
            {block.type === 'simulation_embed' && (
              <SimulationBoundary key={block.content}><EmbeddedSimulationWidget
                content={block.content}
                onUpdateContent={(newJson) => handleBlockContentChange(block.id, newJson)}
                onDelete={() => handleDeleteBlock(block.id)}
                onOpenWorkbench={onOpenWorkbench}
              /></SimulationBoundary>
            )}

            {/* 9. Standard Paragraph (with KaTeX inline math) */}
            {block.type === 'paragraph' && (
              <div>
                {isActive ? (
                  <textarea
                    autoFocus
                    rows={Math.max(2, block.content.split('\n').length)}
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    onBlur={() => setActiveBlockId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddBlock(block.id, 'paragraph');
                      }
                    }}
                    placeholder="Type notes or equations ($f(x) = \dots$)..."
                    className="w-full bg-transparent text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-sans"
                  />
                ) : (
                  <div
                    onClick={() => setActiveBlockId(block.id)}
                    className="text-sm leading-relaxed text-zinc-200 cursor-pointer min-h-[1.5rem]"
                  >
                    {renderInlineFormatted(block.content)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom Quick-Insert Bar */}
      <div className="flex items-center gap-2 pt-6 mt-4 border-t border-obsidian-border/50 text-xs text-zinc-500">
        <span className="font-mono text-[11px] text-zinc-400">Insert Block:</span>
        <button
          onClick={() => handleAddBlock(blocks[blocks.length - 1]?.id || 'b-last', 'paragraph')}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
        >
          <AlignLeft className="w-3 h-3 text-purple-400" />
          <span>Paragraph</span>
        </button>
        <button
          onClick={() => handleAddBlock(blocks[blocks.length - 1]?.id || 'b-last', 'math_display', 'f(x) = ')}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
        >
          <Sigma className="w-3 h-3 text-purple-400" />
          <span>Math Equation ($$)</span>
        </button>
        <button
          onClick={() =>
            onVisualizeSelection('', {
              directEmbed: true,
              targetBlockId: blocks[blocks.length - 1]?.id
            })
          }
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white transition-colors border border-purple-800/80 font-medium"
          title="Synthesize and embed simulation at end of note"
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Visualizer Embed</span>
        </button>
        <button
          onClick={() => handleAddBlock(blocks[blocks.length - 1]?.id || 'b-last', 'h2')}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
        >
          <Heading2 className="w-3 h-3 text-purple-400" />
          <span>Heading</span>
        </button>
        <button
          onClick={() => handleAddBlock(blocks[blocks.length - 1]?.id || 'b-last', 'list_item')}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
        >
          <List className="w-3 h-3 text-purple-400" />
          <span>Bullet List</span>
        </button>
        <button
          onClick={() => handleAddBlock(blocks[blocks.length - 1]?.id || 'b-last', 'code')}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
        >
          <Code className="w-3 h-3 text-purple-400" />
          <span>Code Block</span>
        </button>
      </div>
    </div>
  );
};
