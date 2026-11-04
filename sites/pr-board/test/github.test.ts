import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOpenPullRequests } from '../src/github/graphql.ts';
import {
  COMMENT_BODY_LIMIT, failedChecks, normalizeLabel, normalizePullRequest, recentComments, reviewState,
} from '../src/github/normalize.ts';
import { fetchAllComments } from '../src/github/rest.ts';
import type { RawPullRequest } from '../src/github/raw.ts';
import { REFRESH_SCENARIOS } from '../dev/scenarios/refresh.ts';

const repository = { owner: 'acme', name: 'widgets' };
const gadgets = { owner: 'acme', name: 'gadgets' };
const missing = { owner: 'acme', name: 'missing' };

const baseNode: RawPullRequest = {
  number: 1,
  title: 't',
  url: 'u',
  isDraft: false,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  baseRefName: 'main',
  mergeable: 'MERGEABLE',
  author: { __typename: 'User', login: 'a', avatarUrl: 'x' },
};

test('RULE-2: requested changes win over approvals', () => {
  const result = reviewState([
    { state: 'APPROVED', author: { login: 'a' } },
    { state: 'CHANGES_REQUESTED', author: { login: 'b' } },
  ]);
  assert.equal(result, 'changes_requested');
});

test('RULE-2: a dismissed review is not an approval', () => {
  assert.equal(reviewState([{ state: 'DISMISSED', author: { login: 'a' } }]), 'none');
});

test('DATA-10: recent comments mix issue comments and reviews, newest first, skipping empty bodies', () => {
  const list = recentComments(
    [{ createdAt: '2026-10-02T00:00:00Z', body: 'old', author: null }, { createdAt: '2026-10-04T00:00:00Z', body: '  ', author: null }],
    [{ submittedAt: '2026-10-03T00:00:00Z', body: 'review', url: 'r-url', author: { __typename: 'User', login: 'r', avatarUrl: null } }],
  );
  assert.deepEqual(list.map((c) => c.body), ['review', 'old']);
  assert.equal(list[0].author?.login, 'r');
  assert.equal(list[0].url, 'r-url');
});

test('DATA-10: comments that hold only HTML comment markers are skipped', () => {
  const list = recentComments(
    [{ createdAt: '2026-10-02T00:00:00Z', body: 'real', author: null }, { createdAt: '2026-10-04T00:00:00Z', body: '<!-- sonar:marker -->\n', author: null }],
    [],
  );
  assert.deepEqual(list.map((c) => c.body), ['real']);
});

test('DATA-10: long comment bodies are cut and marked', () => {
  const [comment] = recentComments([{ createdAt: '2026-10-02T00:00:00Z', body: 'x'.repeat(COMMENT_BODY_LIMIT + 10), author: null }], []);
  assert.equal(comment.truncated, true);
  assert.equal(comment.body.length, COMMENT_BODY_LIMIT + 1);
});

test('DATA-11: label colors are validated and lowercased', () => {
  assert.equal(normalizeLabel({ name: 'a', color: 'D4C5F9' }).color, 'd4c5f9');
  assert.equal(normalizeLabel({ name: 'a', color: 'red' }).color, null);
  assert.equal(normalizeLabel({ name: 'a', color: null }).description, '');
});

test('DATA-12: missing connections and null entries normalize to safe defaults', () => {
  const pr = normalizePullRequest({ ...baseNode, author: null, mergeable: null, assignees: { nodes: [null] }, commits: { nodes: [null] } });
  assert.equal(pr.author, null);
  assert.equal(pr.ci, 'none');
  assert.equal(pr.mergeable, 'unknown');
  assert.deepEqual(pr.assignees, []);
  assert.deepEqual(pr.issues, []);
  assert.deepEqual(pr.projects, []);
  assert.deepEqual(pr.comments, []);
  assert.deepEqual(pr.labels, []);
  assert.deepEqual(pr.requestedReviewers, []);
});

test('RULE-1: check rollup states map to CI states', () => {
  const ci = (state: string) => normalizePullRequest({ ...baseNode, commits: { nodes: [{ commit: { statusCheckRollup: { state } } }] } }).ci;
  assert.equal(ci('SUCCESS'), 'passing');
  assert.equal(ci('ERROR'), 'failing');
  assert.equal(ci('EXPECTED'), 'running');
});

