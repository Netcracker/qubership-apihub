'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createClient, GitHubError, hasWriteAccess } = require('./github')

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
const status = (code, headers = {}, data = { message: 'nope' }) =>
  new Response(JSON.stringify(data), { status: code, headers })

/** A client over a fake fetch that serves `responses` in order and records every call and every sleep. */
function setup(responses, options = {}) {
  const calls = []
  const sleeps = []
  const queue = [...responses]
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: init.body === undefined ? undefined : JSON.parse(init.body) })
    const next = queue.shift()
    assert.ok(next, `unexpected extra request: ${init.method} ${url}`)
    return typeof next === 'function' ? next() : next
  }
  const client = createClient({
    token: 't0ken',
    repo: 'acme/widgets',
    fetchImpl,
    sleep: async (ms) => {
      sleeps.push(ms)
    },
    now: () => 1_000_000,
    ...options,
  })
  return { client, calls, sleeps }
}

test('request sends the standard headers and substitutes {repo}', async () => {
  const { client, calls } = setup([json({ number: 7 })])
  const result = await client.request('GET', '/repos/{repo}/issues/7')
  assert.deepEqual(result, { number: 7 })
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/issues/7')
  assert.equal(calls[0].init.method, 'GET')
  assert.deepEqual(calls[0].init.headers, {
    Authorization: 'Bearer t0ken',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-autonomous-agent',
  })
  assert.equal(calls[0].init.body, undefined)
})

test('request honors accept, apiUrl, and a JSON body', async () => {
  const { client, calls } = setup([json({})], { apiUrl: 'https://ghe.example/api/v3' })
  await client.request('POST', '/repos/{repo}/x', { body: { a: 1 }, accept: 'application/vnd.github.diff' })
  assert.equal(calls[0].url, 'https://ghe.example/api/v3/repos/acme/widgets/x')
  assert.equal(calls[0].init.headers.Accept, 'application/vnd.github.diff')
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json')
  assert.deepEqual(calls[0].body, { a: 1 })
})

test('request encodes the query string and skips undefined values', async () => {
  const { client, calls } = setup([json([])])
  await client.request('GET', '/repos/{repo}/issues', { query: { labels: 'a b,c&d', state: 'open', since: undefined } })
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/issues?labels=a+b%2Cc%26d&state=open')
})

test('request returns null for 204', async () => {
  const { client } = setup([new Response(null, { status: 204 })])
  assert.equal(await client.request('DELETE', '/repos/{repo}/issues/1/labels/x'), null)
})

test('request retries 502 with a backoff and then succeeds', async () => {
  const { client, calls, sleeps } = setup([status(502), status(503), json({ ok: true })])
  assert.deepEqual(await client.request('GET', '/repos/{repo}'), { ok: true })
  assert.equal(calls.length, 3)
  assert.deepEqual(sleeps, [1000, 2000])
})

test('request gives up after three retries and throws the last error', async () => {
  const { client, calls, sleeps } = setup([status(504), status(504), status(504), status(504, {}, { message: 'late' })])
  await assert.rejects(client.request('GET', '/repos/{repo}'), (error) => {
    assert.ok(error instanceof GitHubError)
    assert.equal(error.status, 504)
    assert.deepEqual(error.body, { message: 'late' })
    return true
  })
  assert.equal(calls.length, 4)
  assert.equal(sleeps.length, 3)
})

test('request waits for retry-after on 429 and on 403', async () => {
  const { client, sleeps } = setup([status(429, { 'retry-after': '7' }), status(403, { 'retry-after': '3' }), json({})])
  await client.request('GET', '/repos/{repo}')
  assert.deepEqual(sleeps, [7000, 3000])
})

test('request caps the retry-after wait at 60 seconds', async () => {
  const { client, sleeps } = setup([status(429, { 'retry-after': '600' }), json({})])
  await client.request('GET', '/repos/{repo}')
  assert.deepEqual(sleeps, [60000])
})

