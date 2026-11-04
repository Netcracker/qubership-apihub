import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectPriorities, DEFAULT_VIEW, filterPullRequests, firstDirection, matchesPriority, parseView, readView, viewQuery, visibleRows,
  writeView,
} from '../../src/board/view.ts';
import { parseQuery } from '../../src/model/search.ts';
import type { DerivedPullRequest } from '../../src/types.ts';

function pr(number: number, fields: Partial<DerivedPullRequest> = {}): DerivedPullRequest {
  return {
    number, title: 'PR ' + number, authorKey: 'anna-dev', draft: false, areas: [], ci: 'passing', review: 'none',
    mergeable: 'clean', createdAt: '2026-10-01T00:00:00Z', attention: [], searchText: 'pr ' + number, ...fields,
  } as DerivedPullRequest;
}

test('FILTER-13: author categories round trip, defaults are omitted, and unknown categories keep the default', () => {
  const view = parseView('?authorgroups=service,humans,service');
  assert.deepEqual(view.authors, { groups: ['humans', 'service'] });
  assert.deepEqual(parseView('?' + viewQuery(view)), view);
  assert.deepEqual(parseView('?authorgroups=unknown').authors, null);
  assert.deepEqual(parseView('?authorgroups=').authors, { groups: [] });
  assert.equal(viewQuery(parseView('?authorgroups=humans')), '');
  assert.equal(parseView('?area=ui').area, 'fe');
});

test('FILTER-13: a URL query restores the view, and unknown values fall back to the defaults', () => {
  assert.deepEqual(parseView(''), DEFAULT_VIEW);
  assert.deepEqual(parseView('?q=fix&authors=anna-dev,,boris-k&draft=draft&area=fe&quick=ci,nope&sort=title&dir=asc'), {
    q: 'fix', authors: ['anna-dev', 'boris-k'], draft: 'draft', area: 'fe', quick: ['ci'], priority: [], groups: null, sort: 'title', dir: 'asc',
  });
  assert.equal(parseView('?authors=bots').authors, 'bots');
  assert.equal(parseView('?q=%20label:bug%20').q, ' label:bug ', 'the search is kept as typed');
  assert.deepEqual(parseView('?draft=weird&area=moon&sort=nope&dir=up'), DEFAULT_VIEW);
});

test('FILTER-13: the default view has an empty query, and a view survives the round trip', () => {
  assert.equal(viewQuery(DEFAULT_VIEW), '');
  const view = { ...DEFAULT_VIEW, q: 'label:"good first issue"', authors: ['anna-dev'], area: 'be' as const, quick: ['ci', 'review'] };
  assert.deepEqual(parseView('?' + viewQuery(view)), view);
  assert.equal(viewQuery({ ...DEFAULT_VIEW, dir: 'asc' }), 'sort=attention&dir=asc');
});

test('FILTER-13: Me stays a viewer-relative preset in links, and a login named me remains selectable', () => {
  const view = parseView('?authors=me');
  assert.equal(view.authors, 'me');
  assert.equal(viewQuery(view), 'authors=me');
  assert.deepEqual(parseView('?authors=me,').authors, ['me']);
  assert.equal(viewQuery({ ...DEFAULT_VIEW, authors: ['me'] }), 'authors=me%2C');
});

test('TABLE-16: text columns sort A to Z first, the others highest first', () => {
  assert.equal(firstDirection('title'), 'asc');
  assert.equal(firstDirection('author'), 'asc');
  assert.equal(firstDirection('age'), 'desc');
  assert.equal(firstDirection('number'), 'desc');
  assert.equal(firstDirection('repo'), 'asc');
});