test('RULE-10: bots are flagged from the GraphQL type name', () => {
  const pr = normalizePullRequest({ ...baseNode, author: { __typename: 'Bot', login: 'dependabot', avatarUrl: null } });
  assert.equal(pr.author?.bot, true);
});

// Run fetchOpenPullRequests against the dev mock scenarios, so the mock and the client stay in sync.
function mockFetch(scenarioId: string) {
  const scenario = REFRESH_SCENARIOS.find((s) => s.id === scenarioId)!;
  let calls = 0;
  const fetchImpl = async (_url: string, init: RequestInit) => {
    calls += 1;
    const result = scenario.respond(JSON.parse(String(init.body)).variables, Date.parse('2026-10-28T12:00:00Z'));
    if (result.destroy) throw new TypeError('Failed to fetch');
    return new Response(result.body, { status: result.status });
  };
  return { fetchImpl, calls: () => calls };
}

test('DATA-9: pagination collects every page', async () => {
  const single = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('ok').fetchImpl });
  const paged = mockFetch('paginated');
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: paged.fetchImpl });
  assert.ok(paged.calls() > 1);
  assert.equal(report.prs.length, single.prs.length);
  assert.deepEqual(report.warnings, []);
});

test('DATA-14: a forbidden projects field becomes a warning and unknown projects', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('projects-error').fetchImpl });
  assert.equal(report.warnings.length, 1);
  assert.ok(report.prs.every((pr) => pr.projects === null));
});

test('DATA-15: a short page against totalCount is reported', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('count-mismatch').fetchImpl });
  assert.match(report.warnings[0], /reported \d+ open pull requests but returned \d+/);
});

test('DATA-13: HTTP and GraphQL failures throw readable errors', async () => {
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('unauthorized').fetchImpl }), { status: 401 });
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('server-error').fetchImpl }), /HTTP 502/);
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('repo-not-found').fetchImpl }), /at repository/);
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('network').fetchImpl }), /Cannot reach api.github.com/);
  await assert.rejects(fetchOpenPullRequests({ token: '', repositories: [repository] }), /token is required/);
});

test('RULE-4: failed checks keep real failures and skip cancelled and passing runs', () => {
  const result = failedChecks({
    state: 'FAILURE',
    contexts: {
      totalCount: 5,
      pageInfo: { hasNextPage: false },
      nodes: [
        { __typename: 'CheckRun', name: 'lint', conclusion: 'FAILURE', detailsUrl: 'u', checkSuite: { workflowRun: { workflow: { name: 'Lint' } } } },
        { __typename: 'CheckRun', name: 'e2e', conclusion: 'TIMED_OUT', detailsUrl: null, checkSuite: null },
        { __typename: 'CheckRun', name: 'old', conclusion: 'CANCELLED', checkSuite: null },
        { __typename: 'CheckRun', name: 'unit', conclusion: 'SUCCESS', checkSuite: null },
        { __typename: 'StatusContext', context: 'sonar', state: 'ERROR', targetUrl: 's', description: 'gate failed' },
      ],
    },
  });
  assert.ok(result);
  assert.deepEqual(result.failed.map((c) => [c.name, c.workflow, c.conclusion]), [['lint', 'Lint', 'failure'], ['e2e', null, 'timed_out'], ['sonar', null, 'error']]);
  assert.equal(result.complete, true);
  assert.equal(failedChecks({ state: 'FAILURE' }), null);
});

test('DATA-9: checks are attached only to failing PRs', () => {
  const contexts = { totalCount: 0, pageInfo: { hasNextPage: false }, nodes: [] };
  const withRollup = (state: string) => normalizePullRequest({ ...baseNode, commits: { nodes: [{ commit: { statusCheckRollup: { state, contexts } } }] } });
  assert.deepEqual(withRollup('FAILURE').checks, { failed: [], total: 0, complete: true });
  assert.equal(withRollup('SUCCESS').checks, null);
});

test('DATA-8: hidden columns drop their parts of the query', async () => {
  const sent: Record<string, unknown>[] = [];
  const fetchImpl = async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)).variables);
    return mockFetch('ok').fetchImpl(_url, init);
  };
  await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl });
  await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl, parts: { checks: false, comments: false } });
  assert.deepEqual([sent[0].withChecks, sent[0].withComments], [true, true]);
  assert.deepEqual([sent.at(-1)!.withChecks, sent.at(-1)!.withComments], [false, false]);
});

