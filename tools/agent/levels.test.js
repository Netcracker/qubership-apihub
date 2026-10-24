'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  LEVELS,
  REMINDER_MARKER,
  COMMITS_MARKER,
  levelOfLabels,
  lowestLevel,
  levelChanges,
  countCommitsWithoutRun,
  hasMarker,
  reminderBody,
  commitsBody,
  closingIssuesOf,
  mergedPullsOf,
  main,
} = require('./levels')
require('./lib/log').setWriter(() => {})

const L0 = 'ai:l0-assistant'
const L1 = 'ai:l1-executor'
const L2 = 'ai:l2-agent'
const L3 = 'ai:l3-autonomous'

test('LEVELS run from the least to the most autonomous', () => {
  assert.deepEqual(LEVELS, [L0, L1, L2, L3])
})

test('levelOfLabels finds the level among other labels, objects or strings', () => {
  assert.equal(levelOfLabels([{ name: 'bug' }, { name: L2 }]), L2)
  assert.equal(levelOfLabels([L1]), L1)
  assert.equal(levelOfLabels([{ name: 'bug' }, 'ai:suitable']), null)
  assert.equal(levelOfLabels([]), null)
  assert.equal(levelOfLabels(undefined), null)
  assert.equal(levelOfLabels([L3, L1]), L1)
})

test('lowestLevel takes the lowest level among the pull requests that have one', () => {
  assert.equal(lowestLevel([[L1], [L0]]), L0)
  assert.equal(lowestLevel([[L3], [L2, 'bug'], [L3]]), L2)
  assert.equal(lowestLevel([[L1]]), L1)
})

test('lowestLevel ignores pull requests without a level, and is null when none has one', () => {
  assert.equal(lowestLevel([['bug'], [L2], []]), L2)
  assert.equal(lowestLevel([['bug'], []]), null)
  assert.equal(lowestLevel([]), null)
})

test('levelChanges sets the level and removes every other level', () => {
  assert.deepEqual(levelChanges(['bug'], L1), { add: [L1], remove: [] })
  assert.deepEqual(levelChanges([{ name: L1 }, { name: 'bug' }], L0), { add: [L0], remove: [L1] })
  assert.deepEqual(levelChanges([L0, L2, L3], L0), { add: [], remove: [L2, L3] })
})

test('levelChanges changes nothing when the level is already right or unknown', () => {
  assert.deepEqual(levelChanges([L1, 'bug'], L1), { add: [], remove: [] })
  assert.deepEqual(levelChanges([L2], null), { add: [], remove: [] })
  assert.deepEqual(levelChanges([], null), { add: [], remove: [] })
})

test('levelChanges leaves labels that merely look similar', () => {
  assert.deepEqual(levelChanges(['ai:suitable', 'ai:unsuitable', 'agent:completed'], L1), { add: [L1], remove: [] })
})

const commit = (message) => ({ sha: 'x', commit: { message } })

test('countCommitsWithoutRun counts commits that have no Agent-Run trailer', () => {
  const commits = [
    commit('feat: a\n\nBody.\n\nAgent-Run: https://github.com/o/r/actions/runs/1'),
    commit('fix: by a person'),
    commit('fix: another\n\nagent-run: 42'),
    commit('chore: mentions Agent-Run: in the middle of a line, not a trailer'),
    commit('fix: empty trailer\n\nAgent-Run:'),
    { sha: 'y' },
  ]
  assert.equal(countCommitsWithoutRun(commits), 4)
  assert.equal(countCommitsWithoutRun([]), 0)
})

test('hasMarker accepts only a comment of the workflow bot', () => {
  const body = `${REMINDER_MARKER}\nreminder`
  assert.equal(hasMarker([{ user: { login: 'github-actions[bot]' }, body }], REMINDER_MARKER), true)
  assert.equal(hasMarker([{ user: { login: 'mallory' }, body }], REMINDER_MARKER), false)
  assert.equal(hasMarker([{ user: { login: 'github-actions[bot]' }, body }], COMMITS_MARKER), false)
  assert.equal(hasMarker([], REMINDER_MARKER), false)
  assert.equal(hasMarker(undefined, REMINDER_MARKER), false)
  assert.equal(hasMarker([{ user: null, body: null }], REMINDER_MARKER), false)
})

test('the two markers do not contain each other', () => {
  assert.equal(REMINDER_MARKER, '<!-- ai-autonomous-levels -->')
  assert.ok(!COMMITS_MARKER.includes(REMINDER_MARKER))
  assert.ok(!REMINDER_MARKER.includes(COMMITS_MARKER))
})

