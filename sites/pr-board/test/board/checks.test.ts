import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupChecks } from '../../src/board/checks.ts';
import type { FailedCheck } from '../../src/types.ts';

const check = (name: string, workflow: string | null = 'CI', conclusion = 'failure'): FailedCheck =>
  ({ name, workflow, conclusion, url: null, description: '' });

test('PANEL-3: a check reported several times shows once with its count', () => {
  const groups = groupChecks([check('lint'), check('lint'), check('lint', 'Lint'), check('e2e', 'CI', 'timed_out')]);
  assert.deepEqual(groups.map((g) => [g.name, g.workflow, g.conclusion, g.count]),
    [['lint', 'CI', 'failure', 2], ['lint', 'Lint', 'failure', 1], ['e2e', 'CI', 'timed_out', 1]]);
});

test('PANEL-4: the summary job is marked and listed last', () => {
  const groups = groupChecks([check('ci-ok'), check('unit'), check('build')]);
  assert.deepEqual(groups.map((g) => [g.name, g.summary]), [['unit', false], ['build', false], ['ci-ok', true]]);
  assert.deepEqual(groupChecks([]), []);
});