const restUrl = 'https://api.test';
function restFetch(pages: Record<string, { body: unknown; status?: number; headers?: Record<string, string> }>) {
  const requested: { url: string; auth: string | undefined }[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    requested.push({ url, auth: (init.headers as Record<string, string>).Authorization });
    const page = pages[url] || { body: { message: 'Not Found' }, status: 404 };
    return new Response(JSON.stringify(page.body), { status: page.status || 200, headers: page.headers });
  };
  return { fetchImpl, requested };
}

test('PANEL-10: all comments: issue comments and reviews merge newest first, across pages, without cutting', async () => {
  const comments = restUrl + '/repos/acme/widgets/issues/7/comments';
  const reviews = restUrl + '/repos/acme/widgets/pulls/7/reviews';
  const long = 'x'.repeat(COMMENT_BODY_LIMIT + 10);
  const { fetchImpl, requested } = restFetch({
    [comments + '?per_page=100']: {
      body: [{ created_at: '2026-10-01T00:00:00Z', body: 'first', html_url: 'c1', user: { login: 'a', avatar_url: 'https://avatars.test/u/1?v=4', type: 'User' } }],
      headers: { link: '<' + comments + '?per_page=100&page=2>; rel="next", <' + comments + '?per_page=100&page=2>; rel="last"' },
    },
    [comments + '?per_page=100&page=2']: { body: [{ created_at: '2026-10-03T00:00:00Z', body: long, user: { login: 'bot', type: 'Bot' } }] },
    [reviews + '?per_page=100']: { body: [{ submitted_at: '2026-10-02T00:00:00Z', body: 'review', user: { login: 'r' } }, { submitted_at: '2026-10-04T00:00:00Z', body: '', user: null }] },
  });
  const result = await fetchAllComments({ number: 7, repository, fetchImpl, restUrl });
  assert.deepEqual(result.comments.map((c) => c.body.slice(0, 6)), ['xxxxxx', 'review', 'first']);
  assert.equal(result.comments[0].body.length, COMMENT_BODY_LIMIT + 10);
  assert.equal(result.comments[0].author?.bot, true);
  assert.equal(result.comments[2].author?.avatarUrl, 'https://avatars.test/u/1?v=4&s=48');
  assert.equal(result.complete, true);
  assert.equal(requested.length, 3);
  assert.ok(requested.every((r) => r.auth === undefined));
});

test('PANEL-11: all comments: the token is sent when there is one, and a used-up anonymous limit says to add a token', async () => {
  const limited = { body: { message: 'API rate limit exceeded' }, status: 403, headers: { 'x-ratelimit-remaining': '0' } };
  const comments = restUrl + '/repos/acme/widgets/issues/7/comments?per_page=100';
  const reviews = restUrl + '/repos/acme/widgets/pulls/7/reviews?per_page=100';
  const anonymous = restFetch({ [comments]: limited, [reviews]: { body: [] } });
  await assert.rejects(fetchAllComments({ number: 7, repository, fetchImpl: anonymous.fetchImpl, restUrl }), /Add a token in Settings/);
  const withToken = restFetch({ [comments]: { body: [] }, [reviews]: { body: [] } });
  await fetchAllComments({ number: 7, repository, token: 't', fetchImpl: withToken.fetchImpl, restUrl });
  assert.ok(withToken.requested.every((r) => r.auth === 'Bearer t'));
});

test('RULE-3: mergeability maps to No conflicts, Conflicts, or Checking', () => {
  const merge = (mergeable: string | null) => normalizePullRequest({ ...baseNode, mergeable }).mergeable;
  assert.equal(merge('MERGEABLE'), 'clean');
  assert.equal(merge('CONFLICTING'), 'conflicts');
  assert.equal(merge('UNKNOWN'), 'unknown');
  assert.equal(merge(null), 'unknown');
});

test('DATA-13: a GraphQL answer that is not JSON fails with a readable message', async () => {
  const fetchImpl = async () => new Response('<html>Gateway</html>', { status: 200 });
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl }), /response that is not JSON/);
});

