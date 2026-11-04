import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasOf, areaCriteriaQuery, DEFAULT_AREA_CRITERIA, parseAreaCriteria } from '../../src/model/areas.ts';
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

test('RULE-11: areas come from module labels, the title scope, [FE]/[BE] tags, and frontend/backend paths', () => {
  assert.deepEqual(areasOf(pr({ labels: [{ name: 'module:portal-backend' }] })), ['be']);
  assert.deepEqual(areasOf(pr({ title: 'fix(api-doc-viewer): x' })), ['fe']);
  assert.deepEqual(areasOf(pr({ title: 'fix: [BE] x', issues: [{ title: '[FE] y' }] })), ['be', 'fe']);
  assert.deepEqual(areasOf(pr({ title: 'chore: deps: bump x in /backend/agent' })), ['be']);
  assert.deepEqual(areasOf(pr({ title: 'chore: deps: bump x in /', labels: [{ name: 'module:ci' }] })), []);
});

test('RULE-11: a Dependabot directory at the root counts, with or without a path below it', () => {
  assert.deepEqual(areasOf(pr({ title: 'chore(deps): bump vite from 8.1 to 8.2 in /frontend' })), ['fe']);
  assert.deepEqual(areasOf(pr({ title: 'chore(deps): bump go in /backend in the go group' })), ['be']);
  assert.deepEqual(areasOf(pr({ title: 'chore(deps): bump x in /frontends' })), []);
});

test('RULE-11 SET-6: each detection signal is independent, literal, and can be disabled', () => {
  const empty = { labels: [], scopes: [], tags: [], directories: [], repositories: [] };
  const cases = [
    ['labels', ['custom label'], { labels: [{ name: 'CUSTOM LABEL' }] }],
    ['scopes', ['custom'], { title: 'fix(custom): change' }],
    ['tags', ['CUSTOM'], { issues: [{ title: '[CUSTOM] change' }] }],
    ['directories', ['custom/path'], { title: 'chore: bump tool in /custom/path/module' }],
    ['repositories', ['acme/widgets'], { repo: 'ACME/Widgets' }],
  ] as const;
  for (const [field, values, fields] of cases) {
    const criteria = parseAreaCriteria({ be: { ...empty, [field]: [...values] }, fe: empty });
    assert.deepEqual(areasOf(pr(fields), criteria), ['be'], field);
    assert.deepEqual(areasOf(pr(fields), parseAreaCriteria({ be: empty, fe: empty })), [], field);
  }
  const criteria = parseAreaCriteria({ be: { ...empty, directories: ['custom'] }, fe: empty });
  assert.deepEqual(areasOf(pr({ title: 'fix: /customized/path' }), criteria), []);
});

test('SET-6 FILTER-14: only semantic changes are shared and empty lists survive normalization', () => {
  assert.equal(areaCriteriaQuery(DEFAULT_AREA_CRITERIA), '');
  const criteria = parseAreaCriteria({ fe: { labels: [' New label ', 'NEW LABEL'], scopes: [], tags: [] } });
  assert.deepEqual(criteria.fe.labels, ['new label']);
  const encoded = areaCriteriaQuery(criteria);
  assert.deepEqual(parseAreaCriteria(JSON.parse(encoded)), criteria);
  assert.equal(areaCriteriaQuery(parseAreaCriteria(JSON.parse(encoded))), encoded);
  assert.deepEqual(parseAreaCriteria({ be: { labels: 4, tags: [1] }, fe: null }), DEFAULT_AREA_CRITERIA);
  assert.deepEqual(parseAreaCriteria(null), DEFAULT_AREA_CRITERIA);
});
