const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createResolver, subjectReference } = require('./pull-requests')

const OWNER = 'Netcracker'
const REPO = 'qubership-apihub'
const commit = (sha, subject) => ({ sha, hash: sha.slice(0, 7), author: 'Dev', subject, body: '' })
const pull = (number, url, issues = []) => ({
  number,
  title: `title ${number}\nsecond line`,
  url,
  author: { login: `dev${number}` },
  closingIssuesReferences: { nodes: issues },
})

/** A fake client: answers commit queries from `associated` and pull queries from `pulls`. */
function fakeClient({ associated = {}, pulls = {} }) {
  const queries = []
  const graphql = async (query) => {
    queries.push(query)
    if (query.includes('associatedPullRequests')) {
      const repository = {}
      for (const m of query.matchAll(/(c\d+): object\(oid: "([0-9a-f]+)"\)/g)) {
        const nodes = associated[m[2]] ?? []
        repository[m[1]] = { author: { user: { login: `login-${m[2]}` } }, associatedPullRequests: { nodes } }
      }
      return { data: { repository }, notFound: [] }
    }
    const data = {}
    const notFound = []
    for (const r of query.matchAll(/(r\d+): repository\(owner: "([^"]+)", name: "([^"]+)"\) \{(.*?)\} \}(?= r\d+:| \}$)/g)) {
      data[r[1]] = {}
      for (const p of r[4].matchAll(/(p\d+): pullRequest\(number: (\d+)\)/g)) {
        const node = pulls[`${r[2]}/${r[3]}#${p[2]}`]
        if (node) data[r[1]][p[1]] = node
        else notFound.push(`${r[1]}.${p[1]}`)
      }
    }
    return { data, notFound }
  }
  return { graphql, queries }
}

test('subjectReference reads a trailing pull request reference', () => {
  assert.deepEqual(subjectReference('feat: x (Netcracker/qubership-apihub-backend#525)', OWNER, REPO), {
    owner: 'Netcracker',
    repo: 'qubership-apihub-backend',
    number: 525,
  })
  assert.deepEqual(subjectReference('fix: y (#12)', OWNER, REPO), { owner: OWNER, repo: REPO, number: 12 })
  assert.equal(subjectReference('fix: #12 in the middle', OWNER, REPO), null)
})

test('resolve: the earliest merged pull request of this repository, else the subject reference, else none', async () => {
  const merged = (number, mergedAt, base = 'Netcracker/qubership-apihub') => ({
    number,
    mergedAt,
    baseRepository: { nameWithOwner: base },
  })
  const client = fakeClient({
    associated: {
      aaa1: [merged(8, '2026-10-21T00:00:00Z'), merged(7, '2026-10-20T00:00:00Z'), merged(9, null)],
      bbb2: [merged(5, '2026-10-20T00:00:00Z', 'someone/fork')],
    },
    pulls: {
      'Netcracker/qubership-apihub#7': pull(7, 'https://github.com/Netcracker/qubership-apihub/pull/7', [
        { title: 'Issue', url: 'https://i/1', issueType: { name: 'Bug' }, labels: { nodes: [{ name: 'x' }] } },
      ]),
      'Netcracker/qubership-apihub-backend#525': pull(525, 'https://github.com/Netcracker/qubership-apihub-backend/pull/525'),
    },
  })
  const resolver = createResolver(client, { owner: OWNER, repo: REPO })
  const commits = [
    commit('aaa1', 'fix: a'),
    commit('bbb2', 'chore: b'),
    commit('ccc3', 'feat: c (Netcracker/qubership-apihub-backend#525)'),
    commit('ddd4', 'docs: d (Netcracker/qubership-apihub-backend#9999)'),
  ]
  const resolved = await resolver.resolve(commits)
  assert.deepEqual(
    resolved.map((r) => [r.commit.sha, r.login, r.pull?.number ?? null]),
    [['aaa1', 'login-aaa1', 7], ['bbb2', 'login-bbb2', null], ['ccc3', null, 525], ['ddd4', null, null]],
  )
  assert.deepEqual(resolved[0].pull, {
    number: 7,
    title: 'title 7',
    url: 'https://github.com/Netcracker/qubership-apihub/pull/7',
    author: 'dev7',
    issues: [{ title: 'Issue', url: 'https://i/1', type: 'Bug', labels: ['x'] }],
  })
  // Commits that name another repository are not looked up in this one.
  assert.doesNotMatch(client.queries[0], /ccc3|ddd4/)

  const before = client.queries.length
  await resolver.resolve(commits)
  assert.equal(client.queries.length, before, 'a second call is answered from the cache')
})
