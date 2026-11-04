import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readColumnWidths, readToken, readWizardDone, storeToken, storeWizardDone, writeColumnWidths } from '../../src/board/storage.ts';

// A Map-backed localStorage, or one that throws like a browser with storage blocked.
function useStorage(blocked = false) {
  const data = new Map<string, string>();
  const fail = () => { throw new Error('storage is blocked'); };
  Object.assign(globalThis, {
    localStorage: {
      getItem: blocked ? fail : (key: string) => data.get(key) ?? null,
      setItem: blocked ? fail : (key: string, value: string) => { data.set(key, value); },
      removeItem: blocked ? fail : (key: string) => { data.delete(key); },
    },
  });
  return data;
}

afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

test('SET-11 SEC-1: the token stays in this browser, and an empty token removes it', () => {
  const data = useStorage();
  assert.equal(readToken(), '');
  storeToken('mock-token');
  assert.equal(readToken(), 'mock-token');
  storeToken('');
  assert.equal(data.size, 0);
});

test('SET-11 TABLE-24: column widths survive, invalid ones are dropped, and no widths means no entry', () => {
  const data = useStorage();
  writeColumnWidths({ author: 230 });
  assert.deepEqual(readColumnWidths(), { author: 230 });
  data.set('apihub-pr-board.columns', JSON.stringify({ author: 10, title: 'wide', nope: 300, comment: 320 }));
  assert.deepEqual(readColumnWidths(), { comment: 320 });
  data.set('apihub-pr-board.columns', '{broken');
  assert.deepEqual(readColumnWidths(), {});
  writeColumnWidths({});
  assert.equal(data.has('apihub-pr-board.columns'), false);
});

test('SET-11: blocked storage never breaks the page', () => {
  useStorage(true);
  assert.equal(readToken(), '');
  assert.doesNotThrow(() => storeToken('mock-token'));
  assert.deepEqual(readColumnWidths(), {});
  assert.doesNotThrow(() => writeColumnWidths({ author: 230 }));
});

test('SET-21: the wizard counts as done once closed, and blocked storage never makes it open on every visit', () => {
  const data = useStorage();
  assert.equal(readWizardDone(), false);
  storeWizardDone();
  assert.equal(readWizardDone(), true);
  // Storage that reads but refuses the write: done until the page reloads.
  data.clear();
  Object.assign(globalThis.localStorage, { setItem: () => { throw new Error('quota exceeded'); } });
  assert.equal(readWizardDone(), false);
  storeWizardDone();
  assert.equal(data.size, 0);
  assert.equal(readWizardDone(), true);
  useStorage(true);
  assert.equal(readWizardDone(), true);
  assert.doesNotThrow(() => storeWizardDone());
});

test('SET-11: stored widths keep only own column ids, never inherited names', () => {
  useStorage().set('apihub-pr-board.columns', JSON.stringify({ toString: 200, constructor: 200, ci: 90 }));
  assert.deepEqual(readColumnWidths(), { ci: 90 });
});
