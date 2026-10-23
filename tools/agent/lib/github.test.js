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

test('hasWriteAccess accepts admin, maintain, and write only', () => {
  for (const permission of ['admin', 'maintain', 'write']) {
    assert.equal(hasWriteAccess(permission), true, permission)
  }
  for (const permission of ['triage', 'read', 'none', '', undefined, null]) {
    assert.equal(hasWriteAccess(permission), false, String(permission))
  }
})
