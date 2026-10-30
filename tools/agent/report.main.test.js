'use strict'
// main() of report.js over a fake GitHub client. The pure functions are in report.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { main, REPORT_MARKER } = require('./report')

log.setWriter(() => {})

const NOW = new Date('2026-10-24T06:00:00Z')
const IN = '2026-10-20T10:00:00.000Z'
const BEFORE = '2026-10-01T10:00:00.000Z'
const agentBody = (n) => `Closes #${n}.\n\n<!-- ai-autonomous-agent issue=${n} -->\n`
const labeled = (number, labels, extra = {}) => ({ number, labels: labels.map((name) => ({ name })), ...extra })

const cost = (extra = {}) => ({
  run: 'https://github.com/o/r/actions/runs/7', flow: 'implement', role: 'implementer', model: 'openai/model-a',
  variant: 'high', input: 100, cached: 50, output: 20, reasoning: 0, usd: 1, at: IN, ...extra,
})
const bot = (id, body) => ({ id, user: { login: 'github-actions[bot]' }, body })

const SEARCHES = {
  bugs: [labeled(200, ['ai:suitable', 'agent:needs-human']), labeled(202, [])],
  tasks: [labeled(201, ['ai:unsuitable'])],
  merged: [labeled(70, ['ai:l1-executor']), labeled(71, ['dependencies']), labeled(72, ['ai:l0-assistant'])],
  opened: [
    labeled(70, ['agent:completed', 'ai:l1-executor'], {
      body: agentBody(200), draft: false, pull_request: { merged_at: IN },
    }),
    labeled(75, ['agent:needs-human'], { body: agentBody(150), draft: true, pull_request: { merged_at: null } }),
    labeled(76, [], { body: 'A change by a person.', draft: false, pull_request: { merged_at: null } }),
  ],
  reviewed: [labeled(76, ['agent:pr-reviewed']), labeled(71, ['agent:pr-reviewed'])],
}

const COMMENTS = {
  200: [bot(1, state.render('Human part.', {
    schema: 1, kind: 'issue', number: 200, phase: 'completed', forced: true,
    attempts: [
      { n: 1, kind: 'initial', result: 'ci-green', at: IN },
      { n: 2, kind: 'ci-fix', result: 'error', at: BEFORE },
    ],
    costs: [cost(), cost({ flow: 'analyze', role: 'analyst', usd: 0.25 }), cost({ usd: 9, at: BEFORE })],
  }))],
  150: [bot(2, state.render('Human part.', {
    schema: 1, kind: 'issue', number: 150, phase: 'needs-human',
    attempts: [{ n: 1, kind: 'initial', result: 'draft', at: IN }],
    costs: [cost({ flow: 'ci-fix', usd: 0.5 })],
  }))],
  70: [{ id: 3, user: { login: 'someone' }, body: 'Chatting, no state.' }, bot(4, state.render('Review.', {
    ...state.emptyPullState(70),
    costs: [cost({ flow: 'review', role: 'pr-reviewer', usd: 2, model: 'openai/model-b', variant: null })],
  }))],
  // A person pasted the marker: it is not state.
  202: [{ id: 5, user: { login: 'mallory' }, body: state.render('Fake.', { costs: [cost({ usd: 100 })] }) }],
  76: [bot(6, '<!-- ai-autonomous-state -->\nBroken.\n\n<!-- ai-autonomous-state-json\n{ not json\n-->\n')],
}

function fakeGh({ searches = SEARCHES, comments = COMMENTS } = {}) {
  const calls = []
  const key = (q) => {
    if (q.includes('type:Bug')) return 'bugs'
    if (q.includes('type:Task')) return 'tasks'
    if (q.includes('is:merged')) return 'merged'
    if (q.includes('agent:pr-reviewed')) return 'reviewed'
    return 'opened'
  }
  return {
    calls,
    searchIssues: async (q) => (calls.push(['searchIssues', q]), searches[key(q)]),
    listIssueComments: async (n) => (calls.push(['listIssueComments', n]), comments[n] ?? []),
    createIssueComment: async (n, body) => (calls.push(['createIssueComment', n, body]), { id: 99 }),
  }
}