test('request on 403 with an exhausted rate limit waits until the reset, capped', async () => {
  const soon = { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1010' }
  const late = { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '999999' }
  const unknown = { 'x-ratelimit-remaining': '0' }
  const { client, sleeps } = setup([status(403, soon), status(403, late), status(403, unknown), json({})])
  await client.request('GET', '/repos/{repo}')
  assert.deepEqual(sleeps, [10000, 60000, 60000])
})

test('request does not retry a plain 403 or a 404', async () => {
  for (const code of [403, 404, 422]) {
    const { client, calls, sleeps } = setup([status(code, {}, { message: 'denied' })])
    await assert.rejects(client.request('GET', '/repos/{repo}/issues/9'), (error) => {
      assert.ok(error instanceof GitHubError)
      assert.equal(error.name, 'GitHubError')
      assert.equal(error.status, code)
      assert.deepEqual(error.body, { message: 'denied' })
      assert.match(error.message, new RegExp(`GET /repos/acme/widgets/issues/9 failed with ${code}: denied`))
      return true
    })
    assert.equal(calls.length, 1)
    assert.deepEqual(sleeps, [])
  }
})

test('request keeps a non-JSON error body as text', async () => {
  const { client } = setup([new Response('gateway exploded', { status: 500 })])
  await assert.rejects(client.request('GET', '/repos/{repo}'), (error) => {
    assert.equal(error.status, 500)
    assert.equal(error.body, 'gateway exploded')
    return true
  })
})

test('paginate follows pages until one has fewer than 100 items', async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }))
  const page2 = Array.from({ length: 30 }, (_, i) => ({ id: 100 + i }))
  const { client, calls } = setup([json(page1), json(page2)])
  const items = await client.paginate('/repos/{repo}/pulls/5/files', { foo: 'bar' })
  assert.equal(items.length, 130)
  assert.equal(items[129].id, 129)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/pulls/5/files?foo=bar&per_page=100&page=1')
  assert.equal(calls[1].url, 'https://api.github.com/repos/acme/widgets/pulls/5/files?foo=bar&per_page=100&page=2')
})

test('paginate stops after one short page and fails on a non-list', async () => {
  const one = setup([json([{ id: 1 }])])
  assert.deepEqual(await one.client.paginate('/repos/{repo}/x'), [{ id: 1 }])
  assert.equal(one.calls.length, 1)

  const bad = setup([json({ message: 'not a list' })])
  await assert.rejects(bad.client.paginate('/repos/{repo}/x'), GitHubError)
})

test('graphql posts the query and returns the payload', async () => {
  const { client, calls } = setup([json({ data: { viewer: { login: 'bot' } } })])
  const result = await client.graphql('query($n:Int!){ x(n:$n) }', { n: 1 })
  assert.deepEqual(result, { data: { viewer: { login: 'bot' } } })
  assert.equal(calls[0].url, 'https://api.github.com/graphql')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(calls[0].body, { query: 'query($n:Int!){ x(n:$n) }', variables: { n: 1 } })
})

test('graphql throws GitHubError when the response has errors', async () => {
  const { client } = setup([json({ data: null, errors: [{ message: 'bad field' }, { message: 'no access' }] })])
  await assert.rejects(client.graphql('{ x }'), (error) => {
    assert.ok(error instanceof GitHubError)
    assert.match(error.message, /bad field; no access/)
    assert.equal(error.body.errors.length, 2)
    return true
  })
})

test('graphql also throws on an HTTP error', async () => {
  const { client } = setup([status(401, {}, { message: 'Bad credentials' })])
  await assert.rejects(client.graphql('{ x }'), (error) => error instanceof GitHubError && error.status === 401)
})

test('getPull, getIssue, and the file and comment lists use the expected paths', async () => {
  const { client, calls } = setup([json({}), json({}), json([{ filename: 'a' }]), json([{ id: 1 }])])
  await client.getPull(3)
  await client.getIssue(4)
  assert.deepEqual(await client.listPullFiles(3), [{ filename: 'a' }])
  assert.deepEqual(await client.listIssueComments(4), [{ id: 1 }])
  assert.deepEqual(
    calls.map((c) => c.url.replace('https://api.github.com/repos/acme/widgets', '')),
    ['/pulls/3', '/issues/4', '/pulls/3/files?per_page=100&page=1', '/issues/4/comments?per_page=100&page=1'],
  )
})

