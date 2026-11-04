import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  completeReviewerOrder, DEFAULT_REVIEWER_ORDER, moveReviewerGroup, REVIEWER_PRESETS, reviewerEntries,
} from '../../src/board/reviewers.ts';
import type { ReviewerGroup } from '../../src/board/reviewers.ts';
import type { PullRequest } from '../../src/types.ts';

const person = (login: string) => ({ login, avatarUrl: null, bot: false, team: false });
const review = (login: string, state: string) => ({ login, avatarUrl: null, bot: false, state, at: null });
const entries = (fields: Partial<PullRequest>) =>
  reviewerEntries({ reviewers: [], requestedReviewers: [], ...fields } as PullRequest).map((e) => e.actor.login + ':' + e.status);

test('TABLE-30: reviewers are listed once each: requested changes, then those still to answer, and approvals last', () => {
  assert.deepEqual(entries({
    reviewers: [
      review('anna-dev', 'APPROVED'), review('chen-li', 'CHANGES_REQUESTED'), review('Boris-K', 'DISMISSED'), review('dara-ops', 'COMMENTED'),
      review('ivan-qa', 'DISMISSED'),
    ],
    requestedReviewers: [person('hana-docs'), person('boris-k'), { ...person('backend'), team: true }],
  }), ['chen-li:changes', 'hana-docs:pending', 'Boris-K:again', 'backend:pending', 'dara-ops:commented', 'ivan-qa:dismissed', 'anna-dev:approved']);
});

test('TABLE-30: a team of the same name as a reviewer is not that reviewer asked again', () => {
  assert.deepEqual(entries({ reviewers: [review('core', 'APPROVED')], requestedReviewers: [{ ...person('core'), team: true }] }),
    ['core:pending', 'core:approved']);
  assert.deepEqual(entries({}), []);
});

test('TABLE-30: the viewer asked for a review leads those still to answer, after requested changes', () => {
  const pr = {
    reviewers: [review('dara-ops', 'CHANGES_REQUESTED')],
    requestedReviewers: [person('anna-dev'), person('chen-li'), person('Boris-K')],
  } as unknown as PullRequest;
  assert.deepEqual(reviewerEntries(pr, 'boris-k').map((e) => e.actor.login), ['dara-ops', 'Boris-K', 'anna-dev', 'chen-li']);
});

test('TABLE-30: only the viewer\'s own line is marked as theirs, never a team of the same name', () => {
  const pr = {
    reviewers: [review('boris-k', 'APPROVED')],
    requestedReviewers: [{ ...person('boris-k'), team: true }, person('anna-dev')],
  } as unknown as PullRequest;
  assert.deepEqual(reviewerEntries(pr, 'Boris-K').map((e) => e.actor.login + ':' + e.mine), ['boris-k:false', 'anna-dev:false', 'boris-k:true']);
  assert.ok(reviewerEntries(pr).every((e) => !e.mine), 'no viewer, no line of theirs');
});

test('SET-25: the reviewer groups come in the order chosen, and the viewer still leads the reviews not given yet', () => {
  const pr = {
    reviewers: [review('anna-dev', 'APPROVED'), review('dara-ops', 'CHANGES_REQUESTED'), review('gleb-be', 'DISMISSED')],
    requestedReviewers: [person('hana-docs'), person('boris-k')],
  } as unknown as PullRequest;
  const order = (groups: ReviewerGroup[]) => reviewerEntries(pr, 'boris-k', groups).map((e) => e.actor.login);
  assert.deepEqual(order(REVIEWER_PRESETS.changes), ['dara-ops', 'boris-k', 'hana-docs', 'gleb-be', 'anna-dev']);
  assert.deepEqual(order(REVIEWER_PRESETS.waiting), ['boris-k', 'hana-docs', 'dara-ops', 'gleb-be', 'anna-dev']);
  assert.deepEqual(order(REVIEWER_PRESETS.approved), ['anna-dev', 'dara-ops', 'boris-k', 'hana-docs', 'gleb-be']);
  assert.deepEqual(order(['dismissed']), ['gleb-be', 'dara-ops', 'boris-k', 'hana-docs', 'anna-dev'], 'the rest follow in the default order');
});

test('SET-25: a group moves one place, the ends stay, and an old or edited order still gives every group once', () => {
  assert.deepEqual(moveReviewerGroup(DEFAULT_REVIEWER_ORDER, 'approved', -1).slice(-2), ['approved', 'dismissed']);
  assert.deepEqual(moveReviewerGroup(DEFAULT_REVIEWER_ORDER, 'changes', -1), DEFAULT_REVIEWER_ORDER);
  assert.deepEqual(moveReviewerGroup(DEFAULT_REVIEWER_ORDER, 'approved', 1), DEFAULT_REVIEWER_ORDER);
  assert.deepEqual(completeReviewerOrder(['approved', 'nope', 'approved', 7]), ['approved', 'changes', 'waiting', 'commented', 'dismissed']);
});
