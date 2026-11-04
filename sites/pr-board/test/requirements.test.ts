import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRequirements } from '../scripts/requirements.ts';

const SPEC = {
  'a.md': [
    '- **DATA-1** The repository comes from configuration.',
    '- **DATA-2** The dev server uses a fictional repository. *Planned: task C1.*',
    '- **DATA-3** Checked by hand. *Manual check: the workflow schedule.*',
    '- **DATA-4** *Removed:* the hourly snapshot.',
    '| **SET-2** | Rules | Stale after N days. | 10 |',
    'Text that mentions **DATA-1** again is a reference, not a definition.',
  ].join('\n'),
};

test('S2: requirements without a test, planned ones, manual ones, and removed ones are told apart', () => {
  const result = checkRequirements(SPEC, {
    'x.test.ts': "test('DATA-1: covered', () => {});\ntest(`SET-2 DATA-1: covered twice, ${'loop'}`, () => {});",
  });
  assert.deepEqual(result.covered, ['DATA-1', 'SET-2']);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.planned, ['DATA-2']);
  assert.deepEqual(result.manual, ['DATA-3']);
  assert.deepEqual(result.removed, ['DATA-4']);
  assert.deepEqual(result.unknown, []);
});

test('S2: a test that still names a removed requirement is reported as stale, not unknown', () => {
  const result = checkRequirements(SPEC, { 'x.test.ts': "test('DATA-1 SET-2 DATA-4: old behavior', () => {});" });
  assert.deepEqual(result.stale, [{ id: 'DATA-4', file: 'x.test.ts' }]);
  assert.deepEqual(result.unknown, []);
});

test('S2: a requirement with no test is missing, and an id no requirement defines is unknown', () => {
  const result = checkRequirements(SPEC, { 'x.spec.ts': "test('DATA-9 SET-2: names a removed id', async () => {});" });
  assert.deepEqual(result.missing, ['DATA-1']);
  assert.deepEqual(result.unknown, [{ id: 'DATA-9', file: 'x.spec.ts' }]);
});

test('S2: ids count only at the start of a test title', () => {
  const result = checkRequirements(SPEC, { 'x.test.ts': "test('the title mentions DATA-1 later', () => {});" });
  assert.deepEqual(result.missing, ['DATA-1', 'SET-2']);
});

test('an id defined twice is reported, a marker counts only inside its own bullet, and double-quoted titles name ids', () => {
  const spec = {
    'a.md': '- **DATA-1** First.\n- **DATA-2** Second.\n\nLater prose says *Planned for later.',
    'b.md': '- **DATA-1** Again.\n',
  };
  const result = checkRequirements(spec, { 'x.test.ts': 'test("DATA-1: covered", () => {});' });
  assert.deepEqual(result.duplicate, ['DATA-1']);
  assert.deepEqual(result.covered, ['DATA-1']);
  assert.deepEqual(result.missing, ['DATA-2'], 'the prose after the list does not mark DATA-2 as planned');
});