async function run(extraEnv, gh = fakeGh()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-test-'))
  const summaryFile = path.join(dir, 'summary')
  try {
    const env = {
      GITHUB_REPOSITORY: 'o/r',
      AGENT_ENABLED: 'true',
      AGENT_DRY_RUN: 'false',
      GITHUB_STEP_SUMMARY: summaryFile,
      ...extraEnv,
    }
    await main(env, gh, NOW)
    return { gh, summary: fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, 'utf8') : '' }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const writes = (gh) => gh.calls.filter((c) => c[0] === 'createIssueComment')

test('main posts the report to the issue and writes it to the job summary', async () => {
  const { gh, summary } = await run({ AGENT_REPORT_ISSUE: '9' })
  const [post] = writes(gh)
  assert.equal(writes(gh).length, 1)
  assert.equal(post[1], 9)
  assert.ok(post[2].startsWith(REPORT_MARKER))
  assert.ok(summary.startsWith(post[2]))
  assert.match(summary, /Posted to #9\.\n$/)

  // Issues: 3 created, 1 suitable, 1 unsuitable, 1 not assessed, 1 waiting for a person.
  assert.match(post[2], /\| Bug and Task issues created \| 3 \|/)
  assert.match(post[2], /\| Waiting for a person now \(`agent:needs-human`\) \| 1 \|/)
  // Pull requests merged: one with a level of each kind, one without.
  assert.match(post[2], /\| `ai:l1-executor` \| 1 \| 33% \|/)
  assert.match(post[2], /\| No level \| 1 \| 33% \|/)
  // Agent pull requests: 2 opened, 1 completed, 1 draft, 1 merged. Pull requests reviewed: 2.
  assert.match(post[2], /\| Opened in the period \| 2 \|/)
  assert.match(post[2], /\| Reached `agent:completed` \| 1 \|/)
  assert.match(post[2], /\| Merged \| 1 \|/)
  assert.match(post[2], /\| Reviewed by the agent \(`agent:pr-reviewed`\) \| 2 \|/)
  // Attempts: one in the period on #200 (forced) and one on #150; the one before the period is left out.
  assert.match(post[2], /\| `ci-green` \| 1 \|/)
  assert.match(post[2], /\| `draft` \| 1 \|/)
  assert.doesNotMatch(post[2], /`error`/)
  assert.match(post[2], /Total: 2 attempts, 1 of them forced\./)
  // Costs: 1 + 0.25 + 0.5 + 2 in the period; the record before it and the pasted marker do not count.
  assert.match(post[2], /\| implement \| 1 \| \$1\.00 \|/)
  assert.match(post[2], /\| `openai\/model-b` \| 1 \| \$2\.00 \|/)
  assert.match(post[2], /\*\*Total: \$3\.75\*\* in 4 calls\./)
  assert.match(post[2], /State comments read: 3\. 1 could not be read and are left out\./)
})

test('main searches from the start of the period and reads each state once, linked issues included', async () => {
  const { gh } = await run({ AGENT_REPORT_DAYS: '14' })
  const searches = gh.calls.filter((c) => c[0] === 'searchIssues').map((c) => c[1])
  assert.equal(searches.length, 5)
  assert.ok(searches.every((q) => q.startsWith('repo:o/r ') && q.includes('>=2026-10-10T06:00:00Z')))
  const read = gh.calls.filter((c) => c[0] === 'listIssueComments').map((c) => c[1]).sort((a, b) => a - b)
  // 150 is the issue of the agent pull request #75 and is older than the period; 70 and 71 and 76 repeat.
  assert.deepEqual(read, [70, 71, 72, 75, 76, 150, 200, 201, 202])
})

test('main in a dry run writes the report to the job summary only', async () => {
  const { gh, summary } = await run({ AGENT_DRY_RUN: 'true', AGENT_REPORT_ISSUE: '9' })
  assert.deepEqual(writes(gh), [])
  assert.match(summary, /## AI Autonomous report: 2026-10-17 to 2026-10-24/)
  assert.match(summary, /Dry run: the report would be posted to #9\.\n$/)

  const unset = await run({ AGENT_DRY_RUN: '' })
  assert.deepEqual(writes(unset.gh), [])
  assert.match(unset.summary, /Dry run: nothing is posted\.\n$/)
})

test('main without AGENT_REPORT_ISSUE keeps the report in the job summary', async () => {
  const { gh, summary } = await run({ AGENT_REPORT_ISSUE: ' ' })
  assert.deepEqual(writes(gh), [])
  assert.match(summary, /In the last 7 days/)
  assert.match(summary, /No AGENT_REPORT_ISSUE is set: the report stays in the job summary\.\n$/)
})

test('main reports an empty period with zeros and reads no state', async () => {
  const empty = { bugs: [], tasks: [], merged: [], opened: [], reviewed: [] }
  const { gh, summary } = await run({}, fakeGh({ searches: empty }))
  assert.equal(gh.calls.filter((c) => c[0] === 'listIssueComments').length, 0)
  assert.match(summary, /0 Bug and Task issues were created,/)
  assert.match(summary, /No attempt was recorded in the period\./)
  assert.match(summary, /No AI call was recorded in the period\./)
  assert.match(summary, /State comments read: 0\./)
})

test('main does nothing when the agent is disabled', async () => {
  const { gh, summary } = await run({ AGENT_ENABLED: 'false', AGENT_REPORT_ISSUE: '9' })
  assert.deepEqual(gh.calls, [])
  assert.equal(summary, '')
})

test('main rejects an invalid period or issue before any call', async () => {
  for (const env of [
    { AGENT_REPORT_DAYS: '0' },
    { AGENT_REPORT_DAYS: 'week' },
    { AGENT_REPORT_DAYS: '1.5' },
    { AGENT_REPORT_ISSUE: '#9' },
    { AGENT_REPORT_ISSUE: '-1' },
  ]) {
    const gh = fakeGh()
    await assert.rejects(run(env, gh), /expected a positive integer/)
    assert.deepEqual(gh.calls, [])
  }
})

test('main lets a failed search stop the run without a post', async () => {
  const gh = fakeGh()
  gh.searchIssues = async () => {
    throw new Error('search failed')
  }
  await assert.rejects(run({ AGENT_REPORT_ISSUE: '9' }, gh), /search failed/)
  assert.deepEqual(writes(gh), [])
})
