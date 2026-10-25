'use strict'
// Routing of the automatic work: the grace period and the sweep, the review for every author, and the daily caps.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const state = require('./lib/state')
const log = require('./lib/log')
const { decide, gather, dailyCountNeeded, sweepBudget, formatOutputs, formatSummary, main } = require('./route')

log.setWriter(() => {})

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))
const enabled = (env = {}) => loadConfig({ AGENT_ENABLED: 'true', AGENT_DRY_RUN: 'false', ...env })
const NOW = new Date('2026-10-25T12:00:00.500Z')
const REPO = 'o/r'
const needsInfo = (extra = {}) => ({ ...state.emptyIssueState(200), phase: 'needs-info', ...extra })

// ---------------------------------------------------------------------------------------------------------------
// The grace period on the events
// ---------------------------------------------------------------------------------------------------------------

test('opened and typed wait for the sweep while the grace period is above 0', () => {
  for (const [name, grace] of [['issues.opened.bug', '30'], ['issues.typed.task', '1']]) {
    const result = decide({
      eventName: 'issues',
      payload: fixture(name),
      config: enabled({ AGENT_ANALYSIS_GRACE_MINUTES: grace }),
    })
    assert.equal(result.action, 'skip', name)
    assert.equal(result.reason, `the sweep analyzes it after the grace period of ${grace} minutes`)
  }
})

test('the default grace period is 30 minutes', () => {
  const result = decide({ eventName: 'issues', payload: fixture('issues.opened.bug'), config: enabled() })
  assert.equal(result.reason, 'the sweep analyzes it after the grace period of 30 minutes')
})

test('with a grace period of 0 the event analyzes at once', () => {
  const config = enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '0' })
  const opened = decide({ eventName: 'issues', payload: fixture('issues.opened.bug'), config })
  assert.deepEqual(opened, { action: 'analyze', number: 200, reason: 'issue opened', trigger: 'opened' })
  assert.equal(decide({ eventName: 'issues', payload: fixture('issues.typed.task'), config }).trigger, 'typed')
})

test('the grace period does not hold back the answers of the author or the other skips', () => {
  const config = enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '30' })
  const edited = decide({ eventName: 'issues', payload: fixture('issues.edited'), config, issueState: needsInfo() })
  assert.deepEqual([edited.action, edited.trigger], ['analyze', 'edited'])
  const reply = decide({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.author-reply'),
    config,
    issueState: needsInfo(),
  })
  assert.deepEqual([reply.action, reply.trigger], ['analyze', 'author-reply'])
  // A skip with another reason keeps its reason.
  const feature = decide({ eventName: 'issues', payload: fixture('issues.opened.feature'), config })
  assert.match(feature.reason, /analysis covers Bug and Task/)
})

// ---------------------------------------------------------------------------------------------------------------
// The sweep decision
// ---------------------------------------------------------------------------------------------------------------

const sweepEvent = () => fixture('schedule.sweep')
const sweep = (numbers, env = {}, extra = {}) =>
  decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled(env), sweep: { numbers }, ...extra })

test('the sweep analyzes the issues it found; the first one is the number of the summary', () => {
  const result = sweep([12, 15])
  assert.deepEqual(result, {
    action: 'analyze',
    number: 12,
    numbers: [12, 15],
    reason: 'the grace period is over for 2 new issue(s): #12, #15',
    trigger: 'sweep',
  })
  assert.match(formatSummary(result), /chose `analyze` for #12: the grace period is over for 2/)
})

test('the sweep skips when no issue is past the grace period', () => {
  for (const found of [[], undefined]) {
    const result = decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled(), sweep: found && { numbers: found } })
    assert.deepEqual(result, { action: 'skip', number: null, reason: 'no new issue is past the grace period' })
  }
  assert.equal(decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled() }).action, 'skip')
})

const DRY_RUN_REASON = 'the sweep needs AGENT_DRY_RUN=false: a dry-run analysis writes no state, so the same issues ' +
  'would be analyzed again and again; use /agent analyze'