test('listPullCommits reads the commits of a pull request', async () => {
  const { client, calls } = setup([json([{ sha: 'a', commit: { message: 'x' } }])])
  assert.deepEqual(await client.listPullCommits(8), [{ sha: 'a', commit: { message: 'x' } }])
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/pulls/8/commits?per_page=100&page=1')
})

test('searchIssues sends the query and follows pages up to total_count', async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({ number: i }))
  const page2 = Array.from({ length: 20 }, (_, i) => ({ number: 100 + i }))
  const { client, calls } = setup([
    json({ total_count: 120, incomplete_results: false, items: page1 }),
    json({ total_count: 120, incomplete_results: false, items: page2 }),
  ])
  const items = await client.searchIssues('repo:acme/widgets is:pr label:"a:b"')
  assert.equal(items.length, 120)
  assert.equal(calls.length, 2)
  const first = new URL(calls[0].url)
  assert.equal(first.pathname, '/search/issues')
  assert.equal(first.searchParams.get('q'), 'repo:acme/widgets is:pr label:"a:b"')
  assert.equal(first.searchParams.get('per_page'), '100')
  assert.equal(new URL(calls[1].url).searchParams.get('page'), '2')
})

test('searchIssues stops on a full last page and on an empty result', async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ number: i }))
  const exact = setup([json({ total_count: 100, incomplete_results: false, items: full })])
  assert.equal((await exact.client.searchIssues('q')).length, 100)
  assert.equal(exact.calls.length, 1)

  const none = setup([json({ total_count: 0, incomplete_results: false, items: [] })])
  assert.deepEqual(await none.client.searchIssues('q'), [])
})

test('searchIssues throws on more than 1000 results, partial results, and a payload without a list', async () => {
  const many = setup([json({ total_count: 1001, incomplete_results: false, items: [{ number: 1 }] })])
  await assert.rejects(many.client.searchIssues('q'), /1001 results, more than the 1000/)

  const partial = setup([json({ total_count: 1, incomplete_results: true, items: [{ number: 1 }] })])
  await assert.rejects(partial.client.searchIssues('q'), /partial results/)

  const bad = setup([json({ message: 'odd' })])
  await assert.rejects(bad.client.searchIssues('q'), GitHubError)
})

test('createIssueComment and updateIssueComment send the body', async () => {
  const { client, calls } = setup([json({ id: 1 }), json({ id: 1 })])
  await client.createIssueComment(12, 'hello')
  await client.updateIssueComment(99, 'edited')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/issues/12/comments')
  assert.deepEqual(calls[0].body, { body: 'hello' })
  assert.equal(calls[1].init.method, 'PATCH')
  assert.equal(calls[1].url, 'https://api.github.com/repos/acme/widgets/issues/comments/99')
  assert.deepEqual(calls[1].body, { body: 'edited' })
})

test('addLabels posts the labels', async () => {
  const { client, calls } = setup([json([])])
  await client.addLabels(5, ['agent:working', 'bug'])
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/issues/5/labels')
  assert.deepEqual(calls[0].body, { labels: ['agent:working', 'bug'] })
})

test('removeLabel encodes the name and ignores 404', async () => {
  const { client, calls } = setup([new Response(null, { status: 204 }), status(404)])
  await client.removeLabel(5, 'agent: needs work')
  await client.removeLabel(5, 'gone')
  assert.equal(calls[0].init.method, 'DELETE')
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/issues/5/labels/agent%3A%20needs%20work')
  assert.equal(calls.length, 2)
})

test('removeLabel still throws on other errors', async () => {
  const { client } = setup([status(403)])
  await assert.rejects(client.removeLabel(5, 'x'), (error) => error instanceof GitHubError && error.status === 403)
})