test('PANEL-11: the comments panel reports a network failure and other HTTP errors', async () => {
  const offline = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(fetchAllComments({ number: 7, repository, fetchImpl: offline, restUrl }), /Cannot reach api.github.com: Failed to fetch/);
  const failing = async () => new Response('{}', { status: 500 });
  await assert.rejects(fetchAllComments({ number: 7, repository, fetchImpl: failing, restUrl }), /GitHub API returned HTTP 500/);
  const rejected = async () => new Response('{}', { status: 401 });
  await assert.rejects(fetchAllComments({ number: 7, repository, fetchImpl: rejected, restUrl }), /rejected the token/);
});

test('DATA-19: the client names the repository on the report and on every PR', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('ok').fetchImpl });
  assert.deepEqual(report.repos, ['acme/widgets']);
  assert.ok(report.prs.length > 0);
  assert.ok(report.prs.every((pr) => pr.repo === 'acme/widgets'));
  assert.equal(normalizePullRequest(baseNode, { repo: 'acme/gadgets' }).repo, 'acme/gadgets');
});

test('DATA-18: every repository is read, and the PRs come newest first across them', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository, gadgets], fetchImpl: mockFetch('ok').fetchImpl });
  assert.deepEqual(report.repos, ['acme/widgets', 'acme/gadgets']);
  assert.equal(new Set(report.prs.map((pr) => pr.repo)).size, 2);
  const times = report.prs.map((pr) => pr.createdAt);
  assert.deepEqual(times, [...times].sort().reverse());
  assert.deepEqual(report.warnings, []);
});

test('DATA-18: a repository that cannot be read is a warning, and the others load', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [missing, repository], fetchImpl: mockFetch('ok').fetchImpl });
  assert.deepEqual(report.repos, ['acme/widgets']);
  assert.ok(report.prs.length > 0);
  assert.deepEqual(report.warnings, ['Repository acme/missing was not found, or the token cannot read it.']);
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [missing], fetchImpl: mockFetch('ok').fetchImpl }), /at repository/);
});

test('DATA-18: a repository the organization blocks is a warning with the reason GitHub gives, and the others load', async () => {
  const blocked = { owner: 'acme', name: 'private' };
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository, blocked], fetchImpl: mockFetch('ok').fetchImpl });
  assert.deepEqual(report.repos, ['acme/widgets']);
  assert.deepEqual(report.warnings, ['Repository acme/private cannot be read with this token: Resource protected by organization SAML enforcement.']);
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [blocked], fetchImpl: mockFetch('ok').fetchImpl }), /at repository: Resource protected/);
  const upper = await fetchOpenPullRequests({ token: 't', repositories: [{ owner: 'ACME', name: 'Gadgets' }], fetchImpl: mockFetch('ok').fetchImpl });
  assert.ok(upper.prs.length > 0, 'names compare without case, as on GitHub');
});

test('DATA-15 DATA-18: with several repositories, a short page names its repository', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository, gadgets], fetchImpl: mockFetch('count-mismatch').fetchImpl });
  assert.match(report.warnings[0], /^GitHub reported \d+ open pull requests in acme\/widgets but returned \d+\.$/);
});

test('SEC-1 PANEL-11: the token follows next pages only within the API, and a body that is not a list fails readably', async () => {
  const comments = restUrl + '/repos/acme/widgets/issues/7/comments?per_page=100';
  const reviews = restUrl + '/repos/acme/widgets/pulls/7/reviews?per_page=100';
  const elsewhere = restFetch({
    [comments]: { body: [], headers: { link: '<https://evil.test/collect?page=2>; rel="next"' } },
    [reviews]: { body: [] },
  });
  const result = await fetchAllComments({ number: 7, repository, token: 't', fetchImpl: elsewhere.fetchImpl, restUrl });
  assert.equal(result.complete, false);
  // GitHub's next links may name the repository by id; they stay within the API, so they are followed.
  const byId = restUrl + '/repositories/42/issues/7/comments?per_page=100&page=2';
  const moved = restFetch({ [comments]: { body: [], headers: { link: '<' + byId + '>; rel="next"' } }, [byId]: { body: [] }, [reviews]: { body: [] } });
  assert.equal((await fetchAllComments({ number: 7, repository, token: 't', fetchImpl: moved.fetchImpl, restUrl })).complete, true);
  assert.ok(moved.requested.some((r) => r.url === byId));
  assert.ok(elsewhere.requested.every((r) => r.url.startsWith(restUrl + '/')), 'nothing went to another host');
  const notList = restFetch({ [comments]: { body: { message: 'odd' } }, [reviews]: { body: [] } });
  await assert.rejects(fetchAllComments({ number: 7, repository, fetchImpl: notList.fetchImpl, restUrl }), /not a list/);
});