test('reminderBody asks for a level and names the issues', () => {
  const one = reminderBody([200])
  assert.ok(one.startsWith(`${REMINDER_MARKER}\n`))
  assert.match(one, /This pull request has no execution level label \(ai:l0-assistant \.\.\. ai:l3-autonomous\)\./)
  assert.match(one, /Add one; the agent copies it to issue #200\.\n$/)
  assert.match(reminderBody([200, 201]), /copies it to issues #200, #201\./)
})

test('commitsBody counts the commits of people and suggests the lowest level', () => {
  const text = commitsBody({ people: 2, total: 5 })
  assert.ok(text.startsWith(`${COMMITS_MARKER}\n`))
  assert.match(text, /2 of 5 commits on this pull request have no `Agent-Run:` trailer/)
  assert.match(text, /consider `ai:l0-assistant`\./)
})

test('closingIssuesOf reads the numbers and the labels of the closing issues', () => {
  const response = {
    data: {
      repository: {
        pullRequest: {
          closingIssuesReferences: {
            nodes: [
              { number: 200, labels: { nodes: [{ name: 'bug' }, { name: L1 }] } },
              { number: 201, labels: { nodes: [] } },
              null,
            ],
          },
        },
      },
    },
  }
  assert.deepEqual(closingIssuesOf(response), [
    { number: 200, labels: ['bug', L1] },
    { number: 201, labels: [] },
  ])
  assert.deepEqual(closingIssuesOf({ data: { repository: { pullRequest: null } } }), [])
  assert.deepEqual(closingIssuesOf(null), [])
})

const pullsResponse = (nodes) => ({ data: { repository: { issue: { closedByPullRequestsReferences: { nodes } } } } })

test('mergedPullsOf keeps merged pull requests only and prefers the fresh labels of the current one', () => {
  const response = pullsResponse([
    { number: 130, merged: true, labels: { nodes: [] } },
    { number: 131, merged: false, labels: { nodes: [{ name: L0 }] } },
    { number: 132, merged: true, labels: { nodes: [{ name: L2 }] } },
  ])
  assert.deepEqual(mergedPullsOf(response, { number: 130, labels: [L1] }), [
    { number: 130, labels: [L1] },
    { number: 132, labels: [L2] },
  ])
  // The index of GitHub may not list the pull request of this run yet.
  assert.deepEqual(mergedPullsOf(pullsResponse([]), { number: 140, labels: [L0] }), [{ number: 140, labels: [L0] }])
  assert.deepEqual(mergedPullsOf(null, null), [])
})

test('an issue closed by an agent pull request and a later person pull request gets the lower level', () => {
  const response = pullsResponse([
    { number: 130, merged: true, labels: { nodes: [{ name: L1 }] } },
    { number: 135, merged: true, labels: { nodes: [] } },
  ])
  const pulls = mergedPullsOf(response, { number: 135, labels: [L0] })
  assert.equal(lowestLevel(pulls.map((p) => p.labels)), L0)
  assert.deepEqual(levelChanges([L1], lowestLevel(pulls.map((p) => p.labels))), { add: [L0], remove: [L1] })
})

test('the closed fixture is a merged pull request with a level', () => {
  const file = path.join(__dirname, 'fixtures', 'pull_request_target.closed.json')
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(payload.action, 'closed')
  assert.equal(payload.pull_request.merged, true)
  assert.equal(levelOfLabels(payload.pull_request.labels), L0)
})

// A fake client over canned data. It records the writes.
function fakeGh({ pr, closing = [], pulls = {}, comments = [], commits = [] }) {
  const calls = []
  return {
    calls,
    getPull: async () => pr,
    graphql: async (query, variables) => {
      if (query.includes('closingIssuesReferences')) {
        const nodes = closing.map((i) => ({ number: i.number, labels: { nodes: i.labels.map((name) => ({ name })) } }))
        return { data: { repository: { pullRequest: { closingIssuesReferences: { nodes } } } } }
      }
      return pullsResponse(pulls[variables.number] ?? [])
    },
    listIssueComments: async () => comments,
    listPullCommits: async () => commits,
    addLabels: async (n, labels) => calls.push(['addLabels', n, labels]),
    removeLabel: async (n, label) => calls.push(['removeLabel', n, label]),
    createIssueComment: async (n, body) => calls.push(['createIssueComment', n, body]),
  }
}

const mergedPr = (extra = {}) => ({
  number: 130,
  merged: true,
  body: 'Closes #200',
  user: { login: 'alice' },
  labels: [],
  ...extra,
})
const env = (extra = {}) => ({
  GITHUB_REPOSITORY: 'o/r',
  AGENT_NUMBER: '130',
  AGENT_ENABLED: 'true',
  AGENT_DRY_RUN: 'false',
  ...extra,
})
const node = (number, labels = [], merged = true) => ({
  number,
  merged,
  labels: { nodes: labels.map((name) => ({ name })) },
})

test('main copies the lowest level to the closing issue and removes the old one', async () => {
  const gh = fakeGh({
    pr: mergedPr({ labels: [{ name: L0 }] }),
    closing: [{ number: 200, labels: [L1, 'bug'] }],
    pulls: { 200: [node(120, [L1]), node(130, [])] },
  })
  await main(env(), gh)
  assert.deepEqual(gh.calls, [['addLabels', 200, [L0]], ['removeLabel', 200, L1]])
})

test('main reminds once when the merged pull request has no level, and copies nothing', async () => {
  const gh = fakeGh({ pr: mergedPr(), closing: [{ number: 200, labels: [] }, { number: 201, labels: [] }] })
  await main(env(), gh)
  assert.equal(gh.calls.length, 1)
  assert.deepEqual(gh.calls[0].slice(0, 2), ['createIssueComment', 130])
  assert.match(gh.calls[0][2], /copies it to issues #200, #201/)

  const again = fakeGh({
    pr: mergedPr(),
    closing: [{ number: 200, labels: [] }],
    comments: [{ user: { login: 'github-actions[bot]' }, body: reminderBody([200]) }],
  })
  await main(env(), again)
  assert.deepEqual(again.calls, [])
})

test('main sends no reminder when the pull request closes no issue', async () => {
  const gh = fakeGh({ pr: mergedPr(), closing: [] })
  await main(env(), gh)
  assert.deepEqual(gh.calls, [])
})

test('main counts the commits of people on an agent pull request, once', async () => {
  const agentBody = 'Closes #200\n\n<!-- ai-autonomous-agent run=1 -->'
  const commits = [commit('feat: x\n\nAgent-Run: 1'), commit('fix: by a person'), commit('fix: another person')]
  const gh = fakeGh({
    pr: mergedPr({ body: agentBody, labels: [{ name: L1 }] }),
    closing: [{ number: 200, labels: [L1] }],
    pulls: { 200: [node(130, [L1])] },
    commits,
  })
  await main(env(), gh)
  assert.equal(gh.calls.length, 1)
  assert.match(gh.calls[0][2], /2 of 3 commits/)

  const noted = fakeGh({
    pr: mergedPr({ body: agentBody, labels: [{ name: L1 }] }),
    closing: [],
    comments: [{ user: { login: 'github-actions[bot]' }, body: commitsBody({ people: 2, total: 3 }) }],
    commits,
  })
  await main(env(), noted)
  assert.deepEqual(noted.calls, [])

  const clean = fakeGh({ pr: mergedPr({ body: agentBody }), closing: [], commits: [commit('feat: x\n\nAgent-Run: 1')] })
  await main(env(), clean)
  assert.deepEqual(clean.calls, [])
})

test('main writes nothing in dry-run and reports to the job summary', async () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'levels-test-'))
  try {
    const summary = path.join(dir, 'summary')
    const gh = fakeGh({
      pr: mergedPr({ labels: [{ name: L2 }] }),
      closing: [{ number: 200, labels: [] }],
      pulls: { 200: [node(130, [L2])] },
    })
    await main(env({ AGENT_DRY_RUN: 'true', GITHUB_STEP_SUMMARY: summary }), gh)
    assert.deepEqual(gh.calls, [])
    const text = fs.readFileSync(summary, 'utf8')
    assert.match(text, /Dry run: AI execution levels for #130\n\n- issue #200: level ai:l2-agent, add ai:l2-agent/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('main skips a disabled agent, an unmerged pull request, and an author outside AGENT_ALLOWED_ACTORS', async () => {
  const closing = [{ number: 200, labels: [] }]
  for (const [e, pr] of [
    [env({ AGENT_ENABLED: 'false' }), mergedPr({ labels: [{ name: L1 }] })],
    [env(), mergedPr({ merged: false, labels: [{ name: L1 }] })],
    [env({ AGENT_ALLOWED_ACTORS: 'bob' }), mergedPr({ labels: [{ name: L1 }] })],
  ]) {
    const gh = fakeGh({ pr, closing })
    await main(e, gh)
    assert.deepEqual(gh.calls, [])
  }
})
