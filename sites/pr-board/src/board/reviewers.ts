// The Reviewers list of a PR as GitHub's sidebar shows it (TABLE-30): each person once, with where their review stands.

import { sameName } from '../names.ts';
import type { Actor, PullRequest } from '../types.ts';

export type ReviewerStatus = 'pending' | 'again' | 'changes' | 'approved' | 'commented' | 'dismissed';

export interface ReviewerEntry {
  actor: Actor;
  team: boolean;
  status: ReviewerStatus;
  // The viewer's own line, never a team's.
  mine: boolean;
}

const BY_STATE: Record<string, ReviewerStatus> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes', DISMISSED: 'dismissed' };

// The groups the list is ordered by (SET-25). Pending and asked again are one group, the reviews not given yet, so
// requests keep GitHub's order within it.
export type ReviewerGroup = 'changes' | 'waiting' | 'commented' | 'dismissed' | 'approved';

const GROUP_OF: Record<ReviewerStatus, ReviewerGroup> = {
  changes: 'changes', pending: 'waiting', again: 'waiting', commented: 'commented', dismissed: 'dismissed', approved: 'approved',
};

export const REVIEWER_GROUPS: [ReviewerGroup, string][] = [
  ['changes', 'Requested changes'], ['waiting', 'Not reviewed yet'], ['commented', 'Left comments'],
  ['dismissed', 'Review dismissed'], ['approved', 'Approved'],
];

// Three ready orders, for the setup wizard (SET-21): what still holds the PR first, who still owes a review first,
// and how close the PR is to merging.
export type ReviewerPreset = 'changes' | 'waiting' | 'approved';
export const REVIEWER_PRESETS: Record<ReviewerPreset, ReviewerGroup[]> = {
  changes: ['changes', 'waiting', 'commented', 'dismissed', 'approved'],
  waiting: ['waiting', 'changes', 'commented', 'dismissed', 'approved'],
  approved: ['approved', 'changes', 'waiting', 'commented', 'dismissed'],
};
export const DEFAULT_REVIEWER_ORDER = REVIEWER_PRESETS.changes;

const ALL_GROUPS = REVIEWER_GROUPS.map(([group]) => group);

// Every group once: the known ones in the order given, then the rest in the default order, so an old or edited value
// still gives a whole order.
export function completeReviewerOrder(order: unknown[]): ReviewerGroup[] {
  const known = [...new Set(order.filter((group): group is ReviewerGroup => ALL_GROUPS.includes(group as ReviewerGroup)))];
  return [...known, ...DEFAULT_REVIEWER_ORDER.filter((group) => !known.includes(group))];
}

// Moves a group one place up or down; the first and the last stay.
export function moveReviewerGroup(order: ReviewerGroup[], group: ReviewerGroup, step: -1 | 1): ReviewerGroup[] {
  const next = completeReviewerOrder(order);
  const at = next.indexOf(group);
  const to = at + step;
  if (to < 0 || to >= next.length) return next;
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}

// The rank of each status in an order.
export function reviewerRanks(order: ReviewerGroup[]): Record<ReviewerStatus, number> {
  const full = completeReviewerOrder(order);
  return Object.fromEntries(Object.entries(GROUP_OF).map(([status, group]) => [status, full.indexOf(group)])) as Record<ReviewerStatus, number>;
}

// A person asked again after a review of their own is listed once, as asked again. The viewer's own request leads
// the reviews not given yet, in every order.
export function reviewerEntries(pr: PullRequest, viewer = '', order: ReviewerGroup[] = DEFAULT_REVIEWER_ORDER): ReviewerEntry[] {
  const rank = reviewerRanks(order);
  const isViewer = (actor: Actor, team: boolean) => !!viewer && !team && sameName(actor.login, viewer);
  const requested = pr.requestedReviewers.map((r): ReviewerEntry => {
    const earlier = !r.team && pr.reviewers.find((done) => sameName(done.login, r.login));
    return earlier ? { actor: earlier, team: false, status: 'again', mine: isViewer(earlier, false) }
      : { actor: r, team: r.team, status: 'pending', mine: isViewer(r, r.team) };
  });
  const done = pr.reviewers
    .filter((r) => !requested.some((e) => !e.team && sameName(e.actor.login, r.login)))
    .map((r): ReviewerEntry => ({ actor: r, team: false, status: BY_STATE[r.state] || 'commented', mine: isViewer(r, false) }));
  return [...requested.filter((e) => e.mine), ...requested.filter((e) => !e.mine), ...done]
    .sort((a, b) => rank[a.status] - rank[b.status]);
}
