import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockClock } from '../dev/clock.ts';
import { REFRESH_SCENARIOS } from '../dev/scenarios/refresh.ts';
import { REPORT_SCENARIOS } from '../dev/scenarios/report.ts';
import { restComments } from '../dev/scenarios/rest.ts';

const FIXED = '2026-10-28T12:00:00Z';

test('PR_BOARD_MOCK_NOW pins the mock clock', () => {
  const now = mockClock({ PR_BOARD_MOCK_NOW: FIXED });
  assert.equal(now(), Date.parse(FIXED));
  assert.equal(now(), Date.parse(FIXED));
});

test('without PR_BOARD_MOCK_NOW the mock clock follows the real one', () => {
  const before = Date.now();
  const now = mockClock({})();
  assert.ok(now >= before && now <= Date.now());
});

test('an unreadable PR_BOARD_MOCK_NOW stops the server with the variable named', () => {
  for (const value of ['yesterday', '2026', 'Oct 28 2026']) assert.throws(() => mockClock({ PR_BOARD_MOCK_NOW: value }), /PR_BOARD_MOCK_NOW/);
});

test('every scenario answers the same at the same moment', () => {
  const at = Date.parse(FIXED);
  for (const scenario of REPORT_SCENARIOS) {
    assert.deepEqual(scenario.respond(at), scenario.respond(at), scenario.id);
  }
  const variables = { owner: 'acme', repo: 'widgets', first: 50, after: null };
  for (const scenario of REFRESH_SCENARIOS) {
    assert.deepEqual(scenario.respond(variables, at), scenario.respond(variables, at), scenario.id);
  }
  const corner = JSON.parse((REPORT_SCENARIOS.find((s) => s.id === 'corner')!.respond(at) as { body: string }).body);
  const number = corner.prs[0].number;
  assert.deepEqual(restComments('acme/widgets', number, at), restComments('acme/widgets', number, at));
});

test('DATA-21: the two-repository scenario repeats PR numbers, and the REST mock answers each repository', () => {
  const at = Date.parse(FIXED);
  const report = JSON.parse((REPORT_SCENARIOS.find((s) => s.id === 'two-repos')!.respond(at) as { body: string }).body);
  assert.deepEqual(report.repos, ['acme/widgets', 'acme/gadgets']);
  const numbers = (repo: string) => new Set(report.prs.filter((pr: { repo: string }) => pr.repo === repo).map((pr: { number: number }) => pr.number));
  const repeated = [...numbers('acme/gadgets')].filter((n) => numbers('acme/widgets').has(n));
  assert.ok(repeated.length >= 3, 'numbers repeat: ' + repeated.join(', '));
  assert.notDeepEqual(restComments('acme/gadgets', 101, at), restComments('acme/widgets', 101, at));
  assert.equal(restComments('acme/missing', 101, at), null);
  const mixed = JSON.parse((REPORT_SCENARIOS.find((s) => s.id === 'mixed')!.respond(at) as { body: string }).body);
  assert.deepEqual(mixed.repos, ['acme/widgets'], 'the default board stays one repository');
});

test('DATA-21: the copies of the 300-PR scenario answer comments, as the PRs they copy do', () => {
  const at = Date.parse('2026-10-28T12:00:00Z');
  // Before, the copies were unknown to the REST mock, which answered 404.
  const copies = Array.from({ length: 20 }, (_, i) => restComments('acme/widgets', 20000 + i, at));
  assert.ok(copies.every((copy) => copy !== null));
  assert.ok(copies.some((copy) => copy!.comments.length > 0));
});

test('DATA-8 DATA-9: the GraphQL mock leaves out what the query switches off and keeps the last comments it asks for', () => {
  const ok = REFRESH_SCENARIOS.find((s) => s.id === 'ok')!;
  const at = Date.parse('2026-10-28T12:00:00Z');
  const page = (variables: Record<string, unknown>) => {
    const result = ok.respond({ owner: 'acme', repo: 'widgets', first: 100, after: null, ...variables }, at) as { body: string };
    return JSON.parse(result.body).data.repository.pullRequests.nodes as { comments?: { nodes: unknown[] }; reviews?: unknown }[];
  };
  assert.ok(page({ withComments: false }).every((node) => node.comments === undefined && node.reviews === undefined));
  assert.ok(page({ commentsFetched: 1 }).every((node) => !node.comments || node.comments.nodes.length <= 1));
});
