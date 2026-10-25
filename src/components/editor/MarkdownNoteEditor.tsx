import React, { useState, useRef } from 'react';
import { Note, SimulationSpec } from '../../types';
import { LivePreviewEditor } from './LivePreviewEditor';
import {
  Sparkles,
  PenTool,
  Eye,
  FileCode,
  Hash,
  Clock,
  Zap,
  Calculator,
  Activity,
  Atom,
  ExternalLink
} from 'lucide-react';

interface MarkdownNoteEditorProps {
  note: Note;
  onUpdateNote: (updated: Partial<Note>) => void;
  onVisualize: (selectedText?: string, options?: { directEmbed?: boolean; targetBlockId?: string }) => void;
  onOpenSketch: () => void;
  onOpenWorkbench: (spec: SimulationSpec) => void;
  onEmbedSimulation?: (spec: SimulationSpec) => void;
  isVisualizing: boolean;
}

export const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  note,
  onUpdateNote,
  onVisualize,
  onOpenSketch,
  onOpenWorkbench,
  onEmbedSimulation,
  isVisualizing
}) => {
  // Default to Obsidian-style Live Preview WYSIWYG in one view!
  const [viewMode, setViewMode] = useState<'live' | 'source'>('live');
  const [selectedText, setSelectedText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Monitor text selections in raw source textarea
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      const selected = target.value.substring(start, end).trim();
      if (selected.length > 3) {
        setSelectedText(selected);
        return;
      }
    }
    setSelectedText('');
  };

  const wordCount = (note.content.match(/\S+/g) || []).length;

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'math': return <Calculator className="w-3.5 h-3.5 text-purple-400" />;
      case 'circuit': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'physics': return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'chemistry': return <Atom className="w-3.5 h-3.5 text-pink-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-obsidian-bg text-obsidian-text overflow-hidden">
      {/* Editor Top Bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-obsidian-sidebar/60 border-b border-obsidian-border text-xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Obsidian View Mode Switcher: Live Preview vs Source */}
          <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800">
            <button
              onClick={() => setViewMode('live')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'live'
                  ? 'bg-purple-950/70 text-purple-200 border border-purple-700/60 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Obsidian-style Live Preview WYSIWYG"
            >
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>Live Preview</span>
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'source'
                  ? 'bg-purple-950/70 text-purple-200 border border-purple-700/60 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Markdown Source Mode"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Source</span>
            </button>
          </div>

          <div className="h-3.5 w-[1px] bg-zinc-800 mx-1" />

          {/* Quick tags */}
          <div className="flex items-center gap-1.5">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono"
              >
                <Hash className="w-2.5 h-2.5 text-purple-400" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Sketch Button */}
          <button
            onClick={onOpenSketch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            <PenTool className="w-3.5 h-3.5 text-purple-400" />
            <span>Draw Sketch</span>
          </button>

          {/* AI Visualize Button */}
          <button
            onClick={() => onVisualize(selectedText || undefined)}
            disabled={isVisualizing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium shadow-md shadow-purple-900/30 transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isVisualizing ? 'animate-spin' : ''}`} />
            <span>
              {isVisualizing
                ? 'Synthesizing Spec...'
                : selectedText
                ? 'Visualize Highlight'
                : 'Visualize Note'}
            </span>
          </button>
        </div>
      </div>

      {/* Embedded Simulation Banner if attached */}
      {note.attachedSimulation && (
        <div className="px-5 py-2.5 bg-gradient-to-r from-purple-950/40 to-zinc-900/40 border-b border-purple-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded bg-purple-900/60 border border-purple-700">
              {getDomainIcon(note.attachedSimulation.domain)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-zinc-100 truncate block">
                {note.attachedSimulation.title}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Interactive simulation attached • {note.attachedSimulation.domain.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEmbedSimulation && (
              <button
                onClick={() => onEmbedSimulation(note.attachedSimulation!)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-purple-300 border border-purple-800/60 text-xs font-medium transition-colors shrink-0"
                title="Embed simulation directly into note content"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Embed into Note</span>
              </button>
            )}
            <button
              onClick={() => onOpenWorkbench(note.attachedSimulation!)}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium transition-colors shrink-0"
            >
              <span>Open in Workbench</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Document Title Header */}
      <div className="px-8 pt-5 pb-1 shrink-0">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdateNote({ title: e.target.value })}
          placeholder="Untitled Note..."
          className="w-full bg-transparent text-2xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
      </div>

      {/* Main Workspace Body - One View WYSIWYG */}
      <div className="flex-1 flex overflow-y-auto">
        {viewMode === 'live' ? (
          /* Obsidian WYSIWYG Live Preview Editor (Direct in-place editing) */
          <LivePreviewEditor
            content={note.content}
            onChange={(newContent) => onUpdateNote({ content: newContent })}
            onVisualizeSelection={(sel, opts) => onVisualize(sel, opts)}
            onOpenWorkbench={onOpenWorkbench}
          />
        ) : (
          /* Source Plain Text Mode */
          <div className="w-full h-full p-8 flex flex-col">
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={(e) => onUpdateNote({ content: e.target.value })}
              onSelect={handleSelect}
              placeholder="Write raw markdown here..."
              className="w-full flex-1 bg-transparent resize-none font-mono text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:outline-none selection:bg-purple-900 selection:text-white"
            />
          </div>
        )}
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between px-5 py-1.5 bg-obsidian-sidebar border-t border-obsidian-border text-[11px] text-zinc-500 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>{note.content.length} characters</span>
          <span className="text-zinc-600">•</span>
          <span className="text-purple-400">
            {viewMode === 'live' ? 'WYSIWYG Live Preview' : 'Raw Markdown Source'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span>Last saved: {new Date(note.updatedAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