test('FILTER-5 FILTER-6: authors, draft status, area, and the search narrow the rows', () => {
  const prs = [pr(1), pr(2, { draft: true }), pr(3, { areas: ['be'] }), pr(4, { authorKey: 'boris-k' }), pr(5, { areas: ['be', 'fe'] })];
  const everyone = new Set(['anna-dev', 'boris-k']);
  const ids = (list: DerivedPullRequest[]) => list.map((p) => p.number);
  const query = parseQuery('');
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'all', area: 'all', priority: [] }, everyone, query)), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'ready', area: 'all', priority: [] }, everyone, query)), [1, 3, 4, 5]);
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'draft', area: 'all', priority: [] }, everyone, query)), [2]);
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'all', area: 'fe', priority: [] }, everyone, query)), [5]);
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'all', area: 'other', priority: [] }, everyone, query)), [1, 2, 4]);
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'all', area: 'all', priority: [] }, new Set(['boris-k']), query)), [4]);
  assert.deepEqual(ids(filterPullRequests(prs, { draft: 'all', area: 'all', priority: [] }, everyone, parseQuery('pr 3'))), [3]);
});

test('FILTER-2 TABLE-17 TABLE-18: quick filters combine with AND, then rows sort with ties newest first', () => {
  const prs = [
    pr(1, { ci: 'failing', attention: ['a'] }), pr(2, { ci: 'failing', review: 'approved' }), pr(3, { attention: ['a', 'b'] }),
    pr(4, { ci: 'running', attention: ['a'] }),
  ];
  const ids = (list: DerivedPullRequest[]) => list.map((p) => p.number);
  assert.deepEqual(ids(visibleRows(prs, { quick: [], sort: 'attention', dir: 'desc' })), [3, 4, 1, 2]);
  assert.deepEqual(ids(visibleRows(prs, { quick: ['ci'], sort: 'number', dir: 'asc' })), [1, 2]);
  assert.deepEqual(ids(visibleRows(prs, { quick: ['ci', 'review'], sort: 'number', dir: 'asc' })), [1]);
  assert.deepEqual(ids(visibleRows(prs, { quick: [], sort: 'ci', dir: 'asc' })), [2, 1, 4, 3]);
  assert.deepEqual(visibleRows([], { quick: ['ci'], sort: 'number', dir: 'asc' }), []);
});

test('FILTER-13: the page reads the view from its address and writes it back without a reload', () => {
  const calls: string[] = [];
  Object.assign(globalThis, {
    window: { location: { search: '?area=fe', pathname: '/board/' } },
    history: { replaceState: (_state: unknown, _title: string, url: string) => { calls.push(url); } },
  });
  assert.equal(readView().area, 'fe');
  writeView({ ...DEFAULT_VIEW, q: 'fix' });
  writeView(DEFAULT_VIEW);
  assert.deepEqual(calls, ['/board/?q=fix', '/board/']);
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { history?: unknown }).history;
});

test('TABLE-26: the Repository column sorts A to Z first, with ties by PR number, newest first', () => {
  const prs = [pr(5, { repo: 'acme/widgets' }), pr(9, { repo: 'acme/Gadgets' }), pr(7, { repo: 'acme/widgets' }), pr(2, { repo: 'acme/gadgets' })];
  const keys = (list: DerivedPullRequest[]) => list.map((p) => p.repo + '#' + p.number);
  assert.deepEqual(keys(visibleRows(prs, { quick: [], sort: 'repo', dir: 'asc' })), ['acme/Gadgets#9', 'acme/gadgets#2', 'acme/widgets#7', 'acme/widgets#5']);
  assert.deepEqual(keys(visibleRows(prs, { quick: [], sort: 'repo', dir: 'desc' })), ['acme/widgets#7', 'acme/widgets#5', 'acme/Gadgets#9', 'acme/gadgets#2']);
  assert.equal(parseView('?sort=repo&dir=asc').sort, 'repo');
});

test('FILTER-14: the address carries the link settings after the view', () => {
  const calls: string[] = [];
  Object.assign(globalThis, {
    window: { location: { search: '', pathname: '/board/' } },
    history: { replaceState: (_state: unknown, _title: string, url: string) => { calls.push(url); } },
  });
  writeView(DEFAULT_VIEW, 'repos=acme/widgets');
  writeView({ ...DEFAULT_VIEW, q: 'fix' }, 'repos=acme/widgets');
  assert.deepEqual(calls, ['/board/?repos=acme/widgets', '/board/?q=fix&repos=acme/widgets']);
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { history?: unknown }).history;
});

