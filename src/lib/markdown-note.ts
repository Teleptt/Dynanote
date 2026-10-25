import { Note } from '../types';
import { assertSimulation } from './simulation-schema';

/**
 * Portable single-note format: YAML-style front matter whose values are JSON,
 * followed by the note's Markdown body. Readable in any Markdown editor and
 * round-trips through markdownToNote without losing the attached simulation.
 */
export function noteToMarkdown(note: Note): string {
  const meta: Record<string, unknown> = {
    title: note.title, folder: note.folder, tags: note.tags,
    created: new Date(note.createdAt).toISOString(), updated: new Date(note.updatedAt).toISOString()
  };
  if (note.attachedSimulation) meta.simulation = note.attachedSimulation;
  const header = Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  return `---\n${header}\n---\n\n${note.content}`;
}

/** Parse Markdown with optional front matter; plain Markdown files become notes titled after their first heading or file name. */
export function markdownToNote(text: string, fileName = 'Imported note'): Note {
  const now = Date.now();
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  const meta: Record<string, unknown> = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const m = /^([A-Za-z]+):\s*(.*)$/.exec(line);
      if (!m) continue;
      try { meta[m[1]] = JSON.parse(m[2]); } catch { meta[m[1]] = m[2]; }
    }
  }
  const content = (match ? text.slice(match[0].length) : text).replace(/^\r?\n/, '');
  const heading = /^#\s+(.+)$/m.exec(content)?.[1]?.trim();
  const time = (v: unknown) => { const t = typeof v === 'string' ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : now; };
  const note: Note = {
    id: crypto.randomUUID(),
    title: typeof meta.title === 'string' && meta.title ? meta.title : heading || fileName.replace(/\.(md|markdown)$/i, ''),
    folder: typeof meta.folder === 'string' && meta.folder ? meta.folder : 'Imported',
    tags: Array.isArray(meta.tags) ? meta.tags.filter((t): t is string => typeof t === 'string') : [],
    content, createdAt: time(meta.created), updatedAt: time(meta.updated)
  };
  if (meta.simulation !== undefined) { assertSimulation(meta.simulation); note.attachedSimulation = meta.simulation; }
  return note;
}

export function markdownFileName(note: Note): string {
  return (note.title.replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'note') + '.md';
}
