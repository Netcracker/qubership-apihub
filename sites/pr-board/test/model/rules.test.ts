import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attentionReasons, isBot, STALE_DAYS, titleProblem } from '../../src/model/rules.ts';
import type { PullRequest } from '../../src/types.ts';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

// Fixtures fill only the fields a rule reads, so they are cast rather than built in full.
function pr(fields: Record<string, unknown> = {}): PullRequest {
  return {
    number: 1, title: 'feat: t', base: 'main', ci: 'passing', review: 'none', mergeable: 'clean', draft: false, author: { login: 'a', bot: false }, assignees: [],
    createdAt: new Date(NOW - DAY_MS).toISOString(), issues: [{ title: 'i' }], projects: [], labels: [], reviewers: [], requestedReviewers: [], comments: [],
    ...fields,
  } as unknown as PullRequest;
}

test('RULE-6: valid Conventional Commits titles pass', () => {
  for (const title of ['feat: add x', 'fix(ui): y', 'feat(api)!: drop v1', 'chore: deps: bump nx in /', 'fix(ui-tests): Guard z', 'revert: undo x']) {
    assert.equal(titleProblem(title), null, title);
  }
});

test('RULE-6: invalid titles explain what is wrong', () => {
  assert.match(titleProblem('WIDGET-1234 Add export') ?? '', /expected "type\(scope\): subject"/);
  assert.match(titleProblem('fix(ui):no space') ?? '', /expected/);
  assert.match(titleProblem('Revert "feat: x"') ?? '', /expected/);
  assert.match(titleProblem('feature: add x') ?? '', /type "feature" is not allowed/);
  assert.match(titleProblem('Fix: crash') ?? '', /type "Fix" is not allowed/);
});

test('RULE-7: the age limit triggers only after the limit', () => {
  assert.deepEqual(attentionReasons(pr({}), STALE_DAYS), []);
  assert.equal(attentionReasons(pr({}), STALE_DAYS + 1).length, 1);
});

test('RULE-8: a PR in a project needs no linked issue', () => {
  assert.deepEqual(attentionReasons(pr({ issues: [], projects: ['Sprint'] }), 0), []);
  assert.deepEqual(attentionReasons(pr({ issues: [], projects: [] }), 0), ['No linked issue and not in a GitHub Project']);
});

test('RULE-8: unknown project membership is reported, not guessed', () => {
  assert.match(attentionReasons(pr({ issues: [], projects: null }), 0)[0], /could not be checked/);
});

test('RULE-10: service accounts and [bot] logins count as bots', () => {
  assert.equal(isBot({ login: 'acme-release-bot', avatarUrl: null, bot: false }, ['acme-release-bot']), true);
  assert.equal(isBot({ login: 'renovate[bot]', avatarUrl: null, bot: false }), true);
  assert.equal(isBot({ login: 'anna-dev', avatarUrl: null, bot: false }), false);
  assert.equal(isBot(null), false);
});

test('RULE-5: each rule that fires adds its own reason, in words', () => {
  const reasons = attentionReasons(pr({ title: 'WIP', issues: [], projects: [] }), STALE_DAYS + 2);
  assert.deepEqual(reasons, [
    'Title does not follow Conventional Commits: expected "type(scope): subject"',
    'Open ' + (STALE_DAYS + 2) + ' days, limit is ' + STALE_DAYS,
    'No linked issue and not in a GitHub Project',
  ]);
  assert.deepEqual(attentionReasons(pr({}), 0), []);
});
