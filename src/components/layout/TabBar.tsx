import React from 'react';
import { Note } from '../../types';
import { X, Plus, Columns, PanelRight, Sparkles } from 'lucide-react';

interface TabBarProps {
  openNotes: Note[];
  activeNoteId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewNote: () => void;
  isWorkbenchOpen: boolean;
  onToggleWorkbench: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  openNotes,
  activeNoteId,
  onSelectTab,
  onCloseTab,
  onNewNote,
  isWorkbenchOpen,
  onToggleWorkbench
}) => {
  return (
    <div className="h-9 bg-obsidian-sidebar border-b border-obsidian-border flex items-center justify-between px-2 select-none shrink-0 overflow-x-auto">
      {/* Tabs */}
      <div className="flex items-center gap-1 min-w-0">
        {openNotes.map((note) => {
          const isActive = note.id === activeNoteId;
          return (
            <div
              key={note.id}
              onClick={() => onSelectTab(note.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'bg-obsidian-bg text-zinc-100 border-purple-500 font-medium'
                  : 'bg-transparent text-zinc-400 border-transparent hover:bg-obsidian-hover hover:text-zinc-300'
              }`}
            >
              <span className="truncate max-w-[140px]">{note.title || 'Untitled'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-zinc-800 p-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          onClick={onNewNote}
          className="p-1 rounded hover:bg-obsidian-hover text-zinc-400 hover:text-zinc-200 ml-1"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Workbench Toggle Controls */}
      <div className="flex items-center gap-1.5 ml-2">
        <button
          onClick={onToggleWorkbench}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
            isWorkbenchOpen
              ? 'bg-purple-900/60 border border-purple-700 text-purple-200 font-medium'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle Simulation Workbench"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Workbench</span>
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
