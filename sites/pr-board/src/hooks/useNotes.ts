import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadNotes, NOTES_KEY, readStoredNotes, saveNotes, setNote, withUnsaved } from '../board/notes.ts';
import type { UnsavedNotes } from '../board/notes.ts';

// Notes per PR, one Markdown document each (NOTE-1). Another tab may have written since this one loaded, so a change
// is built on what is stored now, and a storage event from another tab reloads the notes (NOTE-2).
export function useNotes() {
  const [notes, setNotes] = useState(loadNotes);
  const [saveFailed, setSaveFailed] = useState(false);
  const current = useRef(notes);
  useEffect(() => { current.current = notes; });
  // While saving fails, the changes storage lacks are kept here and laid over whatever is read back.
  const unsaved = useRef<UnsavedNotes>(new Map());
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === NOTES_KEY || event.key === null)) setNotes(withUnsaved(loadNotes(), unsaved.current));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const update = useCallback((key: string, text: string) => {
    const stored = readStoredNotes();
    const base = stored ? withUnsaved(stored, unsaved.current) : current.current;
    const next = setNote(base, key, text, Date.now());
    unsaved.current.set(key, next[key] || null);
    if (saveNotes(next)) unsaved.current.clear();
    setSaveFailed(unsaved.current.size > 0);
    current.current = next;
    setNotes(next);
  }, []);
  return useMemo(() => ({ notes, update, saveFailed }), [notes, update, saveFailed]);
}
