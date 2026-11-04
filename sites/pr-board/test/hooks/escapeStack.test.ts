import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
Object.assign(globalThis, { document: window.document, KeyboardEvent: window.KeyboardEvent });
const { onEscape } = await import('../../src/hooks/escapeStack.ts');

const escape = () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));

test('QUAL-3: Escape closes only the innermost open layer, then the one around it', () => {
  const closed: string[] = [];
  const removeDialog = onEscape(() => closed.push('dialog'));
  const removeMenu = onEscape(() => closed.push('menu'));
  escape();
  assert.deepEqual(closed, ['menu']);
  removeMenu();
  escape();
  assert.deepEqual(closed, ['menu', 'dialog']);
  removeDialog();
  escape();
  assert.deepEqual(closed, ['menu', 'dialog'], 'no layer, nothing closes');
});
