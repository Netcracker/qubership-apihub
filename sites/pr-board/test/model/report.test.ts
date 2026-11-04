import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derive } from '../../src/model/derive.ts';
import { parseReport, pullRequestKey, snapshotReport } from '../../src/model/report.ts';
import type { PullRequest } from '../../src/types.ts';

test('DATA-5: prs.json without a PR list is rejected, and missing optional fields get defaults', () => {
  assert.throws(() => parseReport({}), /no list of pull requests/);
  assert.throws(() => parseReport(null), /no list of pull requests/);
  const report = parseReport({ repo: 'a/b', generatedAt: '2026-10-28T12:00:00Z', prs: [] });
  assert.deepEqual(report.warnings, []);
  assert.equal(report.runUrl, null);
});

test('DATA-5: optional fields of prs.json keep valid values and drop invalid ones', () => {
  const report = parseReport({ repo: 7, runUrl: 'https://example.test/run/1', warnings: ['ok', 3, null], prs: [] });
  assert.deepEqual(report.repos, []);
  assert.equal(report.runUrl, 'https://example.test/run/1');
  assert.deepEqual(report.warnings, ['ok']);
  assert.equal(report.generatedAt, new Date(0).toISOString());
});

test('DATA-19: prs.json lists its repositories, and each PR keeps its own', () => {
  const report = parseReport({
    repos: ['acme/widgets', 'acme/gadgets', 7, '../x'],
    prs: [{ number: 1, repo: 'acme/widgets' }, { number: 1, repo: 'acme/gadgets' }],
  });
  assert.deepEqual(report.repos, ['acme/widgets', 'acme/gadgets']);
  assert.deepEqual(report.prs.map((pr) => pr.repo), ['acme/widgets', 'acme/gadgets']);
});

test('DATA-19: a file from before, with one repository and PRs without one, gives its PRs that repository', () => {
  const report = parseReport({ repo: 'acme/widgets', prs: [{ number: 1 }, { number: 2, repo: '../../user' }] });
  assert.deepEqual(report.repos, ['acme/widgets']);
  assert.deepEqual(report.prs.map((pr) => pr.repo), ['acme/widgets', 'acme/widgets']);
});

test('DATA-19: with several repositories, a PR without a valid one gets none', () => {
  const report = parseReport({ repos: ['acme/widgets', 'acme/gadgets'], prs: [{ number: 1, repo: 'nope' }] });
  assert.equal(report.prs[0].repo, '');
});

test('DATA-20: equal numbers in different repositories are different PRs', () => {
  const pr = (repo: string, number: number) => ({ repo, number }) as PullRequest;
  assert.notEqual(pullRequestKey(pr('acme/widgets', 7)), pullRequestKey(pr('acme/gadgets', 7)));
  assert.equal(pullRequestKey(pr('acme/widgets', 7)), pullRequestKey(pr('acme/widgets', 7)));
  assert.notEqual(pullRequestKey(pr('acme/widgets', 7)), pullRequestKey(pr('acme/widgets', 70)));
});

test('DATA-19: a PR naming a repository the file does not list gets the file repository', () => {
  const report = parseReport({ repos: ['acme/widgets'], prs: [{ number: 1, repo: 'other/x' }, { number: 2, repo: 'ACME/Widgets' }] });
  assert.deepEqual(report.prs.map((pr) => pr.repo), ['acme/widgets', 'ACME/Widgets']);
});

test('DATA-5: entries that are not PRs with a positive whole number are skipped', () => {
  const report = parseReport({ repo: 'acme/widgets', prs: [null, 'x', { number: '7' }, { number: 0 }, { number: 1.5 }, { number: '../7' }, { number: 7 }] });
  assert.deepEqual(report.prs.map((pr) => pr.number), [7]);
});

test('DATA-5: a PR whose lists are missing or broken gets empty lists, so it renders', () => {
  const [pr] = parseReport({ repo: 'acme/widgets', prs: [{ number: 7, assignees: null, labels: 'bug', issues: undefined, projects: 'x' }] }).prs;
  for (const field of ['assignees', 'labels', 'reviewers', 'requestedReviewers', 'issues', 'comments'] as const) {
    assert.deepEqual(pr[field], [], field);
  }
  assert.equal(pr.projects, null, 'unreadable projects count as unknown');
  const [kept] = parseReport({ repo: 'acme/widgets', prs: [{ number: 8, labels: [{ name: 'bug' }], projects: ['Sprint'] }] }).prs;
  assert.deepEqual(kept.labels, [{ name: 'bug' }]);
  assert.deepEqual(kept.projects, ['Sprint']);
});

