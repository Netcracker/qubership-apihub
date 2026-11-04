import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNotesToText, loadNotes, MAX_NOTE_CHARS, parseNotes, readStoredNotes, saveNotes, setNote, withUnsaved } from '../../src/board/notes.ts';

const KEY = 'acme/widgets#7';
const NOW = Date.parse('2026-10-28T12:00:00Z');

// A Map-backed localStorage, or one that throws like a browser with storage blocked.
function useStorage(blocked = false) {
  const data = new Map<string, string>();
  const fail = () => { throw new Error('storage is blocked'); };
  Object.assign(globalThis, {
    localStorage: {
      getItem: blocked ? fail : (key: string) => data.get(key) ?? null,
      setItem: blocked ? fail : (key: string, value: string) => { data.set(key, value); },
    },
  });
  return data;
}

afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

test('NOTE-1: each PR has one Markdown document; clearing it removes it', () => {
  let notes = setNote({}, KEY, '## Promised\n- [ ] fix the tests', NOW);
  assert.deepEqual(notes[KEY], { text: '## Promised\n- [ ] fix the tests', updatedAt: '2026-10-28T12:00:00.000Z' });
  notes = setNote(notes, KEY, '  \n ', NOW);
  assert.deepEqual(notes, {});
  assert.equal(setNote({}, KEY, 'x'.repeat(MAX_NOTE_CHARS + 5), NOW)[KEY].text.length, MAX_NOTE_CHARS);
});

test('NOTE-2: notes from the per-day version become one document, newest day first', () => {
  const text = dayNotesToText([
    { date: '2026-10-27', asked: true, text: 'Fix the tests by noon' },
    { date: '2026-10-28', asked: false, text: 'Waiting for review' },
    { date: '2026-10-26', asked: true, text: '' },
    { date: 'later', asked: true, text: 'dropped' },
  ]);
  assert.equal(text, '**2026-10-28** Waiting for review\n\n**2026-10-27** ✓ Fix the tests by noon\n\n**2026-10-26** ✓');
});

test('NOTE-2: stored notes survive a reload, old ones move once, invalid entries are dropped, and blocked storage never throws', () => {
  const data = useStorage();
  assert.deepEqual(loadNotes(), {});
  const notes = setNote({}, KEY, 'Fix the tests', NOW);
  saveNotes(notes);
  assert.deepEqual(loadNotes(), notes);
  data.set('apihub-pr-board.notes', JSON.stringify({
    [KEY]: [{ date: '2026-10-27', asked: true, text: 'old' }],
    'acme/widgets#8': { text: 'kept', updatedAt: '2026-10-28T10:00:00.000Z' },
    'acme/widgets#9': { text: '   ' },
    broken: 7,
  }));
  assert.deepEqual(loadNotes(), {
    [KEY]: { text: '**2026-10-27** ✓ old', updatedAt: new Date(0).toISOString() },
    'acme/widgets#8': { text: 'kept', updatedAt: '2026-10-28T10:00:00.000Z' },
  });
  assert.equal(JSON.parse(data.get('apihub-pr-board.notes')!)[KEY].text, '**2026-10-27** ✓ old', 'the move is saved');
  data.set('apihub-pr-board.notes', '{broken');
  assert.deepEqual(loadNotes(), {});
  assert.deepEqual(parseNotes(null), { notes: {}, migrated: false });
  useStorage(true);
  assert.deepEqual(loadNotes(), {});
  assert.doesNotThrow(() => saveNotes(notes));
});

test('NOTE-2: a note saved in another tab is read back before writing, and a failed save says so', () => {
  const data = useStorage();
  saveNotes(setNote({}, 'acme/widgets#7', 'from tab B', NOW));
  // Tab A loaded before tab B wrote; it builds its change on what is stored now, not on its own old copy.
  const stored = readStoredNotes();
  assert.deepEqual(Object.keys(setNote(stored!, 'acme/widgets#8', 'from tab A', NOW)), ['acme/widgets#7', 'acme/widgets#8']);
  assert.equal(saveNotes({}), true);
  data.set('apihub-pr-board.notes', '{broken');
  assert.deepEqual(readStoredNotes(), {}, 'a broken entry reads as no notes');
  useStorage(true);
  assert.equal(readStoredNotes(), null, 'blocked storage cannot be read');
  assert.equal(saveNotes({}), false);
});

test('NOTE-2: changes storage did not take stay over what is stored, a deleted note included', () => {
  const stored = { ...setNote({}, KEY, 'old text', NOW), ...setNote({}, 'acme/widgets#8', 'from another tab', NOW) };
  const unsaved = new Map([[KEY, null], ['acme/widgets#9', { text: 'new here', updatedAt: '2026-10-28T12:00:00.000Z' }]]);
  assert.deepEqual(withUnsaved(stored, unsaved), {
    'acme/widgets#8': stored['acme/widgets#8'],
    'acme/widgets#9': { text: 'new here', updatedAt: '2026-10-28T12:00:00.000Z' },
  });
  assert.equal(withUnsaved(stored, new Map()), stored, 'nothing unsaved leaves the stored notes as they are');
});