test('in dry run the sweep skips with the reason, also when issues were found', () => {
  const result = sweep([12, 15], { AGENT_DRY_RUN: 'true' })
  assert.deepEqual(result, { action: 'skip', number: null, reason: DRY_RUN_REASON })
  assert.equal(sweep([], { AGENT_DRY_RUN: 'true' }).reason, DRY_RUN_REASON)
})

test('the sweep skips when the agent is disabled', () => {
  const result = decide({ eventName: 'schedule', payload: sweepEvent(), config: loadConfig({}), sweep: { numbers: [1] } })
  assert.deepEqual(result, { action: 'skip', number: null, reason: 'AGENT_ENABLED is not true' })
})

test('the sweep takes at most 5 issues', () => {
  const result = sweep([1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(result.numbers, [1, 2, 3, 4, 5])
})

test('the sweep takes only what the daily cap leaves', () => {
  const result = sweep([1, 2, 3, 4, 5], {}, { dailyUsage: { analyses: 8 } })
  assert.deepEqual(result.numbers, [1, 2])
  assert.equal(sweep([1, 2, 3], { AGENT_DAILY_ANALYSES: '3' }, { dailyUsage: { analyses: 2 } }).numbers.length, 1)
})

test('the sweep skips with the daily limit when the budget is used up', () => {
  for (const analyses of [10, 11, 50]) {
    const result = sweep([1, 2], {}, { dailyUsage: { analyses } })
    assert.deepEqual(result, { action: 'skip', number: null, reason: 'daily limit of 10 automatic analyses reached' })
  }
})

test('sweepBudget is the smaller of 5 and the rest of the daily cap', () => {
  const config = enabled({ AGENT_DAILY_ANALYSES: '12' })
  assert.equal(sweepBudget(config, null), 5)
  assert.equal(sweepBudget(config, { analyses: 7 }), 5)
  assert.equal(sweepBudget(config, { analyses: 9 }), 3)
  assert.equal(sweepBudget(config, { analyses: 12 }), 0)
  assert.equal(sweepBudget(config, { analyses: 20 }), -8)
})

// ---------------------------------------------------------------------------------------------------------------
// Gathering the sweep
// ---------------------------------------------------------------------------------------------------------------

const stateComment = (st, id = 1) => ({ id, user: { login: 'github-actions[bot]' }, body: state.render('x', st) })
const issueItem = (number, created, extra = {}) => ({
  number,
  created_at: created,
  user: { login: 'alice', type: 'User' },
  ...extra,
})

/** A client whose searches answer by the type in the query and whose state comments come from `comments[number]`. */
function sweepClient({ bugs = [], tasks = [], updated = [], comments = {} } = {}) {
  const calls = []
  return {
    calls,
    searchIssues: async (query) => {
      calls.push(['searchIssues', query])
      if (query.includes('type:Bug')) return bugs
      if (query.includes('type:Task')) return tasks
      return updated
    },
    listIssueComments: async (n) => (calls.push(['listIssueComments', n]), comments[n] ?? []),
  }
}

const sweepGather = (client, env = {}, now = NOW) =>
  gather({
    eventName: 'schedule',
    payload: sweepEvent(),
    config: enabled(env),
    getClient: () => client,
    repository: REPO,
    now,
  })

const BASE = 'repo:o/r is:issue is:open'
const NO_DECISION = '-label:"ai:suitable" -label:"ai:unsuitable"'
const WINDOW = 'created:2026-10-18T12:00:00Z..2026-10-25T11:30:00Z'
const ANALYSIS_COUNT = 'repo:o/r is:issue label:"ai:suitable","ai:unsuitable","agent:needs-human" ' +
  'updated:>=2026-10-24T12:00:00Z sort:updated-desc'

test('the sweep searches the candidates first and counts nothing when there is none', async () => {
  const client = sweepClient()
  const extra = await sweepGather(client)
  assert.deepEqual(client.calls, [
    ['searchIssues', `${BASE} type:Bug ${NO_DECISION} ${WINDOW}`],
    ['searchIssues', `${BASE} type:Task ${NO_DECISION} ${WINDOW}`],
  ])
  assert.equal(extra.dailyUsage, undefined)
  assert.deepEqual(extra.sweep, { numbers: [], found: 0, left: 0 })
  const result = decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled(), ...extra })
  assert.deepEqual(result, { action: 'skip', number: null, reason: 'no new issue is past the grace period' })
})