test('DATA-9 DATA-13 DATA-27: a page GitHub cannot answer in time is asked again with fewer PRs, down to five', async () => {
  const sizes: number[] = [];
  const scenario = REFRESH_SCENARIOS.find((s) => s.id === 'ok')!;
  // GitHub times out on pages above 7 PRs: a 504 without CORS headers, which the browser reports as a failed fetch.
  const fetchImpl = async (_url: string, init: RequestInit) => {
    const variables = JSON.parse(String(init.body)).variables;
    sizes.push(variables.first);
    if (variables.first > 7) {
      if (sizes.length % 2) throw new TypeError('Failed to fetch');
      return new Response('Gateway Timeout', { status: 504 });
    }
    const result = scenario.respond(variables, Date.parse('2026-10-28T12:00:00Z'));
    return new Response((result as { body: string }).body, { status: 200 });
  };
  const notes: string[] = [];
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl, onProgress: (e) => { if (e.note) notes.push(e.note); } });
  // DATA-27: the loading status says why the load slows down.
  // A failed fetch may be a network failure too, so it says less than a 504 does.
  assert.deepEqual(notes, ['GitHub did not answer; asking for 10 pull requests a page', 'GitHub timed out; asking for 5 pull requests a page']);
  const full = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('ok').fetchImpl });
  assert.equal(report.prs.length, full.prs.length);
  assert.deepEqual(sizes.slice(0, 3), [20, 10, 5]);
  assert.ok(sizes.slice(3).every((size) => size === 5), 'later pages keep the size that worked');
  const never = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: never }), /Cannot reach api\.github\.com/);
});

test('DATA-9 DATA-11: a linked issue keeps its type and labels; an unknown type color and a missing type are handled', () => {
  const pr = normalizePullRequest({
    ...baseNode,
    closingIssuesReferences: { nodes: [
      { number: 5, title: 'Typed', url: 'u', issueType: { name: 'Bug', color: 'RED' }, labels: { nodes: [{ name: 'customer', color: 'D93F0B' }, null] } },
      { number: 6, title: 'Teal', url: 'u', issueType: { name: 'Epic', color: 'TEAL' } },
      { number: 7, title: 'Untyped', url: 'u', issueType: null },
    ] },
  });
  assert.deepEqual(pr.issues.map((i) => i.type), [{ name: 'Bug', color: 'red' }, { name: 'Epic', color: null }, null]);
  assert.deepEqual(pr.issues[0].labels, [{ name: 'customer', color: 'd93f0b', description: '' }]);
  assert.deepEqual(pr.issues[2].labels, []);
});

test('DATA-25: the project fields come from the first project that sets each one, and broken values are dropped', () => {
  const pr = normalizePullRequest({
    ...baseNode,
    closingIssuesReferences: { nodes: [
      { number: 5, title: 'Planned', url: 'u', projectItems: { nodes: [
        { priority: { name: 'Urgent', color: 'PURPLE' }, estimate: {}, sprint: null },
        { priority: { name: 'Low', color: 'GRAY' }, estimate: { number: 13 }, sprint: { title: 'Sprint 42', startDate: '2026-10-25', duration: 14 } },
        null,
      ] } },
      { number: 6, title: 'Odd', url: 'u', projectItems: { nodes: [{ priority: { color: 'RED' }, sprint: { title: 'S', startDate: 'soon', duration: 14 } }] } },
      { number: 7, title: 'Unplanned', url: 'u' },
    ] },
  });
  assert.deepEqual(pr.issues.map((i) => [i.priority, i.estimate, i.sprint]), [
    [{ name: 'Urgent', color: 'purple' }, 13, { title: 'Sprint 42', startDate: '2026-10-25', duration: 14 }],
    [null, null, null],
    [null, null, null],
  ]);
});

