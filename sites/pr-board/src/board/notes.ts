// Notes per PR: one Markdown document each, kept in this browser (NOTE-1, NOTE-2). Storage can be blocked, so every
// access is guarded, and a stored entry is checked before use. Notes written by the earlier per-day version move into
// the document once.

export interface Note {
  text: string;
  // ISO time of the last change.
  updatedAt: string;
}

// Keyed by pullRequestKey.
export type Notes = Record<string, Note>;

// The earlier per-day shape, read only to move it into a document.
interface DayNote {
  date: string;
  asked: boolean;
  text: string;
}

export const MAX_NOTE_CHARS = 20000;
export const NOTES_KEY = 'apihub-pr-board.notes';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Typing a note and clearing it: an empty document is removed.
export function setNote(notes: Notes, key: string, text: string, now: number): Notes {
  const kept = text.trim() ? text.slice(0, MAX_NOTE_CHARS) : '';
  const next = { ...notes };
  if (kept) next[key] = { text: kept, updatedAt: new Date(now).toISOString() };
  else delete next[key];
  return next;
}

// Changes storage did not take (NOTE-2), by key; null is a note deleted here. They stay over what is stored until a
// save succeeds, so a failed save neither loses an edit nor brings a deleted note back.
export type UnsavedNotes = Map<string, Note | null>;

export function withUnsaved(stored: Notes, unsaved: UnsavedNotes): Notes {
  if (!unsaved.size) return stored;
  const next = { ...stored };
  for (const [key, note] of unsaved) {
    if (note) next[key] = note;
    else delete next[key];
  }
  return next;
}

function isDayNote(value: unknown): value is DayNote {
  const entry = value as Partial<DayNote> | null;
  return !!entry && typeof entry === 'object' && typeof entry.date === 'string' && DAY.test(entry.date)
    && typeof entry.asked === 'boolean' && typeof entry.text === 'string';
}

// One paragraph per day, newest first: "**2026-10-28** ✓ Fixed the tests".
export function dayNotesToText(entries: unknown[]): string {
  return entries.filter(isDayNote).sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => '**' + entry.date + '**' + (entry.asked ? ' ✓' : '') + (entry.text ? ' ' + entry.text : ''))
    .join('\n\n');
}

export function parseNotes(value: unknown): { notes: Notes; migrated: boolean } {
  const notes: Notes = {};
  let migrated = false;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { notes, migrated };
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) {
      migrated = true;
      const text = dayNotesToText(entry);
      if (text) notes[key] = { text, updatedAt: new Date(0).toISOString() };
    } else if (entry && typeof entry === 'object' && typeof entry.text === 'string' && entry.text.trim()) {
      const updatedAt = typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(0).toISOString();
      notes[key] = { text: entry.text.slice(0, MAX_NOTE_CHARS), updatedAt };
    }
  }
  return { notes, migrated };
}

function readStored(): { notes: Notes; migrated: boolean } | null {
  let raw: string | null;
  try { raw = localStorage.getItem(NOTES_KEY); } catch { return null; }
  try {
    return parseNotes(JSON.parse(raw || 'null'));
  } catch {
    return { notes: {}, migrated: false };
  }
}

// The notes as stored now, or null when storage cannot be read at all. A broken entry reads as no notes. It only
// reads, so a save can call it to merge with what another tab stored.
export function readStoredNotes(): Notes | null {
  const stored = readStored();
  return stored && stored.notes;
}

// The notes for the page, with notes of the earlier per-day version written back once in the new shape.
export function loadNotes(): Notes {
  const stored = readStored();
  if (!stored) return {};
  if (stored.migrated) saveNotes(stored.notes);
  return stored.notes;
}

// False when storage is blocked or full, so the page can say the note was not saved.
export function saveNotes(notes: Notes): boolean {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}