test('with a candidate the sweep counts the daily usage after the searches and before it reads a state', async () => {
  const client = sweepClient({ bugs: [issueItem(7, '2026-10-20T00:00:00Z')] })
  await sweepGather(client)
  assert.deepEqual(client.calls, [
    ['searchIssues', `${BASE} type:Bug ${NO_DECISION} ${WINDOW}`],
    ['searchIssues', `${BASE} type:Task ${NO_DECISION} ${WINDOW}`],
    ['searchIssues', ANALYSIS_COUNT],
    ['listIssueComments', 7],
  ])
})

test('in dry run the sweep gathers nothing: no client, no search, and the decision is a skip', async () => {
  const getClient = () => assert.fail('the client must not be created')
  const config = enabled({ AGENT_DRY_RUN: 'true' })
  const extra = await gather({ eventName: 'schedule', payload: sweepEvent(), config, getClient, repository: REPO })
  assert.deepEqual(extra, { actorPermission: 'none', pullState: null })
  const result = decide({ eventName: 'schedule', payload: sweepEvent(), config, ...extra })
  assert.deepEqual(result, { action: 'skip', number: null, reason: DRY_RUN_REASON })
})

test('the end of the window follows the grace period, also at 0', async () => {
  const client = sweepClient()
  await sweepGather(client, { AGENT_ANALYSIS_GRACE_MINUTES: '5' })
  assert.match(client.calls[0][1], /created:2026-10-18T12:00:00Z\.\.2026-10-25T11:55:00Z$/)
  const now = sweepClient()
  await sweepGather(now, { AGENT_ANALYSIS_GRACE_MINUTES: '0' })
  assert.match(now.calls[0][1], /created:2026-10-18T12:00:00Z\.\.2026-10-25T12:00:00Z$/)
})

test('the sweep keeps new issues of people, oldest first, merged over both types', async () => {
  const client = sweepClient({
    bugs: [issueItem(30, '2026-10-24T10:00:00Z'), issueItem(10, '2026-10-22T10:00:00Z')],
    tasks: [issueItem(20, '2026-10-23T10:00:00Z'), issueItem(10, '2026-10-22T10:00:00Z')],
  })
  const extra = await sweepGather(client)
  assert.deepEqual(extra.sweep.numbers, [10, 20, 30])
  assert.deepEqual(extra.dailyUsage, { analyses: 0 })
  const result = decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled(), ...extra })
  assert.deepEqual([result.action, result.number, result.numbers], ['analyze', 10, [10, 20, 30]])
})

test('the sweep leaves out pull requests, bots, and issues that have an analysis', async () => {
  const analyzed = { ...state.emptyIssueState(3), analyses: [{ at: '2026-10-25T10:00:00Z', trigger: 'opened' }] }
  const noAnalysis = { ...state.emptyIssueState(4), phase: null, costs: [{ run: 'r', role: 'chat', usd: 0.1 }] }
  const client = sweepClient({
    bugs: [
      issueItem(1, '2026-10-20T00:00:00Z', { pull_request: { url: 'x' } }),
      issueItem(2, '2026-10-20T01:00:00Z', { user: { login: 'renovate[bot]', type: 'Bot' } }),
      issueItem(3, '2026-10-20T02:00:00Z'),
      issueItem(4, '2026-10-20T03:00:00Z'),
      issueItem(5, '2026-10-20T04:00:00Z'),
      issueItem(6, '2026-10-20T05:00:00Z'),
    ],
    comments: {
      3: [stateComment(analyzed)],
      4: [stateComment(noAnalysis)],
      // A comment of a person that looks like a state is not a state.
      6: [{ id: 9, user: { login: 'mallory' }, body: state.render('fake', analyzed) }],
    },
  })
  const extra = await sweepGather(client)
  assert.deepEqual(extra.sweep.numbers, [4, 5, 6])
  const read = client.calls.filter((c) => c[0] === 'listIssueComments').map((c) => c[1])
  // The pull request and the bot are filtered before any comment is read.
  assert.deepEqual(read, [3, 4, 5, 6])
})

