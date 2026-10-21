const { test } = require('node:test')
const assert = require('node:assert/strict')
const { GraphqlError, createClient, parseRepoUrl } = require('./github')

const answer = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (name) => headers[name] ?? null },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
})

function client(responses, options = {}) {
  const calls = []
  const fetch = async (url, init) => {
    calls.push(JSON.parse(init.body))
    const next = responses.shift()
    if (next instanceof Error) throw next
    return next
  }
  return { calls, client: createClient({ token: 't', fetch, sleep: async () => {}, ...options }) }
}

test('createClient requires a token', () => {
  assert.throws(() => createClient({ token: '' }), GraphqlError)
})

test('graphql returns data and retries network errors, 5xx, and secondary rate limits', async () => {
  const { calls, client: c } = client([
    new Error('ECONNRESET'),
    answer(502, 'bad gateway'),
    answer(403, 'slow down', { 'retry-after': '1' }),
    answer(200, { data: { viewer: { login: 'x' } } }),
  ])
  assert.deepEqual(await c.graphql('query { viewer { login } }'), { data: { viewer: { login: 'x' } }, notFound: [] })
  assert.equal(calls.length, 4)
})

test('graphql gives up after the retries and fails on other HTTP errors', async () => {
  await assert.rejects(client([answer(502, ''), answer(502, '')], { retries: 1 }).client.graphql('q'), /answered 502/)
  await assert.rejects(client([answer(401, 'Bad credentials')]).client.graphql('q'), /answered 401: Bad credentials/)
})

test('graphql reports tolerated NOT_FOUND fields and fails on every other GraphQL error', async () => {
  const notFound = { type: 'NOT_FOUND', path: ['r0', 'p1'], message: 'no pull request' }
  const body = { data: { r0: { p0: {}, p1: null } }, errors: [notFound] }
  const { client: c } = client([answer(200, body), answer(200, body)])
  const tolerateNotFound = (path) => path.includes('.')
  assert.deepEqual((await c.graphql('q', {}, { tolerateNotFound })).notFound, ['r0.p1'])
  await assert.rejects(c.graphql('q'), /no pull request/, 'NOT_FOUND is an error unless tolerated')
  const failing = client([answer(200, { data: null, errors: [{ type: 'FORBIDDEN', message: 'no access' }] })])
  await assert.rejects(failing.client.graphql('q'), /no access/)
})

test('parseRepoUrl', () => {
  assert.deepEqual(parseRepoUrl('https://github.com/Netcracker/qubership-apihub'), {
    owner: 'Netcracker',
    repo: 'qubership-apihub',
  })
  assert.throws(() => parseRepoUrl('https://example.com/x'), GraphqlError)
})