test('DATA-25 DATA-14: project fields the token cannot read are a warning, the page is asked again without them, and issues stay', async () => {
  const scenario = REFRESH_SCENARIOS.find((s) => s.id === 'ok')!;
  const asked: boolean[] = [];
  const fetchImpl = async (_url: string, init: RequestInit) => {
    const variables = JSON.parse(String(init.body)).variables;
    asked.push(variables.withProjectFields);
    const result = scenario.respond(variables, Date.parse('2026-10-28T12:00:00Z'));
    const body = JSON.parse((result as { body: string }).body);
    if (variables.withProjectFields) {
      // projectItems is non-null, so GitHub nulls the issue that holds the refused field.
      for (const node of body.data.repository.pullRequests.nodes) {
        if (node.closingIssuesReferences) node.closingIssuesReferences.nodes = node.closingIssuesReferences.nodes.map(() => null);
      }
      body.errors = [{ type: 'FORBIDDEN', path: ['repository', 'pullRequests', 'nodes', 0, 'closingIssuesReferences', 'nodes', 0, 'projectItems'], message: 'Resource not accessible by integration' }];
    }
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl });
  const full = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('ok').fetchImpl });
  assert.deepEqual(report.prs.map((pr) => pr.issues.length), full.prs.map((pr) => pr.issues.length), 'no issue is lost');
  assert.ok(report.prs.every((pr) => pr.issues.every((issue) => issue.priority === null && issue.sprint === null)));
  assert.deepEqual(asked.slice(0, 2), [true, false]);
  assert.ok(asked.slice(1).every((value) => value === false), 'later pages skip the fields too');
  assert.deepEqual(report.warnings, ['Project fields (Priority, Estimate, Sprint) are unavailable for this token: Resource not accessible by integration']);
});

test('DATA-18: repositories are read four at a time, and the report keeps their order', async () => {
  const scenario = REFRESH_SCENARIOS.find((s) => s.id === 'ok')!;
  let inFlight = 0;
  let most = 0;
  const missing = Array.from({ length: 6 }, (_, i) => ({ owner: 'acme', name: 'missing-' + i }));
  const fetchImpl = async (_url: string, init: RequestInit) => {
    const variables = JSON.parse(String(init.body)).variables;
    inFlight += 1;
    most = Math.max(most, inFlight);
    // Earlier repositories answer later, so a report built in the order answers arrive would come out reversed.
    const index = missing.findIndex((m) => m.name === variables.repo);
    await new Promise((resolve) => setTimeout(resolve, index < 0 ? 1 : (missing.length - index) * 4));
    inFlight -= 1;
    const result = scenario.respond(variables, Date.parse('2026-10-28T12:00:00Z'));
    return new Response((result as { body: string }).body, { status: 200 });
  };
  const report = await fetchOpenPullRequests({ token: 't', repositories: [...missing, gadgets, repository], fetchImpl });
  assert.equal(most, 4);
  assert.deepEqual(report.repos, ['acme/gadgets', 'acme/widgets']);
  assert.deepEqual(report.warnings.map((w) => w.match(/missing-\d/)?.[0]), missing.map((m) => m.name));
});

test('DATA-18 DATA-13: when one repository fails, the other reads stop instead of going through the whole list', async () => {
  let fetches = 0;
  const fetchImpl = async (_url: string, init: RequestInit) => {
    fetches += 1;
    const variables = JSON.parse(String(init.body)).variables;
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (variables.repo === 'broken') return new Response(JSON.stringify({ errors: [{ message: 'Something went wrong', path: ['repository', 'pullRequests'] }], data: { repository: null } }), { status: 200 });
    return new Response(JSON.stringify({ data: { repository: null }, errors: [{ type: 'NOT_FOUND', path: ['repository'], message: 'missing' }] }), { status: 200 });
  };
  const many = Array.from({ length: 30 }, (_, i) => ({ owner: 'acme', name: 'missing-' + i }));
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [{ owner: 'acme', name: 'broken' }, ...many], fetchImpl }), /Something went wrong/);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(fetches <= 8, 'only the reads already started finish; got ' + fetches);
});

test('DATA-26: a live load names the viewer, the token owner, with their avatar', async () => {
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository, gadgets], fetchImpl: mockFetch('ok').fetchImpl });
  assert.deepEqual(report.viewer, { login: 'boris-k', avatarUrl: null, bot: false });
});

