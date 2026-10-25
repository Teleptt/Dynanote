import { THEMES, ThemeId } from './theme/themes';
import { useTheme } from './theme/useTheme';
import { SimulationBoundary } from './components/visualizers/SimulationBoundary';
import { parseVault, attachResult } from './lib/vault';
import { noteToMarkdown, markdownToNote, markdownFileName } from './lib/markdown-note';
import React, { useState, useEffect, useRef } from 'react';
import { Note, SimulationSpec, GenerationStatusEvent, AgenticTrace } from './types';
import { DEFAULT_NOTES } from './data/default-notes';
import { insertSimulationBlockAfter } from './lib/markdown-blocks';
import { aiService } from './services/ai/ai-service';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { MarkdownNoteEditor } from './components/editor/MarkdownNoteEditor';
import { VisualWorkbench } from './components/visualizers/VisualWorkbench';
import { SketchPad } from './components/sketch/SketchPad';
import { SettingsModal } from './components/settings/SettingsModal';
import { Sparkles, CheckCircle2, AlertCircle, X, Loader2, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'dynanote_notes_vault';
const SAVE_DELAY_MS = 400;

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();
  // Read storage once; a malformed vault pauses saving so it is never overwritten.
  const [initialLoad] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return { notes: saved ? parseVault(saved) : DEFAULT_NOTES, failed: false };
    } catch {
      return { notes: DEFAULT_NOTES, failed: true };
    }
  });
  const [storageError, setStorageError] = useState(initialLoad.failed
    ? 'Could not load the saved vault. Existing storage is protected. Export your current notes, then import a valid backup to resume saving.'
    : '');
  const [loadFailed, setLoadFailed] = useState(initialLoad.failed);
  const [deletedNote, setDeletedNote] = useState<Note | null>(null);
  const busyRef = useRef(false);
  const [notes, setNotes] = useState<Note[]>(initialLoad.notes);

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => [notes[0]?.id || '']);

  // Workbench & Simulation state
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState<boolean>(true);
  const [activeSimulation, setActiveSimulation] = useState<SimulationSpec | null>(
    notes[0]?.attachedSimulation || null
  );
  const [activeTrace, setActiveTrace] = useState<AgenticTrace | null>(
    notes[0]?.attachedTrace || null
  );

  // Modals & Flags
  const [isSketchOpen, setIsSketchOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Active Provider Name for Status
  const [activeProviderName, setActiveProviderName] = useState<string>(() => {
    const s = aiService.getSettings();
    const p = aiService.getProvider(s.activeProvider);
    return p ? p.name : s.activeProvider.toUpperCase();
  });

  // Persist notes to localStorage, debounced so typing does not serialize the whole vault per keystroke.
  const pendingSave = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (loadFailed) return;
    const save = () => {
      pendingSave.current = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        setStorageError('');
      } catch (e) {
        setStorageError('Notes could not be saved. Export a backup now to protect your edits.');
      }
    };
    pendingSave.current = save;
    const timer = setTimeout(save, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [notes, loadFailed]);
  // Flush a pending save when the page is hidden or closed.
  useEffect(() => {
    const flush = () => pendingSave.current?.();
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const openNotes = notes.filter((n) => openTabIds.includes(n.id));

  // Sync active simulation when active note changes
  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    if (!openTabIds.includes(id)) {
      setOpenTabIds((prev) => [...prev, id]);
    }

  };

  useEffect(() => {
    setActiveSimulation(activeNote?.attachedSimulation || null);
    setActiveTrace(activeNote?.attachedTrace || null);
  }, [activeNoteId, activeNote?.attachedSimulation, activeNote?.attachedTrace]);

  const download = (text: string, type: string, fileName: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a'); link.href = url;
    link.download = fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  const exportVault = () => download(JSON.stringify(notes, null, 2), 'application/json', `dynanote-backup-${new Date().toISOString().slice(0, 10)}.json`);
  const exportMarkdown = () => { if (activeNote) download(noteToMarkdown(activeNote), 'text/markdown', markdownFileName(activeNote)); };
  const importMarkdown = async (files: File[]) => {
    const added: Note[] = []; const failed: string[] = [];
    for (const file of files) {
      try { added.push(markdownToNote(await file.text(), file.name)); } catch (error) { failed.push(`${file.name}: ${errorText(error)}`); }
    }
    if (added.length) {
      setNotes(prev => [...added, ...prev]);
      setActiveNoteId(added[0].id); setOpenTabIds(prev => [...prev, added[0].id]);
    }
    setToastMessage(failed.length
      ? { text: `Imported ${added.length} of ${files.length}. ${failed.join('; ')}`, type: 'error' }
      : { text: `Imported ${added.length} Markdown note${added.length === 1 ? '' : 's'}.`, type: 'success' });
  };
  const importVault = async (file: File) => {
    try {
      const imported = parseVault(await file.text());
      // Merge as new notes so imports never overwrite existing work.
      const added = imported.map(n => ({ ...n, id: crypto.randomUUID() }));
      setNotes(prev => [...prev, ...added]); setLoadFailed(false);
      if (added.length) { setActiveNoteId(added[0].id); setOpenTabIds(prev => [...prev, added[0].id]); }
      setToastMessage({ text: `Imported ${added.length} notes. Existing notes were preserved.`, type: 'success' });
    } catch (error) { setToastMessage({ text: errorText(error), type: 'error' }); }
  };

  const handleCloseTab = (id: string) => {
    const remaining = openTabIds.filter((t) => t !== id);
    if (remaining.length === 0) {
      setOpenTabIds([]);
      setActiveNoteId('');
    } else {
      setOpenTabIds(remaining);
      if (activeNoteId === id) {
        setActiveNoteId(remaining[remaining.length - 1]);
      }
    }
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '# New Research Note\n\nWrite your thoughts, differential equations, circuit schematics, or reactions here...',
      folder: 'General',
      tags: ['notes'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setOpenTabIds((prev) => [...prev, newNote.id]);
  };

  const handleDeleteNote = (id: string) => {
    setDeletedNote(notes.find(n => n.id === id) || null);
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    handleCloseTab(id);
  };

  const handleUpdateNote = (updated: Partial<Note>) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? { ...n, ...updated, updatedAt: Date.now() }
          : n
      )
    );
  };

  // AI Multimodal Simulation Pipeline Trigger
  const handleVisualize = async (
    selectedText?: string,
    options?: { directEmbed?: boolean; targetBlockId?: string }
  ) => {
    if (!activeNote || busyRef.current) return;
    busyRef.current = true;
    setIsVisualizing(true);
    setStatusMessage('🧠 Agent: Initiating scientific analysis & planning...');
    setToastMessage(null);

    try {
      const response = await aiService.generateVisualSimulation({
        noteContent: activeNote.content,
        selectedText,
        onStatusUpdate: (evt: GenerationStatusEvent) => {
          setStatusMessage(evt.message);
        }
      });

      setNotes(prev => attachResult(prev, activeNote.id, latest => ({
        ...(options?.directEmbed ? { content: insertSimulationBlockAfter(latest.content, response.spec, selectedText) } : {}),
        attachedSimulation: response.spec,
        attachedTrace: response.agentTrace
      })));

      if (!options?.directEmbed) {
        setIsWorkbenchOpen(true);
      }

      const fixesText = response.agentTrace?.correctionsMade?.length
        ? ` (${response.agentTrace.correctionsMade.length} auto-repairs made)`
        : '';

      setToastMessage({
        text: options?.directEmbed
          ? `✨ Generated & embedded ${response.spec.domain} simulation directly into note!${fixesText}`
          : `✨ Generated: ${response.explanation}${fixesText}`,
        type: response.isFallback ? 'info' : 'success'
      });
    } catch (err: any) {
      console.error('Visualization error:', err);
      setToastMessage({
        text: `Simulation error: ${err.message || 'Failed to synthesize simulation'}`,
        type: 'error'
      });
    } finally {
      busyRef.current = false;
      setIsVisualizing(false);
      setStatusMessage('');
    }
  };

  const handleEmbedSimulationInNote = (spec: SimulationSpec) => {
    if (!activeNote) return;
    const newContent = insertSimulationBlockAfter(activeNote.content, spec);
    handleUpdateNote({ content: newContent });
    setToastMessage({
      text: `✨ Embedded ${spec.domain} visualizer into note!`,
      type: 'success'
    });
  };

  // Handle Freehand Digital Ink Sketch Simulation
  const handleSimulateSketch = async (base64Image: string, prompt?: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsVisualizing(true);
    setIsSketchOpen(false);
    setStatusMessage('🧠 Agent: Analyzing sketch topology and coordinates...');
    setToastMessage(null);

    try {
      const response = await aiService.generateVisualSimulation({
        noteContent: activeNote?.content || '',
        sketchImageBase64: base64Image,
        instructions: prompt,
        onStatusUpdate: (evt: GenerationStatusEvent) => {
          setStatusMessage(evt.message);
        }
      });

      if (activeNote) {
        handleUpdateNote({
          attachedSimulation: response.spec,
          attachedTrace: response.agentTrace
        });
      }

      setIsWorkbenchOpen(true);

      setToastMessage({
        text: `🎨 Generated sketch simulation: ${response.explanation}`,
        type: response.isFallback ? 'info' : 'success'
      });
    } catch (err: any) {
      console.error('Sketch synthesis error:', err);
      setToastMessage({
        text: `Sketch synthesis error: ${err.message || 'Failed to parse sketch'}`,
        type: 'error'
      });
    } finally {
      busyRef.current = false;
      setIsVisualizing(false);
      setStatusMessage('');
    }
  };

  // Handle Multi-Turn AI Refinement
  const handleRefineWithAI = async (instructions: string) => {
    if (!activeSimulation || busyRef.current) return;
    busyRef.current = true;
    setIsVisualizing(true);
    setStatusMessage('🧠 Agent: Planning parameter refinement & stability checks...');
    setToastMessage(null);

    try {
      const response = await aiService.generateVisualSimulation({
        noteContent: activeNote?.content || '',
        currentSpec: activeSimulation,
        instructions,
        onStatusUpdate: (evt: GenerationStatusEvent) => {
          setStatusMessage(evt.message);
        }
      });

      if (activeNote) {
        handleUpdateNote({
          attachedSimulation: response.spec,
          attachedTrace: response.agentTrace
        });
      }


      setToastMessage({
        text: `✨ Refined: ${response.explanation}`,
        type: response.isFallback ? 'info' : 'success'
      });
    } catch (err: any) {
      console.error('Refinement error:', err);
      setToastMessage({
        text: `Refinement error: ${err.message || 'Failed to refine simulation'}`,
        type: 'error'
      });
    } finally {
      busyRef.current = false;
      setIsVisualizing(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-obsidian-bg text-obsidian-text overflow-hidden font-sans">
      {/* Sidebar: Notes Tree, Search, Vault info */}
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeProviderName={activeProviderName}
      />

      {/* Center & Right Split Panes */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-800 text-xs">
          <span role="status" className={storageError ? 'text-red-300' : 'text-zinc-400'}>{storageError || 'Saved locally'}</span>
          <label className="ml-auto flex items-center gap-2 text-zinc-300">Theme
            <select aria-label="Color theme" value={theme.id} onChange={e => setTheme(e.target.value as ThemeId)} className="rounded border border-obsidian-border bg-obsidian-surface px-2 py-1 text-obsidian-text">
              {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <button onClick={exportVault} className="text-purple-300">Export backup</button>
          <label className="cursor-pointer text-purple-300">Import backup<input aria-label="Import vault backup" type="file" accept=".json,application/json" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void importVault(f); e.target.value = ''; }} /></label>
          <button onClick={exportMarkdown} disabled={!activeNote} className="text-purple-300 disabled:text-zinc-600">Export note (.md)</button>
          <label className="cursor-pointer text-purple-300">Import Markdown<input aria-label="Import Markdown notes" type="file" multiple accept=".md,.markdown,text/markdown" className="sr-only" onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) void importMarkdown(fs); e.target.value = ''; }} /></label>
          {deletedNote && <button className="text-amber-200" onClick={() => { setNotes(prev => [...prev, deletedNote]); setDeletedNote(null); }}>Undo delete</button>}
        </div>
        {/* Document Tab Bar */}
        <TabBar
          openNotes={openNotes}
          activeNoteId={activeNoteId}
          onSelectTab={handleSelectNote}
          onCloseTab={handleCloseTab}
          onNewNote={handleCreateNote}
          isWorkbenchOpen={isWorkbenchOpen}
          onToggleWorkbench={() => setIsWorkbenchOpen(!isWorkbenchOpen)}
        />

        {/* Central Workspace: Note Editor + Simulation Workbench */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Note Editor Area */}
          <div
            className={`h-full min-w-0 transition-all duration-200 ${
              isWorkbenchOpen ? 'w-1/2' : 'w-full'
            }`}
          >
            {activeNote ? (
              <MarkdownNoteEditor
                key={activeNote.id}
                note={activeNote}
                onUpdateNote={handleUpdateNote}
                onVisualize={handleVisualize}
                onOpenSketch={() => setIsSketchOpen(true)}
                onEmbedSimulation={handleEmbedSimulationInNote}
                onOpenWorkbench={(spec) => {
                  setActiveSimulation(spec);
                  setActiveTrace(activeNote.attachedTrace || null);
                  setIsWorkbenchOpen(true);
                }}
                isVisualizing={isVisualizing}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No note open. Create or select a note from the sidebar.
              </div>
            )}
          </div>

          {/* Right Workbench Simulation Panel */}
          {isWorkbenchOpen && (
            <div className="w-1/2 h-full min-w-0">
              <SimulationBoundary key={JSON.stringify(activeSimulation)}><VisualWorkbench
                spec={activeSimulation}
                agentTrace={activeTrace}
                onClose={() => setIsWorkbenchOpen(false)}
                onRefineWithAI={handleRefineWithAI}
                onEmbedInNote={handleEmbedSimulationInNote}
                isGenerating={isVisualizing}
              /></SimulationBoundary>
            </div>
          )}
        </div>
      </div>

      {/* Active Agentic Progress Pill */}
      {isVisualizing && statusMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/95 border border-purple-500/80 text-purple-200 text-xs shadow-2xl backdrop-blur-md animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span className="font-medium tracking-wide">{statusMessage}</span>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md p-3.5 rounded-xl shadow-2xl flex items-start gap-3 border text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-purple-950/95 border-purple-500/80 text-purple-100'
              : toastMessage.type === 'info'
              ? 'bg-amber-950/95 border-amber-500/80 text-amber-100'
              : 'bg-red-950/95 border-red-500/80 text-red-100'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          ) : toastMessage.type === 'info' ? (
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-relaxed">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded hover:bg-black/20 text-zinc-400 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
      <SketchPad
        isOpen={isSketchOpen}
        onClose={() => setIsSketchOpen(false)}
        onSimulateSketch={handleSimulateSketch}
        isSimulating={isVisualizing}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => {
          const s = aiService.getSettings();
          const p = aiService.getProvider(s.activeProvider);
          setActiveProviderName(p ? p.name : s.activeProvider.toUpperCase());
        }}
      />
    </div>
  );
};

export default App;
