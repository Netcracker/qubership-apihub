import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derive } from '../../src/model/derive.ts';
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

test('derive computes age, ghost authors, and search text', () => {
  const result = derive(pr({ author: null, createdAt: new Date(NOW - 3 * DAY_MS - 1000).toISOString() }), NOW);
  assert.equal(result.ageDays, 3);
  assert.equal(result.authorKey, 'ghost');
  assert.ok(result.searchText.includes('#1'));
});

test('RULE-12: a PR waits for the viewer when they are requested in person, and is re-requested when they reviewed before', () => {
  const base = { author: { login: 'anna-dev', avatarUrl: null, bot: false }, reviewers: [], requestedReviewers: [] };
  const person = (login: string) => ({ login, avatarUrl: null, bot: false, team: false });
  const review = (login: string, state: string) => ({ login, avatarUrl: null, bot: false, state, at: null });
  const mine = (fields: Record<string, unknown>, viewer = 'boris-k') => derive(pr(fields), NOW, undefined, viewer).myReview;
  assert.equal(mine({ ...base, requestedReviewers: [person('Boris-K')] }), 'requested', 'logins compare without case');
  assert.equal(mine({ ...base, requestedReviewers: [person('boris-k')], reviewers: [review('boris-k', 'CHANGES_REQUESTED')] }), 'again');
  assert.equal(mine({ ...base, requestedReviewers: [person('boris-k')], reviewers: [review('boris-k', 'DISMISSED')] }), 'again');
  assert.equal(mine({ ...base, reviewers: [review('boris-k', 'APPROVED')] }), null, 'reviewed and not asked again');
  assert.equal(mine({ ...base, requestedReviewers: [{ ...person('boris-k'), team: true }] }), null, 'a team of that name is not the viewer');
  assert.equal(mine({ ...base, author: { login: 'boris-k', avatarUrl: null, bot: false }, requestedReviewers: [person('boris-k')] }), null, 'own PR');
  assert.equal(mine({ ...base, requestedReviewers: [person('boris-k')] }, ''), null, 'no viewer');
});