test('the sweep takes at most 5 issues per run and reads no comments beyond them', async () => {
  const bugs = Array.from({ length: 8 }, (_, i) => issueItem(100 + i, `2026-10-2${i % 5}T00:00:00Z`))
  const client = sweepClient({ bugs })
  const lines = []
  log.setWriter((line) => lines.push(line))
  let extra
  try {
    extra = await sweepGather(client)
  } finally {
    log.setWriter(() => {})
  }
  assert.equal(extra.sweep.numbers.length, 5)
  assert.equal(extra.sweep.left, 3)
  assert.equal(client.calls.filter((c) => c[0] === 'listIssueComments').length, 5)
  assert.ok(lines.some((line) => /sweep candidates/.test(line) && /left=3/.test(line) && /candidates=8/.test(line)))
})

test('the sweep reads only as many issues as the daily cap leaves', async () => {
  const bugs = [1, 2, 3, 4].map((n) => issueItem(n, `2026-10-2${n}T00:00:00Z`))
  const analyses = Array.from({ length: 8 }, () => ({ at: '2026-10-25T10:00:00Z', trigger: 'opened' }))
  const busy = { ...state.emptyIssueState(900), analyses }
  const client = sweepClient({ bugs, updated: [{ number: 900 }], comments: { 900: [stateComment(busy)] } })
  const extra = await sweepGather(client)
  assert.deepEqual(extra.dailyUsage, { analyses: 8 })
  assert.deepEqual(extra.sweep.numbers, [1, 2])
  const result = decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled(), ...extra })
  assert.deepEqual(result.numbers, [1, 2])
})

test('a used-up daily cap ends the sweep after the count and before it reads a candidate state', async () => {
  const analyses = Array.from({ length: 10 }, () => ({ at: '2026-10-25T10:00:00Z', trigger: 'sweep' }))
  const busy = { ...state.emptyIssueState(900), analyses }
  const client = sweepClient({
    bugs: [issueItem(1, '2026-10-20T00:00:00Z')],
    updated: [{ number: 900 }],
    comments: { 900: [stateComment(busy)] },
  })
  const extra = await sweepGather(client)
  assert.deepEqual(extra.sweep.numbers, [])
  assert.deepEqual(client.calls.filter((c) => c[0] === 'listIssueComments').map((c) => c[1]), [900])
  const result = decide({ eventName: 'schedule', payload: sweepEvent(), config: enabled(), ...extra })
  assert.deepEqual(result, { action: 'skip', number: null, reason: 'daily limit of 10 automatic analyses reached' })
})

