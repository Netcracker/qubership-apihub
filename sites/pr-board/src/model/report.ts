// Reads prs.json as the page receives it from the network.

import { isRepositoryName } from '../repository.ts';
import { sameName } from '../names.ts';
import { CI_STATES, MERGE_STATES, REVIEW_STATES } from '../types.ts';
import type { PullRequest, Report } from '../types.ts';
import { parseNamedColor, parseSprint } from './fields.ts';

// A PR number repeats across repositories, so the repository is part of the identity.
export function pullRequestKey(pr: Pick<PullRequest, 'repo' | 'number'>): string {
  return pr.repo + '#' + pr.number;
}

// Files written before several repositories had one "repo" and PRs without one.
function reportRepos(report: { repos?: unknown; repo?: unknown }): string[] {
  if (Array.isArray(report.repos)) return report.repos.filter(isRepositoryName);
  return isRepositoryName(report.repo) ? [report.repo] : [];
}

// The number reaches REST paths, so an entry without a positive whole number is not a PR.
function isPullRequest(value: unknown): value is PullRequest {
  const number = value && typeof value === 'object' ? (value as { number?: unknown }).number : null;
  return Number.isInteger(number) && (number as number) > 0;
}

type Entry = Record<string, unknown>;

const isObject = (value: unknown): value is Entry => !!value && typeof value === 'object';
const text = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly unknown[]).includes(value) ? value as T : fallback;
// A list keeps only the entries a check accepts; anything that is not a list is empty.
const listOf = <T>(value: unknown, keep: (entry: Entry) => boolean): T[] =>
  (Array.isArray(value) ? value.filter((entry) => isObject(entry) && keep(entry)) : []) as T[];
const hasLogin = (entry: Entry) => typeof entry.login === 'string';
const date = (value: unknown, fallback: string) => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback);

// Every field a row reads, checked and given a default, so one broken entry cannot blank the page (DATA-5). Fields from
// before types, labels, or project fields were collected get none.
function readPullRequest(pr: Entry, repo: string, generatedAt: string): PullRequest {
  const author = isObject(pr.author) && hasLogin(pr.author) ? pr.author as unknown as PullRequest['author'] : null;
  const createdAt = date(pr.createdAt, generatedAt);
  const issues = listOf<Entry>(pr.issues, (issue) => typeof issue.title === 'string' && typeof issue.url === 'string')
    .map((issue) => ({
      number: Number.isInteger(issue.number) ? issue.number as number : null,
      title: issue.title as string,
      url: issue.url as string,
      type: parseNamedColor(issue.type),
      labels: listOf<PullRequest['labels'][number]>(issue.labels, (label) => typeof label.name === 'string'),
      priority: parseNamedColor(issue.priority),
      estimate: typeof issue.estimate === 'number' ? issue.estimate : null,
      sprint: parseSprint(issue.sprint),
    }));
  return {
    ...(pr as unknown as PullRequest),
    repo,
    number: pr.number as number,
    title: text(pr.title),
    url: text(pr.url),
    draft: pr.draft === true,
    base: text(pr.base, 'main'),
    author,
    assignees: listOf(pr.assignees, hasLogin),
    createdAt,
    updatedAt: date(pr.updatedAt, createdAt),
    ci: oneOf(pr.ci, CI_STATES, 'none'),
    checks: isObject(pr.checks) && Array.isArray(pr.checks.failed) ? pr.checks as unknown as PullRequest['checks'] : null,
    review: oneOf(pr.review, REVIEW_STATES, 'none'),
    reviewers: listOf(pr.reviewers, hasLogin),
    requestedReviewers: listOf(pr.requestedReviewers, hasLogin),
    labels: listOf(pr.labels, (label) => typeof label.name === 'string'),
    mergeable: oneOf(pr.mergeable, MERGE_STATES, 'unknown'),
    issues,
    projects: Array.isArray(pr.projects) ? pr.projects.filter((title) => typeof title === 'string') : null,
    comments: listOf(pr.comments, (comment) => typeof comment.body === 'string' && typeof comment.at === 'string'),
  };
}

// What a prs.json snapshot holds: the report without the viewer, whose token did not write it (DATA-26), and the
// workflow run that did.
export function snapshotReport(report: Report, runUrl: string | null): Omit<Report, 'viewer'> {
  const { viewer: _viewer, ...rest } = report;
  return { ...rest, runUrl };
}

// prs.json comes from the network: check the parts the page cannot render without.
export function parseReport(value: unknown): Report {
  const report = value as (Partial<Report> & { repo?: unknown }) | null;
  if (!report || typeof report !== 'object' || !Array.isArray(report.prs)) {
    throw new Error('the file has no list of pull requests');
  }
  const repos = reportRepos(report);
  const fallback = repos.length === 1 ? repos[0] : '';
  // A PR keeps its repository only when the file lists it, or lists none.
  const known = (repo: unknown): repo is string => isRepositoryName(repo) && (!repos.length || repos.some((r) => sameName(r, repo)));
  const generatedAt = date(report.generatedAt, new Date(0).toISOString());
  return {
    repos,
    generatedAt,
    runUrl: typeof report.runUrl === 'string' ? report.runUrl : null,
    warnings: Array.isArray(report.warnings) ? report.warnings.filter((w) => typeof w === 'string') : [],
    prs: (report.prs as unknown[]).filter(isPullRequest)
      .map((pr) => readPullRequest(pr as unknown as Entry, known(pr.repo) ? pr.repo : fallback, generatedAt)),
  };
}
