// Adds the fields the board computes for each PR: age, areas, attention, bot authorship, and the search text.

import { sameName } from '../names.ts';
import { GHOST_LOGIN } from '../types.ts';
import type { DerivedPullRequest, PullRequest, Sprint } from '../types.ts';
import { areasOf } from './areas.ts';
import { cleanCommentText } from './comments.ts';
import { attentionReasons, DEFAULT_RULES, isBot } from './rules.ts';
import type { Rules } from './rules.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(fromIso)) / DAY_MS));
}

const pad = (n: number) => String(n).padStart(2, '0');

// The viewer's local calendar day as YYYY-MM-DD.
function localDay(time: number): string {
  const date = new Date(time);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

// Calendar arithmetic on a YYYY-MM-DD date, in UTC so daylight saving never shifts it.
function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

// Iteration dates have no time zone, so a sprint is current while the viewer's local day is between its start date
// and its last day (TABLE-28).
// The first and last day of a sprint as YYYY-MM-DD.
export function sprintDays(sprint: Sprint): { first: string; last: string } {
  return { first: sprint.startDate, last: addDays(sprint.startDate, sprint.duration - 1) };
}

export function isCurrentSprint(sprint: Sprint | null, now: number): boolean {
  if (!sprint) return false;
  const today = localDay(now);
  const { first, last } = sprintDays(sprint);
  return today >= first && today <= last;
}

// RULE-12: on a PR the viewer did not open, a personal review request is new, or again after an earlier review.
export function myReview(pr: PullRequest, viewer: string): DerivedPullRequest['myReview'] {
  if (!viewer || (pr.author && sameName(pr.author.login, viewer))) return null;
  if (!pr.requestedReviewers.some((r) => !r.team && sameName(r.login, viewer))) return null;
  return pr.reviewers.some((r) => sameName(r.login, viewer)) ? 'again' : 'requested';
}

export function derive(pr: PullRequest, now: number, rules: Rules = DEFAULT_RULES, viewer = ''): DerivedPullRequest {
  const ageDays = daysBetween(pr.createdAt, now);
  const { comments, labels, reviewers, requestedReviewers } = pr;
  const latestComment = comments[0] || null;
  const commentText = latestComment ? cleanCommentText(latestComment.body) : '';
  const authorKey = pr.author ? pr.author.login : GHOST_LOGIN;
  const attention = attentionReasons(pr, ageDays, rules);
  const areas = areasOf(pr, rules.areaCriteria);
  return {
    ...pr,
    latestComment,
    areas,
    authorKey,
    bot: isBot(pr.author, rules.extraBots),
    ageDays,
    stale: ageDays > rules.staleDays,
    inCurrentSprint: pr.issues.some((issue) => isCurrentSprint(issue.sprint, now)),
    myReview: myReview(pr, viewer),
    attention,
    commentText,
    searchText: [
      '#' + pr.number,
      pr.repo,
      pr.title,
      authorKey,
      pr.base,
      pr.ci,
      pr.review.replace('_', ' '),
      pr.mergeable === 'conflicts' ? 'conflicts' : '',
      pr.draft ? 'draft' : '',
      areas.join(' '),
      pr.assignees.map((a) => a.login).join(' '),
      reviewers.map((r) => r.login).join(' '),
      requestedReviewers.map((r) => r.login).join(' '),
      labels.map((l) => l.name).join(' '),
      pr.checks ? pr.checks.failed.map((c) => c.name + ' ' + (c.workflow || '')).join(' ') : '',
      pr.issues.map((i) => [i.number ? '#' + i.number : '', i.title, i.type ? i.type.name : '', ...(i.labels || []).map((l) => l.name),
        i.priority ? i.priority.name : '', i.sprint ? i.sprint.title : ''].join(' ')).join(' '),
      (pr.projects || []).join(' '),
      comments.map((c) => (c.author ? c.author.login : '') + ' ' + cleanCommentText(c.body)).join(' '),
      attention.join(' '),
    ].join(' ').toLowerCase(),
  };
}