test('a damaged state comment leaves that candidate out of the sweep and does not stop it', async () => {
  const bad = {
    id: 2,
    user: { login: 'github-actions[bot]' },
    body: `${state.MARKER}\nhuman\n\n<!-- ai-autonomous-state-json\n{ not json\n-->\n`,
  }
  const client = sweepClient({
    bugs: [issueItem(1, '2026-10-20T00:00:00Z'), issueItem(2, '2026-10-20T01:00:00Z'), issueItem(3, '2026-10-20T02:00:00Z')],
    comments: { 2: [bad] },
  })
  const lines = []
  log.setWriter((line) => lines.push(line))
  let extra
  try {
    extra = await sweepGather(client)
  } finally {
    log.setWriter(() => {})
  }
  assert.deepEqual(extra.sweep.numbers, [1, 3])
  assert.ok(lines.some((line) => /^::warning::The state comment of #2 is unreadable.*left out of the sweep/.test(line)))
})

test('a disabled agent gathers nothing for the sweep', async () => {
  const getClient = () => assert.fail('the client must not be created')
  const extra = await gather({ eventName: 'schedule', payload: sweepEvent(), config: loadConfig({}), getClient })
  assert.deepEqual(extra, { actorPermission: 'none', pullState: null })
})

test('the sweep needs the repository name', async () => {
  await assert.rejects(
    gather({ eventName: 'schedule', payload: sweepEvent(), config: enabled(), getClient: () => sweepClient() }),
    /GITHUB_REPOSITORY is not set/,
  )
})

async function runScheduleMain(env, deps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-sweep-test-'))
  try {
    const full = {
      GITHUB_EVENT_NAME: 'schedule',
      GITHUB_EVENT_PATH: path.join(dir, 'event.json'),
      GITHUB_OUTPUT: path.join(dir, 'output'),
      GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
      GITHUB_REPOSITORY: REPO,
      AGENT_ENABLED: 'true',
      AGENT_DRY_RUN: 'false',
      ...env,
    }
    fs.copyFileSync(path.join(__dirname, 'fixtures', 'schedule.sweep.json'), full.GITHUB_EVENT_PATH)
    const decision = await main(full, deps)
    return {
      decision,
      output: fs.readFileSync(full.GITHUB_OUTPUT, 'utf8'),
      summary: fs.readFileSync(full.GITHUB_STEP_SUMMARY, 'utf8'),
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('main writes the numbers of the sweep and a summary line', async () => {
  const client = sweepClient({ bugs: [issueItem(7, '2026-10-20T00:00:00Z')], tasks: [issueItem(9, '2026-10-21T00:00:00Z')] })
  const { output, summary } = await runScheduleMain({}, { getClient: () => client, now: NOW })
  assert.equal(
    output,
    'action=analyze\nnumber=7\nreason=the grace period is over for 2 new issue(s): #7, #9\ncommand=\n' +
      'trigger=sweep\nnumbers=[7,9]\n',
  )
  assert.match(summary, /chose `analyze` for #7/)
})

test('main writes a skip for a sweep with nothing to do', async () => {
  const { output, summary } = await runScheduleMain({}, { getClient: () => sweepClient(), now: NOW })
  assert.equal(output, 'action=skip\nnumber=\nreason=no new issue is past the grace period\ncommand=\n')
  assert.equal(summary, '- AI Autonomous agent chose `skip`: no new issue is past the grace period\n')
})

test('main skips a sweep in dry run without a client and says why', async () => {
  const { output, summary } = await runScheduleMain(
    { AGENT_DRY_RUN: 'true' },
    { getClient: () => assert.fail('no client') },
  )
  assert.equal(output, `action=skip\nnumber=\nreason=${DRY_RUN_REASON}\ncommand=\n`)
  assert.match(summary, /chose `skip`: the sweep needs AGENT_DRY_RUN=false/)
})

test('main skips a sweep of a disabled agent without a client', async () => {
  const { output } = await runScheduleMain({ AGENT_ENABLED: '' }, { getClient: () => assert.fail('no client') })
  assert.match(output, /^action=skip\nnumber=\nreason=AGENT_ENABLED is not true\n/)
})

// ---------------------------------------------------------------------------------------------------------------
// Daily caps: the count
// ---------------------------------------------------------------------------------------------------------------

const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600 * 1000).toISOString()

function countClient({ items, comments, kind }) {
  const calls = []
  return {
    calls,
    searchIssues: async (query) => (calls.push(['searchIssues', query]), items),
    listIssueComments: async (n) => (calls.push(['listIssueComments', n]), comments[n] ?? []),
    kind,
  }
}

const openedPull = () => fixture('pull_request.opened')
const gatherPull = (client, env = {}, payload = openedPull()) =>
  gather({
    eventName: 'pull_request',
    payload,
    config: enabled(env),
    getClient: () => client,
    repository: REPO,
    now: NOW,
  })

test('the review count searches the pull requests updated in the last 24 hours and counts automatic reviews', async () => {
  const pull = (number, reviews) => ({ ...state.emptyPullState(number), reviews })
  const client = countClient({
    items: [{ number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }],
    comments: {
      1: [stateComment(pull(1, [
        { sha: 'a', at: hoursAgo(1), trigger: 'auto' },
        { sha: 'b', at: hoursAgo(2), trigger: 'command' },
      ]))],
      // Entries from before the trigger existed count as automatic; a size skip cost nothing.
      2: [stateComment(pull(2, [
        { sha: 'c', at: hoursAgo(3) },
        { sha: 'd', at: hoursAgo(3), skipped: 'size', trigger: 'auto' },
      ]))],
      // Exactly 24 hours ago is inside the window, one millisecond earlier is outside.
      3: [stateComment(pull(3, [
        { sha: 'e', at: '2026-10-24T12:00:00.500Z', trigger: 'auto' },
        { sha: 'f', at: '2026-10-24T12:00:00.499Z', trigger: 'auto' },
      ]))],
      4: [],
    },
  })
  const extra = await gatherPull(client)
  assert.deepEqual(extra.dailyUsage, { reviews: 3 })
  assert.deepEqual(client.calls[0], [
    'searchIssues',
    'repo:o/r is:pr label:"agent:pr-reviewed" updated:>=2026-10-24T12:00:00Z sort:updated-desc',
  ])
  assert.deepEqual(client.calls.slice(1).map((c) => c[1]), [1, 2, 3, 4])
})

test('the analysis count reads issue states and counts only opened, typed, and sweep entries', async () => {
  const issue = (number, analyses) => ({ ...state.emptyIssueState(number), analyses })
  const client = countClient({
    items: [{ number: 1 }, { number: 2 }],
    comments: {
      1: [stateComment(issue(1, [
        { at: hoursAgo(1), trigger: 'opened' },
        { at: hoursAgo(1), trigger: 'edited' },
        { at: hoursAgo(1), trigger: 'author-reply' },
        { at: hoursAgo(1), trigger: 'command' },
      ]))],
      2: [stateComment(issue(2, [
        { at: hoursAgo(5), trigger: 'typed' },
        { at: hoursAgo(5), trigger: 'sweep' },
        { at: hoursAgo(30), trigger: 'sweep' },
      ]))],
    },
  })
  const extra = await gather({
    eventName: 'issues',
    payload: fixture('issues.opened.bug'),
    config: enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '0' }),
    getClient: () => client,
    repository: REPO,
    now: NOW,
  })
  assert.deepEqual(extra.dailyUsage, { analyses: 3 })
  assert.equal(client.calls[0][1], ANALYSIS_COUNT)
})

test('the count reads at most 100 state comments and warns when the search found more', async () => {
  const items = Array.from({ length: 150 }, (_, i) => ({ number: i + 1 }))
  const client = countClient({ items, comments: {} })
  const lines = []
  log.setWriter((line) => lines.push(line))
  try {
    await gatherPull(client)
  } finally {
    log.setWriter(() => {})
  }
  const read = client.calls.filter((c) => c[0] === 'listIssueComments').map((c) => c[1])
  assert.equal(read.length, 100)
  assert.deepEqual([read[0], read.at(-1)], [1, 100])
  assert.ok(lines.some((line) => /^::warning::150 pull requests were updated.*only 100 state comments are read/.test(line)))
  // With 100 or fewer there is no warning.
  const quiet = []
  log.setWriter((line) => quiet.push(line))
  try {
    await gatherPull(countClient({ items: items.slice(0, 100), comments: {} }))
  } finally {
    log.setWriter(() => {})
  }
  assert.equal(quiet.some((line) => line.startsWith('::warning::')), false)
})

test('a damaged state comment is warned about and not counted', async () => {
  const bad = { id: 2, user: { login: 'github-actions[bot]' }, body: `${state.MARKER}\nhuman\n\n<!-- ai-autonomous-state-json\n{ not json\n-->\n` }
  const good = stateComment({ ...state.emptyPullState(2), reviews: [{ at: hoursAgo(1), trigger: 'auto' }] })
  const client = countClient({ items: [{ number: 1 }, { number: 2 }], comments: { 1: [bad], 2: [good] } })
  const lines = []
  log.setWriter((line) => lines.push(line))
  let extra
  try {
    extra = await gatherPull(client)
  } finally {
    log.setWriter(() => {})
  }
  assert.deepEqual(extra.dailyUsage, { reviews: 1 })
  assert.ok(lines.some((line) => /^::warning::The state comment of #1 is unreadable/.test(line)))
})

test('a pull request that needs no count does not search', async () => {
  const getClient = () => assert.fail('no client')
  for (const name of ['pull_request.draft', 'pull_request.fork', 'pull_request.agent-marker', 'pull_request.dependabot']) {
    const extra = await gather({ eventName: 'pull_request', payload: fixture(name), config: enabled(), getClient })
    assert.equal(extra.dailyUsage, undefined, name)
  }
})

test('dailyCountNeeded names the count only for an event that would start automatic work', () => {
  const grace0 = enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '0' })
  const grace30 = enabled()
  // The sweep counts for itself, after it found a candidate.
  assert.equal(dailyCountNeeded('schedule', sweepEvent(), grace30, {}), null)
  assert.equal(dailyCountNeeded('pull_request', openedPull(), grace30, {}), 'reviews')
  const ready = fixture('pull_request.ready_for_review')
  assert.equal(dailyCountNeeded('pull_request', ready, grace30, { pullState: null }), 'reviews')
  assert.equal(dailyCountNeeded('pull_request', ready, grace30, { pullState: { reviews: [{ sha: 'a' }] } }), null)
  const closed = openedPull()
  closed.action = 'synchronize'
  assert.equal(dailyCountNeeded('pull_request', closed, grace30, {}), null)
  assert.equal(dailyCountNeeded('issues', fixture('issues.opened.bug'), grace0, {}), 'analyses')
  assert.equal(dailyCountNeeded('issues', fixture('issues.typed.task'), grace0, {}), 'analyses')
  // The grace period holds the event back, so it needs no count.
  assert.equal(dailyCountNeeded('issues', fixture('issues.opened.bug'), grace30, {}), null)
  // Answers of the author, other types, labels decided by a person, and commands are not capped.
  assert.equal(dailyCountNeeded('issues', fixture('issues.edited'), grace0, {}), null)
  assert.equal(dailyCountNeeded('issues', fixture('issues.opened.feature'), grace0, {}), null)
  const decided = fixture('issues.opened.bug')
  decided.issue.labels = [{ name: 'ai:suitable' }]
  assert.equal(dailyCountNeeded('issues', decided, grace0, {}), null)
  assert.equal(dailyCountNeeded('issue_comment', fixture('issue_comment.analyze'), grace0, {}), null)
  assert.equal(dailyCountNeeded('issue_comment', fixture('issue_comment.pr'), grace0, {}), null)
  assert.equal(dailyCountNeeded('workflow_run', fixture('workflow_run.completed'), grace0, {}), null)
})

test('a command gathers no daily count', async () => {
  for (const name of ['issue_comment.pr', 'issue_comment.analyze']) {
    const calls = []
    const client = {
      getPermission: async () => 'write',
      searchIssues: async () => assert.fail('commands are not counted'),
      listIssueComments: async (n) => (calls.push(n), []),
    }
    const extra = await gather({
      eventName: 'issue_comment',
      payload: fixture(name),
      config: enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '0' }),
      getClient: () => client,
      repository: REPO,
      now: NOW,
    })
    assert.equal(extra.dailyUsage, undefined, name)
  }
})

test('main needs a token for the daily count of a new pull request', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-sweep-test-'))
  try {
    const env = {
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_EVENT_PATH: path.join(dir, 'event.json'),
      GITHUB_REPOSITORY: REPO,
      GITHUB_OUTPUT: path.join(dir, 'output'),
      AGENT_ENABLED: 'true',
    }
    fs.copyFileSync(path.join(__dirname, 'fixtures', 'pull_request.opened.json'), env.GITHUB_EVENT_PATH)
    await assert.rejects(main(env), /GITHUB_TOKEN is not set/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------------------------------------------
// Daily caps: the decisions
// ---------------------------------------------------------------------------------------------------------------

test('an automatic review at the cap is skipped with the reason; below it the review runs', () => {
  const at = decide({ eventName: 'pull_request', payload: openedPull(), config: enabled(), dailyUsage: { reviews: 15 } })
  assert.deepEqual(at, {
    action: 'skip',
    number: 123,
    reason: 'daily limit of 15 automatic reviews reached; comment /agent review',
  })
  assert.equal(
    decide({ eventName: 'pull_request', payload: openedPull(), config: enabled(), dailyUsage: { reviews: 99 } }).action,
    'skip',
  )
  const below = decide({ eventName: 'pull_request', payload: openedPull(), config: enabled(), dailyUsage: { reviews: 14 } })
  assert.equal(below.action, 'review')
  const lowered = decide({
    eventName: 'pull_request',
    payload: openedPull(),
    config: enabled({ AGENT_DAILY_REVIEWS: '2' }),
    dailyUsage: { reviews: 2 },
  })
  assert.match(lowered.reason, /^daily limit of 2 automatic reviews/)
  // The same for a pull request that leaves the draft state.
  const ready = decide({
    eventName: 'pull_request',
    payload: fixture('pull_request.ready_for_review'),
    config: enabled(),
    dailyUsage: { reviews: 15 },
  })
  assert.equal(ready.action, 'skip')
})

test('other skip reasons of a pull request come before the cap', () => {
  const draft = decide({
    eventName: 'pull_request',
    payload: fixture('pull_request.draft'),
    config: enabled(),
    dailyUsage: { reviews: 15 },
  })
  assert.equal(draft.reason, 'draft pull request')
})

test('/agent review is not capped', () => {
  const result = decide({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.pr'),
    config: enabled(),
    actorPermission: 'write',
    dailyUsage: { reviews: 99 },
  })
  assert.equal(result.action, 'review')
})

test('an automatic analysis at the cap is skipped; the sweep picks it up later', () => {
  const config = enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '0' })
  for (const name of ['issues.opened.bug', 'issues.typed.task']) {
    const result = decide({ eventName: 'issues', payload: fixture(name), config, dailyUsage: { analyses: 10 } })
    assert.equal(result.action, 'skip', name)
    assert.equal(result.reason, 'daily limit of 10 automatic analyses reached')
  }
  assert.equal(
    decide({ eventName: 'issues', payload: fixture('issues.opened.bug'), config, dailyUsage: { analyses: 9 } }).action,
    'analyze',
  )
})

test('the answers of the author and the commands are not capped', () => {
  const config = enabled({ AGENT_ANALYSIS_GRACE_MINUTES: '0' })
  const full = { analyses: 99 }
  const edited = decide({
    eventName: 'issues',
    payload: fixture('issues.edited'),
    config,
    issueState: needsInfo(),
    dailyUsage: full,
  })
  assert.equal(edited.action, 'analyze')
  const reply = decide({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.author-reply'),
    config,
    issueState: needsInfo(),
    dailyUsage: full,
  })
  assert.equal(reply.action, 'analyze')
  const command = decide({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.analyze'),
    config,
    actorPermission: 'write',
    dailyUsage: full,
  })
  assert.equal(command.action, 'analyze')
})

test('the reason of a skipped decision reaches the summary line', () => {
  const skipped = decide({ eventName: 'pull_request', payload: openedPull(), config: enabled(), dailyUsage: { reviews: 15 } })
  assert.equal(
    formatSummary(skipped),
    '- AI Autonomous agent chose `skip` for #123: daily limit of 15 automatic reviews reached; comment /agent review\n',
  )
  assert.match(formatOutputs(skipped), /\nreason=daily limit of 15 automatic reviews reached; comment \/agent review\n/)
})

test('main logs the count and the cap of the decision', async () => {
  const lines = []
  log.setWriter((line) => lines.push(line))
  try {
    const client = countClient({ items: [], comments: {} })
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-sweep-test-'))
    try {
      const env = {
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_EVENT_PATH: path.join(dir, 'event.json'),
        GITHUB_REPOSITORY: REPO,
        GITHUB_OUTPUT: path.join(dir, 'output'),
        AGENT_ENABLED: 'true',
      }
      fs.copyFileSync(path.join(__dirname, 'fixtures', 'pull_request.opened.json'), env.GITHUB_EVENT_PATH)
      await main(env, { getClient: () => client, now: NOW })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  } finally {
    log.setWriter(() => {})
  }
  assert.ok(lines.some((line) => /decision action=review/.test(line) && /dailyReviews=0\/15/.test(line)))
})

test('ready_for_review treats a failed review as reviewed: the failure comment tells the person to ask again', () => {
  const pullState = { ...state.emptyPullState(1), reviews: [{ sha: 'a', at: hoursAgo(1), trigger: 'auto', failed: true }] }
  const result = decide({
    eventName: 'pull_request',
    payload: fixture('pull_request.ready_for_review'),
    config: enabled(),
    pullState,
  })
  assert.deepEqual([result.action, result.reason], ['skip', 'already reviewed; use /agent review'])
})