test('DATA-27: a live load reports each repository page by page, ending in done', async () => {
  const events: { repo: string; status: string; read: number; total: number | null }[] = [];
  const report = await fetchOpenPullRequests({
    token: 't', repositories: [repository, gadgets], fetchImpl: mockFetch('ok').fetchImpl,
    onProgress: ({ repo, status, read, total }) => events.push({ repo, status, read, total }),
  });
  for (const repo of report.repos) {
    const mine = events.filter((e) => e.repo === repo);
    assert.deepEqual(mine[0], { repo, status: 'reading', read: 0, total: null });
    const last = mine.at(-1)!;
    assert.equal(last.status, 'done');
    assert.equal(last.read, report.prs.filter((pr) => pr.repo === repo).length);
    assert.ok(mine.slice(1, -1).every((e) => e.status === 'reading' && e.read < last.read), repo + ' pages grow');
  }
});

test('DATA-26: a load for a snapshot does not ask GitHub for the viewer', async () => {
  const asked: unknown[] = [];
  const { fetchImpl } = mockFetch('ok');
  const spy: typeof fetchImpl = (url, init) => { asked.push(JSON.parse(String(init!.body)).variables.withViewer); return fetchImpl(url, init); };
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: spy, withViewer: false });
  assert.equal(report.viewer, undefined);
  assert.ok(asked.length > 0 && asked.every((value) => value === false));
});

test('DATA-18 DATA-13: a repository being read stops at its next page once another one fails', async () => {
  const scenario = REFRESH_SCENARIOS.find((s) => s.id === 'paginated')!;
  let inFlight = 0;
  const fetchImpl = async (_url: string, init: RequestInit) => {
    const variables = JSON.parse(String(init.body)).variables;
    inFlight += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    if (variables.repo === 'broken') return new Response(JSON.stringify({ errors: [{ message: 'Something went wrong', path: ['repository', 'pullRequests'] }], data: { repository: null } }), { status: 200 });
    const result = scenario.respond(variables, Date.parse('2026-10-28T12:00:00Z'));
    return new Response((result as { body: string }).body, { status: 200 });
  };
  const widgets: { read: number; total: number | null }[] = [];
  await assert.rejects(fetchOpenPullRequests({
    token: 't', repositories: [{ owner: 'acme', name: 'broken' }, repository], fetchImpl,
    onProgress: (e) => { if (e.repo === 'acme/widgets') widgets.push({ read: e.read, total: e.total }); },
  }), /Something went wrong/);
  // Wait until no request is left, however slow the machine: the read either stopped or went to the end.
  while (inFlight) await new Promise((resolve) => setTimeout(resolve, 5));
  await new Promise((resolve) => setTimeout(resolve, 5));
  const last = widgets.at(-1)!;
  assert.ok(last.total !== null && last.read < last.total, 'the read stopped before its last page; got ' + JSON.stringify(last));
});

// A fetch that answers each query from a function of its variables.
function answering(answer: (variables: Record<string, unknown>) => unknown) {
  const seen: Record<string, unknown>[] = [];
  const fetchImpl = async (_url: string, init: RequestInit) => {
    const variables = JSON.parse(String(init.body)).variables;
    seen.push(variables);
    return new Response(JSON.stringify(answer(variables)), { status: 200 });
  };
  return { fetchImpl, seen };
}

const page = (prs: RawPullRequest[], after: string | null, extra: Record<string, unknown> = {}) => ({
  data: { repository: { ...extra, pullRequests: { totalCount: 2, pageInfo: { hasNextPage: !!after, endCursor: after }, nodes: prs } } },
});

test('DATA-25: when project fields are refused on a later page, the repository is read again from the start without them', async () => {
  const { fetchImpl, seen } = answering((v) => {
    if (!v.after && v.withProjectFields) return page([{ ...baseNode, number: 2 }], 'p2');
    if (v.after && v.withProjectFields) {
      return { ...page([{ ...baseNode, number: 1 }], null), errors: [{ message: 'no', path: ['repository', 'pullRequests', 'nodes', 0, 'closingIssuesReferences', 'nodes', 0, 'projectItems'] }] };
    }
    return v.after ? page([{ ...baseNode, number: 1 }], null) : page([{ ...baseNode, number: 2 }], 'p2');
  });
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl });
  assert.deepEqual(seen.map((v) => [v.after, v.withProjectFields]), [[null, true], ['p2', true], [null, false], ['p2', false]]);
  assert.deepEqual(report.prs.map((pr) => pr.number), [2, 1]);
  assert.ok(report.warnings.some((w) => w.startsWith('Project fields')));
});

