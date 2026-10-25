import { Note } from '../types';
import { assertSimulation } from './simulation-schema';

/** Validate one stored or imported note; the label names the offending note in errors. */
function assertNote(n: any, label: string): asserts n is Note {
  const fail = (message: string): never => { throw new Error(`Invalid vault: ${label} ${message}`); };
  if (!n || typeof n !== 'object') fail('is not an object');
  for (const key of ['id', 'title', 'content', 'folder']) if (typeof n[key] !== 'string') fail(`is missing text field "${key}"`);
  if (!Array.isArray(n.tags) || !n.tags.every((t: unknown) => typeof t === 'string')) fail('has invalid tags');
  for (const key of ['createdAt', 'updatedAt']) if (!Number.isFinite(n[key])) fail(`has invalid "${key}"`);
  if (n.attachedSimulation !== undefined) {
    try { assertSimulation(n.attachedSimulation); } catch (error) { fail(`has an invalid simulation (${error instanceof Error ? error.message : String(error)})`); }
  }
  if (n.attachedTrace !== undefined && (!n.attachedTrace || typeof n.attachedTrace !== 'object' || !Array.isArray(n.attachedTrace.steps))) fail('has an invalid generation trace');
}

export function parseVault(text: string): Note[] {
  const value = JSON.parse(text);
  if (!Array.isArray(value)) throw new Error('Invalid vault: expected an array of notes');
  value.forEach((n, i) => assertNote(n, `note ${i + 1}${typeof n?.title === 'string' ? ` ("${n.title}")` : ''}`));
  if (new Set(value.map(n => n.id)).size !== value.length) throw new Error('Duplicate note IDs');
  return value;
}

export function attachResult(notes: Note[], id: string, update: (note: Note) => Partial<Note>): Note[] {
  return notes.map(note => note.id === id ? { ...note, ...update(note), updatedAt: Date.now() } : note);
}
