import React, { useState } from 'react';
import { Note } from '../../types';
import {
  FileText,
  Plus,
  Search,
  Settings,
  Trash2,
  Folder,
  Hash,
  Zap,
  Calculator,
  Activity,
  Atom,
  ChevronRight,
  ChevronDown,
  Layers
} from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onOpenSettings: () => void;
  activeProviderName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onOpenSettings,
  activeProviderName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || n.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const getDomainIcon = (domain?: string) => {
    switch (domain) {
      case 'math': return <Calculator className="w-3.5 h-3.5 text-purple-400" />;
      case 'circuit': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'physics': return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'chemistry': return <Atom className="w-3.5 h-3.5 text-pink-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <aside className="w-64 h-full bg-obsidian-sidebar border-r border-obsidian-border flex flex-col select-none shrink-0">
      {/* Vault Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-obsidian-border">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center text-white shadow">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-zinc-100 tracking-wide">DYNANOTE VAULT</span>
        </div>
        <button
          onClick={onCreateNote}
          className="p-1.5 rounded hover:bg-obsidian-hover text-zinc-400 hover:text-zinc-100 transition-colors"
          title="New Note"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div className="px-3 py-1.5 flex flex-wrap gap-1 border-b border-obsidian-border/50">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              selectedTag === null ? 'bg-purple-900/60 text-purple-200 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {allTags.slice(0, 6).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(selectedTag === t ? null : t)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                selectedTag === t ? 'bg-purple-900/60 text-purple-200 font-semibold' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Note List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
        <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500 px-2 py-1 tracking-wider">
          Notes ({filteredNotes.length})
        </div>

        {filteredNotes.map((note) => {
          const isActive = note.id === activeNoteId;
          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? 'bg-obsidian-active text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:bg-obsidian-hover hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {getDomainIcon(note.attachedSimulation?.domain)}
                <span className="text-xs truncate">{note.title || 'Untitled Note'}</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400"
                  title="Delete Note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="text-center py-6 text-xs text-zinc-600">
            No notes found.
          </div>
        )}
      </div>

      {/* Footer Status Bar with Provider Settings */}
      <div className="p-3 bg-obsidian-sidebar border-t border-obsidian-border flex items-center justify-between text-xs">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors w-full"
        >
          <Settings className="w-3.5 h-3.5 text-zinc-400" />
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[11px] font-medium text-zinc-300">Settings</span>
            <span className="text-[10px] text-purple-400 font-mono truncate">{activeProviderName}</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