test('createReview always sends event COMMENT and RIGHT-side comments', async () => {
  const { client, calls } = setup([json({ id: 1 }), json({ id: 2 })])
  await client.createReview(8, {
    commitId: 'abc123',
    body: 'Summary',
    comments: [{ path: 'a.go', line: 10, side: 'LEFT', body: 'Fix this', event: 'APPROVE' }],
  })
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/pulls/8/reviews')
  assert.deepEqual(calls[0].body, {
    commit_id: 'abc123',
    body: 'Summary',
    event: 'COMMENT',
    comments: [{ path: 'a.go', line: 10, side: 'RIGHT', body: 'Fix this' }],
  })

  await client.createReview(8, { body: 'No inline comments' })
  assert.deepEqual(calls[1].body, { body: 'No inline comments', event: 'COMMENT', comments: [] })
})

test('getPermission prefers role_name, falls back to permission, and maps 404 to none', async () => {
  const { client, calls } = setup([
    json({ permission: 'write', role_name: 'maintain' }),
    json({ permission: 'read' }),
    status(404),
    json({}),
  ])
  assert.equal(await client.getPermission('Alice'), 'maintain')
  assert.equal(await client.getPermission('bob'), 'read')
  assert.equal(await client.getPermission('stranger'), 'none')
  assert.equal(await client.getPermission('empty'), 'none')
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/collaborators/Alice/permission')
})

test('getPermission rethrows errors other than 404', async () => {
  const { client } = setup([status(401)])
  await assert.rejects(client.getPermission('x'), (error) => error instanceof GitHubError && error.status === 401)
})

test('addReaction posts the content to the comment', async () => {
  const { client, calls } = setup([json({ id: 1 })])
  await client.addReaction(77, 'eyes')
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/issues/comments/77/reactions')
  assert.deepEqual(calls[0].body, { content: 'eyes' })
})

test('getAuthenticatedUser reads /user with the token of the client', async () => {
  const { client, calls } = setup([json({ login: 'agent-owner', id: 4242 })])
  assert.deepEqual(await client.getAuthenticatedUser(), { login: 'agent-owner', id: 4242 })
  assert.equal(calls[0].url, 'https://api.github.com/user')
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t0ken')
})

test('createPull posts the title, head, base, body, and draft flag', async () => {
  const { client, calls } = setup([json({ number: 55, html_url: 'https://github.com/acme/widgets/pull/55' })])
  const pull = await client.createPull({ title: 'fix(x): y', head: 'bugfix/1-y', base: 'develop', body: 'B' })
  assert.equal(pull.number, 55)
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/pulls')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(calls[0].body, { title: 'fix(x): y', head: 'bugfix/1-y', base: 'develop', body: 'B', draft: false })
})

test('createPull sends draft: true when asked and surfaces a refusal', async () => {
  const { client, calls } = setup([json({ number: 56 }), status(422, {}, { message: 'Validation Failed' })])
  await client.createPull({ title: 't', head: 'h', base: 'develop', body: 'b', draft: true })
  assert.equal(calls[0].body.draft, true)
  await assert.rejects(
    client.createPull({ title: 't', head: 'h', base: 'develop', body: 'b' }),
    (error) => error instanceof GitHubError && error.status === 422,
  )
})

test('listPulls asks for the open pull requests of a head and follows the pages', async () => {
  const page = Array.from({ length: 100 }, (_, i) => ({ number: i + 1 }))
  const { client, calls } = setup([json(page), json([{ number: 101 }])])
  const pulls = await client.listPulls({ head: 'acme:bugfix/1-x' })
  assert.equal(pulls.length, 101)
  const first = new URL(calls[0].url)
  assert.equal(first.pathname, '/repos/acme/widgets/pulls')
  assert.deepEqual(
    [first.searchParams.get('head'), first.searchParams.get('state'), first.searchParams.get('page')],
    ['acme:bugfix/1-x', 'open', '1'],
  )
})