test('DATA-20: PRs take GitHub\'s spelling of the repository name, and the viewer is asked for on the first page only', async () => {
  const { fetchImpl, seen } = answering((v) => (v.after ? page([baseNode], null, { nameWithOwner: 'Acme/Widgets' })
    : page([{ ...baseNode, number: 2 }], 'p2', { nameWithOwner: 'Acme/Widgets' })));
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl });
  assert.deepEqual(report.repos, ['Acme/Widgets']);
  assert.ok(report.prs.every((pr) => pr.repo === 'Acme/Widgets'));
  assert.deepEqual(seen.map((v) => v.withViewer), [true, false]);
  // A different repository, such as one renamed on GitHub, keeps the requested name.
  const renamed = answering(() => page([baseNode], null, { nameWithOwner: 'acme/sprockets' }));
  assert.deepEqual((await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: renamed.fetchImpl })).repos, ['acme/widgets']);
});

test('DATA-18: a repository answered as null without errors is a warning among several, and no repositories is an error', async () => {
  const { fetchImpl } = answering((v) => (v.repo === 'widgets' ? page([baseNode], null) : { data: { repository: null } }));
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository, gadgets], fetchImpl });
  assert.deepEqual(report.repos, ['acme/widgets']);
  assert.ok(report.warnings.includes('Repository acme/gadgets was not found, or the token cannot read it.'));
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [gadgets], fetchImpl }), /acme\/gadgets was not found/);
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [], fetchImpl }), /No repositories to read/);
});

test('DATA-7: an aborted load stops reading and says it was replaced', async () => {
  const controller = new AbortController();
  let calls = 0;
  const fetchImpl = async (_url: string, init: RequestInit) => {
    calls += 1;
    controller.abort();
    if (init.signal && init.signal.aborted) throw new DOMException('aborted', 'AbortError');
    return new Response('{}', { status: 200 });
  };
  await assert.rejects(fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl, signal: controller.signal }), { name: 'LoadAborted' });
  assert.equal(calls, 1);
});

test('DATA-9: a mannequin among requested reviewers is skipped, since it has no login', () => {
  const pr = normalizePullRequest({ ...baseNode, reviewRequests: { nodes: [
    { requestedReviewer: { __typename: 'Mannequin' } },
    { requestedReviewer: { __typename: 'User', login: 'boris-k' } },
  ] } });
  assert.deepEqual(pr.requestedReviewers.map((r) => r.login), ['boris-k']);
});

test('SEC-3: a failed check links only to an https address', () => {
  const contexts = { totalCount: 2, nodes: [
    { __typename: 'StatusContext', context: 'gate', state: 'FAILURE', targetUrl: 'javascript:alert(1)' },
    { __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', detailsUrl: 'https://ci.example/1' },
  ] };
  const checks = failedChecks({ state: 'FAILURE', contexts } as never)!;
  assert.deepEqual(checks.failed.map((c) => c.url), [null, 'https://ci.example/1']);
});

test('DATA-10: a cut body never splits a two-unit character or leaves an HTML comment open', () => {
  const emoji = 'x'.repeat(COMMENT_BODY_LIMIT - 1) + '😀tail';
  const [cut] = recentComments([{ createdAt: '2026-10-01T00:00:00Z', body: emoji }], []);
  assert.ok(!/[\ud800-\udbff]…$/.test(cut.body), 'no lone high surrogate before the ellipsis');
  const comment = 'Intro ' + '<!-- ' + 'h'.repeat(COMMENT_BODY_LIMIT) + ' -->';
  const [open] = recentComments([{ createdAt: '2026-10-01T00:00:00Z', body: comment }], []);
  assert.equal(open.body, 'Intro…');
  assert.equal(open.truncated, true);
});

test('DATA-25: the mock that refuses project fields on a later page leads to a complete read without them', async () => {
  const { fetchImpl } = mockFetch('fields-error');
  const report = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl });
  const full = await fetchOpenPullRequests({ token: 't', repositories: [repository], fetchImpl: mockFetch('ok').fetchImpl });
  assert.equal(report.prs.length, full.prs.length);
  assert.ok(report.prs.every((pr) => pr.issues.every((issue) => issue.priority === null && issue.sprint === null)));
  assert.ok(report.warnings.some((w) => w.startsWith('Project fields')));
});
