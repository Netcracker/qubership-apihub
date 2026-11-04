import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyProgress, describeFinished, describeProgress, formatElapsed, startProgress } from '../../src/board/progress.ts';

test('DATA-27: one repository reports the PRs read out of the total', () => {
  let progress = startProgress(['acme/widgets']);
  assert.deepEqual(describeProgress(progress), { headline: 'Connecting to GitHub', lines: [] });
  progress = applyProgress(progress, { repo: 'acme/widgets', status: 'reading', read: 40, total: 80 });
  assert.deepEqual(describeProgress(progress), { headline: 'Reading acme/widgets: 40 of 80 pull requests', lines: [] });
});

test('DATA-27: several repositories report how many are done and what each one being read is doing', () => {
  let progress = startProgress(['acme/widgets', 'acme/gadgets', 'acme/tools']);
  progress = applyProgress(progress, { repo: 'acme/gadgets', status: 'done', read: 4, total: 4 });
  progress = applyProgress(progress, { repo: 'acme/widgets', status: 'reading', read: 20, total: 80 });
  progress = applyProgress(progress, { repo: 'acme/widgets', status: 'reading', read: 20, total: 80, note: 'GitHub timed out; asking for 10 pull requests a page' });
  progress = applyProgress(progress, { repo: 'acme/tools', status: 'reading', read: 0, total: null });
  assert.deepEqual(describeProgress(progress), {
    headline: 'Reading repositories: 1 of 3 done, 24 pull requests so far',
    lines: [
      { repo: 'acme/widgets', text: 'acme/widgets: 20 of 80 pull requests. GitHub timed out; asking for 10 pull requests a page' },
      { repo: 'acme/tools', text: 'acme/tools: starting' },
    ],
  });
  progress = applyProgress(progress, { repo: 'acme/tools', status: 'unreadable', read: 0, total: null });
  assert.match(describeProgress(progress).headline, /2 of 3 done/);
});

test('DATA-27: an event for a repository not in the load changes nothing', () => {
  const progress = startProgress(['acme/widgets']);
  assert.equal(applyProgress(progress, { repo: 'acme/other', status: 'done', read: 0, total: 0 }), progress);
});

test('DATA-27: the summary counts the pull requests, and the repositories when there are several', () => {
  assert.equal(describeFinished(1, 1), 'Loaded 1 pull request');
  assert.equal(describeFinished(84, 2), 'Loaded 84 pull requests from 2 repositories');
});

test('DATA-27: elapsed time reads in tenths of a second, then in minutes', () => {
  assert.equal(formatElapsed(0), '0.0 s');
  assert.equal(formatElapsed(4260), '4.2 s');
  assert.equal(formatElapsed(59_940), '59.9 s');
  assert.equal(formatElapsed(65_000), '1 min 5 s');
});