test('DATA-5: issues in a prs.json written before types and labels get none', () => {
  const [pr] = parseReport({ repo: 'acme/widgets', prs: [{ number: 7, issues: [{ number: 1, title: 'Old', url: 'u' }, { number: 2, title: 'Odd', url: 'u', type: 'Bug', labels: 'x' }] }] }).prs;
  assert.deepEqual(pr.issues.map((i) => [i.type, i.labels]), [[null, []], [null, []]]);
});

test('DATA-5 DATA-25: issues in a prs.json written before the project fields get none, and broken issues are dropped', () => {
  const [pr] = parseReport({ repo: 'acme/widgets', prs: [{ number: 7, issues: [
    { number: 1, title: 'Old', url: 'u', estimate: '3', sprint: { title: 'S' }, priority: { name: 'High', color: 'NEON' } },
    null, 'x', { title: 'No url' },
  ] }] }).prs;
  assert.equal(pr.issues.length, 1);
  assert.deepEqual([pr.issues[0].priority, pr.issues[0].estimate, pr.issues[0].sprint], [{ name: 'High', color: null }, null, null]);
});

test('DATA-26: a snapshot leaves the viewer out and names the run that wrote it', () => {
  const report = { viewer: { login: 'boris-k', avatarUrl: null, bot: false }, repos: ['acme/widgets'], generatedAt: 'g', warnings: [], prs: [] };
  const snapshot = snapshotReport(report, 'https://example.test/run/1');
  assert.equal('viewer' in snapshot, false);
  assert.deepEqual(snapshot, { repos: ['acme/widgets'], generatedAt: 'g', warnings: [], prs: [], runUrl: 'https://example.test/run/1' });
  assert.equal(report.viewer.login, 'boris-k', 'the live report keeps its viewer');
});

test('DATA-5: broken list entries and scalar fields get defaults, so the row still derives and renders', () => {
  const [pr] = parseReport({ repo: 'acme/widgets', generatedAt: '2026-10-28T12:00:00Z', prs: [{
    number: 3, title: 7, ci: 'exploded', review: null, mergeable: 'MAYBE', createdAt: 'not a date', author: { name: 'no login' },
    labels: [null, { name: 'bug' }, { color: 'fff' }], assignees: [null, { login: 'boris-k' }], comments: [null, { body: 'hi', at: '2026-10-27T00:00:00Z' }],
    reviewers: [{ state: 'APPROVED' }], projects: ['P', 5],
    issues: [{ number: 'x', title: 'Issue', url: 'u', labels: [null, { name: 'customer' }], sprint: { title: 'S', startDate: '2026-01-01', duration: 1e10 } }],
  }] }).prs;
  assert.deepEqual([pr.title, pr.ci, pr.review, pr.mergeable, pr.author, pr.base, pr.draft], ['', 'none', 'none', 'unknown', null, 'main', false]);
  assert.equal(pr.createdAt, '2026-10-28T12:00:00Z', 'a bad date falls back to the file time');
  assert.deepEqual(pr.labels.map((l) => l.name), ['bug']);
  assert.deepEqual(pr.assignees.map((a) => a.login), ['boris-k']);
  assert.equal(pr.comments.length, 1);
  assert.deepEqual(pr.reviewers, []);
  assert.deepEqual(pr.projects, ['P']);
  assert.deepEqual([pr.issues[0].number, pr.issues[0].labels.map((l) => l.name), pr.issues[0].sprint], [null, ['customer'], null]);
  const row = derive(pr, Date.parse('2026-10-28T12:00:00Z'));
  assert.equal(row.ageDays, 0);
  assert.ok(row.searchText.includes('bug'));
});

test('DATA-25: a sprint lasts a whole number of days, up to a year', () => {
  const sprint = (duration: unknown) => parseReport({ repo: 'acme/widgets', prs: [{ number: 1, issues: [
    { title: 'i', url: 'u', sprint: { title: 'S', startDate: '2026-01-01', duration } },
  ] }] }).prs[0].issues[0].sprint;
  assert.equal(sprint(14)!.duration, 14);
  for (const bad of [0, 1.5, 367, 1e10, '14']) assert.equal(sprint(bad), null, String(bad));
});