test('markPullReady sends the GraphQL mutation with the node id and surfaces errors', async () => {
  const { client, calls } = setup([
    json({ data: { markPullRequestReadyForReview: { pullRequest: { isDraft: false } } } }),
    json({ errors: [{ message: 'Resource not accessible' }] }),
  ])
  await client.markPullReady('PR_node1')
  assert.equal(calls[0].url, 'https://api.github.com/graphql')
  assert.match(calls[0].body.query, /markPullRequestReadyForReview\(input: \{ pullRequestId: \$id \}\)/)
  assert.deepEqual(calls[0].body.variables, { id: 'PR_node1' })
  await assert.rejects(
    client.markPullReady('x'),
    (e) => e instanceof GitHubError && /Resource not accessible/.test(e.message),
  )
})

test('updatePull patches the title and the body', async () => {
  const { client, calls } = setup([json({ number: 5 })])
  await client.updatePull(5, { title: 'fix(x): y', body: 'B' })
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/pulls/5')
  assert.equal(calls[0].init.method, 'PATCH')
  assert.deepEqual(calls[0].body, { title: 'fix(x): y', body: 'B' })
})

test('convertPullToDraft sends the GraphQL mutation with the node id', async () => {
  const { client, calls } = setup([json({ data: { convertPullRequestToDraft: { pullRequest: { isDraft: true } } } })])
  await client.convertPullToDraft('PR_node2')
  assert.match(calls[0].body.query, /convertPullRequestToDraft\(input: \{ pullRequestId: \$id \}\)/)
  assert.deepEqual(calls[0].body.variables, { id: 'PR_node2' })
})

test('listCheckRuns reads the latest check run of each name across pages', async () => {
  const page = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `job ${i}` }))
  const { client, calls } = setup([
    json({ total_count: 101, check_runs: page }),
    json({ total_count: 101, check_runs: [{ id: 100, name: 'job 100' }] }),
  ])
  const runs = await client.listCheckRuns('abc123')
  assert.equal(runs.length, 101)
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/repos/acme/widgets/commits/abc123/check-runs')
  assert.equal(url.searchParams.get('filter'), 'latest')
  assert.equal(new URL(calls[1].url).searchParams.get('page'), '2')
})

test('listCheckRuns and getCombinedStatus reject an answer that is not a list', async () => {
  const { client } = setup([json({ message: 'odd' }), json({ state: 'pending' })])
  await assert.rejects(client.listCheckRuns('abc'), /did not return a list/)
  await assert.rejects(client.getCombinedStatus('abc'), /did not return a list/)
})

test('listWorkflowRuns reads the runs of a workflow file across pages with its filters', async () => {
  const page = Array.from({ length: 100 }, (_, i) => ({ id: i, display_title: `AI Autonomous: issue_comment #${i}` }))
  const { client, calls } = setup([
    json({ total_count: 101, workflow_runs: page }),
    json({ total_count: 101, workflow_runs: [{ id: 100 }] }),
  ])
  const filters = { status: 'queued', created: '>=2026-10-26T00:00:00Z' }
  const runs = await client.listWorkflowRuns('ai-autonomous-agent.yml', filters)
  assert.equal(runs.length, 101)
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/repos/acme/widgets/actions/workflows/ai-autonomous-agent.yml/runs')
  assert.equal(url.searchParams.get('status'), 'queued')
  assert.equal(url.searchParams.get('created'), '>=2026-10-26T00:00:00Z')
  assert.equal(new URL(calls[1].url).searchParams.get('page'), '2')
})

test('listWorkflowRuns sends no filter by default and rejects an answer that is not a list', async () => {
  const { client, calls } = setup([json({ total_count: 0, workflow_runs: [] }), json({ message: 'odd' })])
  assert.deepEqual(await client.listWorkflowRuns('ai-autonomous-agent.yml'), [])
  const url = new URL(calls[0].url)
  assert.equal(url.searchParams.has('status'), false)
  assert.equal(url.searchParams.has('created'), false)
  await assert.rejects(client.listWorkflowRuns('ai-autonomous-agent.yml'), /did not return a list/)
})

test('getCombinedStatus returns every status and the combined state', async () => {
  const { client, calls } = setup([
    json({ state: 'pending', statuses: [{ context: 'cla', state: 'success' }, { context: 'x', state: 'pending' }] }),
  ])
  const result = await client.getCombinedStatus('abc123')
  assert.equal(result.state, 'pending')
  assert.deepEqual(result.statuses.map((s) => s.context), ['cla', 'x'])
  assert.equal(new URL(calls[0].url).pathname, '/repos/acme/widgets/commits/abc123/status')
})

