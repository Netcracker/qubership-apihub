import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derive } from '../../src/model/derive.ts';
import { activeLabelFilters, matchesQuery, parseQuery, toggleLabelFilter } from '../../src/model/search.ts';
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

function search(query: string, fields: Record<string, unknown>) {
  return matchesQuery(derive(pr(fields), NOW), parseQuery(query));
}

test('FILTER-8 FILTER-9: search combines words and qualifiers, with negation and quotes', () => {
  const fields = {
    title: 'fix(ui): keep filters', labels: [{ name: 'module:ui' }, { name: 'good first issue' }],
    assignees: [{ login: 'Boris-K' }], reviewers: [{ login: 'chen-li', state: 'APPROVED' }], requestedReviewers: [{ login: 'anna-dev' }],
  };
  assert.ok(search('filters label:module:ui', fields));
  assert.ok(search('label:"good first issue"', fields));
  assert.ok(search('reviewer:anna-dev', fields));
  assert.ok(search('reviewer:chen area:fe -is:draft', fields));
  assert.ok(!search('-label:module:ui', fields));
  assert.ok(!search('area:be', fields));
  assert.ok(search('assignee:boris-k ci:pass', fields));
  assert.ok(search('no:issue', { issues: [] }));
});

test('FILTER-10: a qualifier still being typed does not hide everything', () => {
  assert.deepEqual(parseQuery('label:'), { filters: [], words: [] });
  assert.ok(search('label:', {}));
});

test('FILTER-10: unknown qualifiers are plain words', () => {
  assert.deepEqual(parseQuery('foo:bar').words, [{ value: 'foo:bar', negate: false }]);
});

test('FILTER-11: toggling a label removes it whatever its case or quoting, and leaves other labels alone', () => {
  assert.equal(toggleLabelFilter('label:Bug', 'bug'), '');
  assert.equal(toggleLabelFilter('label:bugfix label:bug', 'bug'), 'label:bugfix');
  assert.equal(toggleLabelFilter('label:"bug" ci:failing', 'bug'), 'ci:failing');
  assert.equal(toggleLabelFilter('-label:bug', 'bug'), '-label:bug label:bug');
  assert.equal(toggleLabelFilter('ci:failing', 'good first issue'), 'ci:failing label:"good first issue"');
});

test('FILTER-8: search finds a PR by the number of its linked issue', () => {
  const fields = { issues: [{ number: 885, title: '[FE] Show version publication errors in UI', url: 'u' }] };
  assert.ok(search('885', fields));
  assert.ok(search('#885', fields));
  assert.ok(!search('886', fields));
});

test('FILTER-11: chips are active for labels the search asks for, not for excluded ones', () => {
  const active = activeLabelFilters(parseQuery('label:Bug -label:wontfix label:"good first issue" ci:failing'));
  assert.deepEqual([...active], ['bug', 'good first issue']);
  assert.deepEqual([...activeLabelFilters(parseQuery(''))], []);
});

test('FILTER-15: repo: matches the repository name or owner/name, and plain words match it too', () => {
  const fields = { repo: 'acme/gadgets' };
  assert.ok(search('repo:gadgets', fields));
  assert.ok(search('repo:ACME/Gadgets', fields));
  assert.ok(!search('repo:widgets', fields));
  assert.ok(!search('-repo:acme/gadgets', fields));
  assert.ok(search('gadgets', fields));
});

test('NOTE-7: note: matches the text of the note, and -note: excludes it', () => {
  const fields = { noteText: 'merged soon. fix the tests' };
  assert.ok(search('note:tests', fields));
  assert.ok(search('note:TESTS', fields));
  assert.ok(!search('note:deploy', fields));
  assert.ok(!search('-note:tests', fields));
  assert.ok(!search('note:tests', {}), 'a PR without notes does not match');
  assert.ok(search('-note:tests', {}));
});

test('FILTER-8: plain words match the type and labels of a linked issue', () => {
  const fields = { issues: [{ number: 5, title: 'Typed', url: 'u', type: { name: 'Bug', color: 'red' }, labels: [{ name: 'customer', color: null, description: '' }] }] };
  assert.ok(search('bug', fields));
  assert.ok(search('customer', fields));
  assert.ok(!search('feature', fields));
});

test('TABLE-28: priority: and sprint: match the project fields of linked issues', () => {
  const issue = { number: 5, title: 'Planned', url: 'u', type: null, labels: [], priority: { name: 'High', color: 'red' }, estimate: 3,
    sprint: { title: 'Sprint 42', startDate: '2026-10-25', duration: 14 } };
  const fields = { issues: [issue] };
  assert.ok(search('priority:high', fields));
  assert.ok(!search('priority:low', fields));
  assert.ok(search('priority:none', { issues: [{ ...issue, priority: null }] }));
  assert.ok(search('sprint:42', fields));
  assert.ok(search('sprint:current', fields), 'NOW is inside Sprint 42');
  assert.ok(!search('sprint:current', { issues: [{ ...issue, sprint: { title: 'Sprint 41', startDate: '2026-10-11', duration: 14 } }] }));
  assert.ok(search('sprint:none', { issues: [{ ...issue, sprint: null }] }));
  assert.ok(search('high', fields), 'plain words match the priority too');
});

test('FILTER-18: review:requested and review:again find the PRs that wait for the viewer', () => {
  const asked = derive(pr({ requestedReviewers: [{ login: 'boris-k', team: false }], reviewers: [] }), NOW, undefined, 'boris-k');
  const again = derive(pr({ requestedReviewers: [{ login: 'boris-k', team: false }], reviewers: [{ login: 'boris-k', state: 'APPROVED' }] }), NOW, undefined, 'boris-k');
  const other = derive(pr({ requestedReviewers: [], reviewers: [] }), NOW, undefined, 'boris-k');
  const hits = (query: string) => [asked, again, other].map((p) => matchesQuery(p, parseQuery(query)));
  assert.deepEqual(hits('review:requested'), [true, true, false]);
  assert.deepEqual(hits('review:again'), [false, true, false]);
  assert.deepEqual(hits('-review:requested'), [false, false, true]);
});

test('FILTER-15 FILTER-19: label:, repo:, and priority: match the whole name, and sprint: a whole word of the title', () => {
  const labels = { labels: [{ name: 'debug' }, { name: 'Module:UI' }] };
  assert.equal(search('label:bug', labels), false);
  assert.ok(search('label:module:ui', labels));
  const repo = { repo: 'acme/widgets-legacy', labels: [] };
  assert.equal(search('repo:widgets', repo), false);
  assert.equal(search('repo:acme', repo), false);
  assert.ok(search('repo:widgets-legacy', repo));
  assert.ok(search('repo:ACME/widgets-legacy', repo));
  assert.ok(search('-repo:acme/widgets', repo));
  const issue = (priority: string, sprint: string) => ({ labels: [], issues: [{ title: 'i', labels: [],
    priority: { name: priority, color: null }, sprint: { title: sprint, startDate: '2026-01-01', duration: 14 } }] });
  assert.equal(search('priority:high', issue('Highest', 'Sprint 142')), false);
  assert.ok(search('priority:highest', issue('Highest', 'Sprint 142')));
  assert.equal(search('sprint:42', issue('Low', 'Sprint 142')), false);
  assert.ok(search('sprint:42', issue('Low', 'Sprint 42')));
  assert.ok(search('sprint:"sprint 42"', issue('Low', 'Sprint 42')));
});
