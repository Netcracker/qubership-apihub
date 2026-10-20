const { test } = require('node:test')
const assert = require('node:assert/strict')
const { fetchItems, workItemRows } = require('./project')

const SPRINT = 'APIHUB-26.3.5'
const pr = (n, login = `dev${n}`) => ({ url: `https://github.com/o/r/pull/${n}`, title: `PR ${n}`, author: { login } })
const card = (content, { sprint = SPRINT, status = 'Done', pulls = [] } = {}) => ({
  status: { name: status },
  sprint: { title: sprint },
  pulls: { pullRequests: { nodes: pulls } },
  content,
})
const issue = (n, type, extra = {}) => ({
  __typename: 'Issue',
  title: `Issue ${n}`,
  url: `https://github.com/o/r/issues/${n}`,
  issueType: type ? { name: type } : null,
  parent: null,
  closedByPullRequestsReferences: { nodes: [] },
  ...extra,
})

test('workItemRows filters by sprint and status and groups by issue type', () => {
  const rows = workItemRows(
    [
      card(issue(1, 'Feature', { parent: { title: 'Epic | A', url: 'https://e/1' } }), {
        pulls: [pr(10)],
      }),
      card(issue(2, 'Bug', { closedByPullRequestsReferences: { nodes: [pr(10), pr(11, 'dev10')] } }), {
        status: 'In Test',
        pulls: [pr(10)],
      }),
      card(issue(3, 'Task')),
      card({ __typename: 'PullRequest', ...pr(12) }),
      card(issue(4, 'Feature'), { status: 'In Progress' }),
      card(issue(5, 'Feature'), { sprint: 'APIHUB-26.3.4' }),
      card(null),
      { status: null, sprint: null, pulls: null, content: issue(6, 'Bug') },
    ],
    SPRINT,
  )
  assert.deepEqual(rows, {
    features: [
      '| Issue: <https://github.com/o/r/issues/1><br/><br/>PR: <https://github.com/o/r/pull/10> ' +
        '| Issue 1<br/><br/>PR 10 | @dev10 | [Epic \\| A](https://e/1) |',
    ],
    bugfixes: [
      '| Issue: <https://github.com/o/r/issues/2><br/><br/>PR: <https://github.com/o/r/pull/10><br/><br/>' +
        'PR: <https://github.com/o/r/pull/11> | Issue 2<br/><br/>PR 10<br/><br/>PR 11 | @dev10 |  |',
    ],
    other: [
      '| Issue: <https://github.com/o/r/issues/3> | Issue 3 |  |  |',
      '| No issue<br/><br/>PR: <https://github.com/o/r/pull/12> | No issue<br/><br/>PR 12 | @dev12 | |',
    ],
  })
})

test('fetchItems reads every page and fails when the project cannot be read', async () => {
  const pages = [
    { nodes: [1, 2], pageInfo: { hasNextPage: true, endCursor: 'c1' } },
    { nodes: [3], pageInfo: { hasNextPage: false, endCursor: null } },
  ]
  const cursors = []
  const client = {
    graphql: async (query, variables) => {
      cursors.push(variables.cursor)
      return { data: { organization: { projectV2: { items: pages.shift() } } } }
    },
  }
  assert.deepEqual(await fetchItems(client), [1, 2, 3])
  assert.deepEqual(cursors, [null, 'c1'])
  const empty = { graphql: async () => ({ data: { organization: { projectV2: null } } }) }
  await assert.rejects(fetchItems(empty), /cannot read project 9 of Netcracker/)
})