test('getJobLog returns the log as text, also when the text is valid JSON', async () => {
  const { client, calls } = setup([
    new Response('2026-10-23T09:00:00Z hello\n', { status: 200 }),
    new Response('{"looks":"like json"}', { status: 200 }),
  ])
  assert.equal(await client.getJobLog(55), '2026-10-23T09:00:00Z hello\n')
  assert.equal(await client.getJobLog(56), '{"looks":"like json"}')
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/actions/jobs/55/logs')
})

test('rerunFailedJobs posts to the run and tolerates the empty answer', async () => {
  const { client, calls } = setup([new Response(null, { status: 201 }), status(403, {}, { message: 'still running' })])
  assert.equal(await client.rerunFailedJobs(900), null)
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/actions/runs/900/rerun-failed-jobs')
  assert.equal(calls[0].init.method, 'POST')
  await assert.rejects(client.rerunFailedJobs(901), (e) => e instanceof GitHubError && e.status === 403)
})

test('cancelRun posts to the run; 409 (already finished) is not an error, other errors are', async () => {
  const { client, calls } = setup([
    new Response(null, { status: 202 }),
    status(409, {}, { message: 'Cannot cancel a workflow run that is completed.' }),
    status(403, {}, { message: 'no' }),
  ])
  assert.equal(await client.cancelRun(900), true)
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/actions/runs/900/cancel')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(await client.cancelRun(901), false)
  await assert.rejects(client.cancelRun(902), (e) => e instanceof GitHubError && e.status === 403)
})

test('replyToReviewComment posts the body to the replies of the comment', async () => {
  const { client, calls } = setup([json({ id: 5 })])
  await client.replyToReviewComment(70, 1234, 'Pushed abc1234.')
  assert.equal(calls[0].url, 'https://api.github.com/repos/acme/widgets/pulls/70/comments/1234/replies')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(calls[0].body, { body: 'Pushed abc1234.' })
})

test('listReviewThreads queries the threads of the pull request and flattens the nodes', async () => {
  const nodes = [
    {
      id: 'T1',
      isResolved: false,
      path: 'backend/x.go',
      line: 12,
      comments: {
        nodes: [{ author: { login: 'bob' }, body: 'Check nil.', databaseId: 501 }, { author: null, body: null }],
      },
    },
    { id: 'T2', isResolved: true, path: null, line: null, comments: { nodes: [] } },
  ]
  const { client, calls } = setup([json({ data: { repository: { pullRequest: { reviewThreads: { nodes } } } } })])
  const threads = await client.listReviewThreads('70')
  assert.equal(calls[0].url, 'https://api.github.com/graphql')
  assert.deepEqual(calls[0].body.variables, { owner: 'acme', name: 'widgets', number: 70 })
  assert.match(calls[0].body.query, /reviewThreads\(first: 100\)/)
  assert.deepEqual(threads, [
    {
      id: 'T1',
      isResolved: false,
      path: 'backend/x.go',
      line: 12,
      comments: [
        { author: 'bob', body: 'Check nil.', databaseId: 501 },
        { author: 'unknown', body: '', databaseId: null },
      ],
    },
    { id: 'T2', isResolved: true, path: '', line: null, comments: [] },
  ])
})

test('listReviewThreads fails when the answer holds no threads', async () => {
  const { client } = setup([json({ data: { repository: { pullRequest: null } } })])
  await assert.rejects(
    client.listReviewThreads(70),
    (e) => e instanceof GitHubError && /review threads of #70/.test(e.message),
  )
})

test('hasWriteAccess accepts admin, maintain, and write only', () => {
  for (const permission of ['admin', 'maintain', 'write']) {
    assert.equal(hasWriteAccess(permission), true, permission)
  }
  for (const permission of ['triage', 'read', 'none', '', undefined, null]) {
    assert.equal(hasWriteAccess(permission), false, String(permission))
  }
})