test('FILTER-13: the address keeps its #fragment, and a browser that refuses to update it does not break the page', () => {
  const calls: string[] = [];
  Object.assign(globalThis, {
    window: { location: { search: '', pathname: '/board/', hash: '#top' } },
    history: { replaceState: (_state: unknown, _title: string, url: string) => { calls.push(url); } },
  });
  writeView({ ...DEFAULT_VIEW, q: 'fix' });
  assert.deepEqual(calls, ['/board/?q=fix#top']);
  Object.assign(globalThis, { history: { replaceState: () => { throw new Error('SecurityError: too many calls'); } } });
  assert.doesNotThrow(() => writeView(DEFAULT_VIEW));
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { history?: unknown }).history;
});

test('FILTER-16: the Priority filter keeps PRs whose issues have a chosen priority, or none, and lives in the address', () => {
  const issue = (name: string | null) => ({ number: 1, title: 't', url: 'u', type: null, labels: [], priority: name ? { name, color: null } : null, estimate: null, sprint: null });
  const high = pr(1, { issues: [issue('High')] });
  const low = pr(2, { issues: [issue('Low'), issue('High')] });
  const none = pr(3, { issues: [issue(null)] });
  assert.equal(matchesPriority(high, []), true);
  assert.equal(matchesPriority(high, ['high']), true);
  assert.equal(matchesPriority(none, ['High']), false);
  assert.equal(matchesPriority(none, ['none']), true);
  assert.deepEqual(filterPullRequests([high, low, none], { draft: 'all', area: 'all', priority: ['Low'] }, new Set(['anna-dev']), parseQuery('')).map((p) => p.number), [2]);
  assert.deepEqual(collectPriorities([high, low, none]), [{ name: 'High', count: 2 }, { name: 'Low', count: 1 }]);
  assert.deepEqual(parseView('?priority=High,,high,none').priority, ['High', 'none']);
  assert.equal(viewQuery({ ...DEFAULT_VIEW, priority: ['High', 'none'] }), 'priority=High%2Cnone');
});

test('FILTER-17: checked groups live in the address; an empty list checks none, and no parameter keeps the default', () => {
  assert.equal(parseView('').groups, null);
  assert.deepEqual(parseView('?groups=').groups, []);
  assert.deepEqual(parseView('?groups=' + encodeURIComponent('Monorepo & Co,Old,old')).groups, ['Monorepo & Co', 'Old']);
  assert.equal(viewQuery({ ...DEFAULT_VIEW, groups: ['Monorepo & Co', 'Ungrouped'] }), 'groups=Monorepo+%26+Co%2CUngrouped');
  assert.equal(viewQuery({ ...DEFAULT_VIEW, groups: [] }), 'groups=');
  assert.equal(viewQuery(DEFAULT_VIEW), '');
});

test('FILTER-13: an inherited name is not a sort, a quick filter counts once, and a person called "bots" stays a person', () => {
  for (const sort of ['__proto__', 'toString', 'constructor']) assert.equal(parseView('?sort=' + sort).sort, DEFAULT_VIEW.sort, sort);
  assert.deepEqual(parseView('?quick=ci,ci,review').quick, ['ci', 'review']);
  assert.equal(viewQuery({ ...DEFAULT_VIEW, authors: ['bots'] }), 'authors=bots%2C');
  assert.deepEqual(parseView('?authors=bots,').authors, ['bots']);
  assert.equal(parseView('?authors=bots').authors, 'bots');
  assert.deepEqual(parseView('?authors=' + encodeURIComponent(' anna-dev , Anna-Dev,boris-k')).authors, ['anna-dev', 'boris-k']);
});

test('TABLE-16: text columns sort as the Authors menu does, so accented names sort among the others', () => {
  const rows = ['Zed', 'Älva', 'anna'].map((title, i) => ({ number: i + 1, repo: 'acme/widgets', title, authorKey: 'a' }) as DerivedPullRequest);
  assert.deepEqual(visibleRows(rows, { quick: [], sort: 'title', dir: 'asc' }).map((pr) => pr.title), ['Älva', 'anna', 'Zed']);
});
