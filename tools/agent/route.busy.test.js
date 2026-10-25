'use strict'
// One command at a time per issue or pull request: the router declines a command while an older run of the workflow
// works on the same number. The rules of `decide` are tested in the other route test files.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const log = require('./lib/log')
const state = require('./lib/state')
const {
  decide, declineIfBusy, isWorkerCommand, workNumbers, findBusyRun, WORKFLOW_FILE, BUSY_WINDOW_MS, main,
} = require('./route')

log.setWriter(() => {})

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))
const enabled = (extra = {}) => loadConfig({ AGENT_ENABLED: 'true', ...extra })
const live = () => enabled({ AGENT_DRY_RUN: 'false' })
const NOW = new Date('2026-10-26T12:00:00Z')
const OWN = 5000
const write = { actorPermission: 'write' }

const comment = (name, body) => {
  const payload = fixture(name)
  payload.comment.body = body
  return payload
}
const issueState = (extra = {}) => ({
  schema: 1,
  kind: 'issue',
  number: 200,
  phase: 'needs-human',
  pr: 70,
  branch: 'bugfix/200-changelog-is-empty-for-a',
  attempts: [{ n: 1, kind: 'initial', actor: 'carol', result: 'draft' }],
  costs: [],
  ...extra,
})
const agentFacts = () => ({ issueNumber: 200, issueState: issueState() })

/** A run of the workflow as the list endpoint returns it. */
const run = (id, number, extra = {}) => ({
  id,
  status: 'in_progress',
  created_at: '2026-10-26T11:00:00Z',
  display_title: `AI Autonomous: issue_comment #${number}`,
  html_url: `https://github.com/o/r/actions/runs/${id}`,
  ...extra,
})

/** A client that serves `runs` and the comments of any issue, and records what the router reads and writes. */
function fakeClient(runs, issueComments = []) {
  const calls = { listed: [], comments: [], reactions: [], read: [] }
  const client = {
    listIssueComments: async (number) => {
      calls.read.push(number)
      if (issueComments instanceof Error) throw issueComments
      return issueComments
    },
    listWorkflowRuns: async (file, options) => {
      calls.listed.push({ file, options })
      return runs
    },
    createIssueComment: async (number, body) => {
      calls.comments.push({ number, body })
    },
    addReaction: async (id, content) => {
      calls.reactions.push({ id, content })
    },
  }
  return { client, calls }
}

/** Decides for a comment, then runs the busy check against `runs`. */
async function check({
  payload, runs, config = live(), extra = write, eventName = 'issue_comment', summary, issueComments,
}) {
  const decision = decide({ eventName, payload, config, ...extra })
  const { client, calls } = fakeClient(runs, issueComments)
  const env = { GITHUB_RUN_ID: String(OWN), GITHUB_REPOSITORY: 'o/r', GITHUB_STEP_SUMMARY: summary }
  const result = await declineIfBusy({ eventName, payload, decision, config, env, getClient: () => client, now: NOW })
  return { decision, result, calls }
}

test('an older active run on the same issue declines the command: skip, comment, and a confused reaction', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const { decision, result, calls } = await check({ payload, runs: [run(4000, 200)] })
  assert.equal(decision.action, 'rerun')
  assert.deepEqual(result, { action: 'skip', number: 200, reason: 'busy: run 4000 works on #200' })
  assert.deepEqual(calls.comments, [{
    number: 200,
    body: '@carol, I am already working on #200 ([run 4000](https://github.com/o/r/actions/runs/4000)), so I did ' +
      'not start `/agent rerun`. Comment it again when that run ends.',
  }])
  assert.deepEqual(calls.reactions, [{ id: 9101, content: 'confused' }])
})

test('the busy check lists the runs of the workflow created in the last 6 hours', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const { calls } = await check({ payload, runs: [] })
  assert.deepEqual(calls.listed, [{ file: WORKFLOW_FILE, options: { created: '>=2026-10-26T06:00:00Z' } }])
  assert.equal(WORKFLOW_FILE, 'ai-autonomous-agent.yml')
  assert.equal(BUSY_WINDOW_MS, 6 * 60 * 60 * 1000)
})

test('no run on the number: the decision stays, and nothing is written', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const { decision, result, calls } = await check({ payload, runs: [run(4000, 201), run(4001, 2)] })
  assert.equal(result, decision)
  assert.deepEqual([calls.comments, calls.reactions], [[], []])
})

test('a newer run is ignored: it declines itself, so the first comment wins', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const { decision, result, calls } = await check({ payload, runs: [run(OWN + 1, 200), run(OWN + 90, 200)] })
  assert.equal(result, decision)
  assert.deepEqual(calls.comments, [])
})

test('the run of the router itself is ignored', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const { decision, result } = await check({ payload, runs: [run(OWN, 200)] })
  assert.equal(result, decision)
})

test('only a run that has not finished counts; every unfinished status does', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  for (const status of ['completed', 'cancelled', 'success']) {
    const { decision, result } = await check({ payload, runs: [run(4000, 200, { status })] })
    assert.equal(result, decision, status)
  }
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    const { result } = await check({ payload, runs: [run(4000, 200, { status })] })
    assert.equal(result.action, 'skip', status)
  }
})

test('a run created before the window, or without a creation time, is ignored', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const old = run(4000, 200, { created_at: '2026-10-26T05:59:59Z' })
  const none = run(4001, 200, { created_at: undefined })
  const edge = run(4002, 200, { created_at: '2026-10-26T06:00:00Z' })
  assert.equal((await check({ payload, runs: [old, none] })).result.action, 'rerun')
  assert.equal((await check({ payload, runs: [old, edge] })).result.reason, 'busy: run 4002 works on #200')
})

test('the title must end with the number: #20 and #2000 are not #200, and the sweep has no number', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const titles = ['AI Autonomous: issue_comment #20', 'AI Autonomous: issue_comment #2000', 'AI Autonomous: schedule #',
    'AI Autonomous: issue_comment #200 and more', '#200 AI Autonomous', 'CI', undefined]
  const runs = titles.map((display_title, i) => run(4000 + i, 200, { display_title }))
  const { decision, result } = await check({ payload, runs })
  assert.equal(result, decision)
})

test('the oldest of several busy runs is named', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const { result } = await check({ payload, runs: [run(4100, 200), run(4000, 200), run(4050, 200)] })
  assert.equal(result.reason, 'busy: run 4000 works on #200')
})

test('a command on the agent pull request counts its issue as the same piece of work', async () => {
  const payload = comment('issue_comment.chat.agent-pr', '/agent retry use the second parser')
  const extra = { ...write, agentFacts: agentFacts() }
  const { decision, result, calls } = await check({ payload, extra, runs: [run(4000, 200)] })
  assert.deepEqual([decision.action, decision.number, decision.pr], ['implement', 200, 70])
  assert.equal(result.reason, 'busy: run 4000 works on #200')
  // The comment goes where the command was written: the pull request.
  assert.deepEqual(calls.comments.map((c) => c.number), [70])
  assert.match(calls.comments[0].body, /working on #200 .*did not start `\/agent retry`/)
})

test('a command on an issue counts a run on the pull request named by the decision', async () => {
  const payload = comment('issue_comment.chat.agent-pr', '/agent ci_check')
  const extra = { ...write, agentFacts: agentFacts() }
  const { decision, result, calls } = await check({ payload, extra, runs: [run(4000, 200)] })
  assert.deepEqual([decision.action, decision.number, decision.issue], ['ci-check', 70, 200])
  assert.equal(result.reason, 'busy: run 4000 works on #200')
  assert.match(calls.comments[0].body, /did not start `\/agent ci_check`/)
  const onPull = await check({ payload, extra, runs: [run(4000, 70)] })
  assert.equal(onPull.result.reason, 'busy: run 4000 works on #70')
})

/** The comment of the router with the state of issue 200, written by the workflow bot. */
const stateComment = (st) => ({ id: 5, user: { login: 'github-actions[bot]' }, body: state.render('human', st) })

test('a command on an issue also counts a run on the pull request that its state names', async () => {
  const payload = comment('issue_comment.help', '/agent retry try again')
  const issueComments = [stateComment(issueState())]
  const { decision, result, calls } = await check({ payload, issueComments, runs: [run(4000, 70)] })
  assert.deepEqual([decision.action, decision.number, decision.pr], ['implement', 200, undefined])
  assert.equal(result.reason, 'busy: run 4000 works on #70')
  assert.deepEqual(calls.read, [200])
  // The comment goes where the command was written: the issue.
  assert.deepEqual(calls.comments.map((c) => c.number), [200])
  assert.match(calls.comments[0].body, /working on #70 .*did not start `\/agent retry`/)
  // A run on the issue itself is still found, and an unrelated number is not.
  assert.equal((await check({ payload, issueComments, runs: [run(4000, 200)] })).result.action, 'skip')
  const free = await check({ payload, issueComments, runs: [run(4000, 71)] })
  assert.equal(free.result, free.decision)
})

test('the state of the issue is read only for a worker command written on an issue', async () => {
  const issueComments = [stateComment(issueState())]
  const onPull = await check({
    payload: comment('issue_comment.pr', '/agent review'), issueComments, runs: [run(4000, 70)],
  })
  assert.deepEqual(onPull.calls.read, [])
  assert.equal(onPull.result, onPull.decision)
  for (const body of ['/agent stop', '/agent help', '/agent cost']) {
    const payload = comment('issue_comment.help', body)
    const { calls } = await check({ payload, issueComments, runs: [run(4000, 70)] })
    assert.deepEqual([calls.read, calls.listed], [[], []], body)
  }
  const automatic = fakeClient([run(4000, 70)], issueComments)
  await declineIfBusy({
    eventName: 'issues', payload: fixture('issues.opened.bug'), decision: { action: 'analyze', number: 200 },
    config: live(), env: {}, getClient: () => automatic.client, now: NOW,
  })
  assert.deepEqual(automatic.calls.read, [])
})

test('an issue with no usable state or a failing read is checked by its own number only', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const broken = { id: 6, user: { login: 'github-actions[bot]' }, body: '<!-- ai-autonomous-state -->\n{not json' }
  const cases = {
    'no state comment': [],
    'a state of a person': [{ id: 7, user: { login: 'carol' }, body: state.render('x', issueState()) }],
    'a damaged state': [broken],
    'a state without a pull request': [stateComment(issueState({ pr: undefined }))],
    'a failing read': new Error('GitHub GET failed with 500'),
  }
  for (const [name, issueComments] of Object.entries(cases)) {
    const other = await check({ payload, issueComments, runs: [run(4000, 70)] })
    assert.equal(other.result, other.decision, name)
    const own = await check({ payload, issueComments, runs: [run(4000, 200)] })
    assert.equal(own.result.reason, 'busy: run 4000 works on #200', name)
  }
})

test('workNumbers gathers the event, the decision, the pull request, and the issue', () => {
  const payload = fixture('issue_comment.chat.agent-pr')
  assert.deepEqual([...workNumbers({ number: 200, pr: 70 }, payload)].sort((a, b) => a - b), [70, 200])
  assert.deepEqual([...workNumbers({ number: 70, issue: 200 }, payload)].sort((a, b) => a - b), [70, 200])
  assert.deepEqual([...workNumbers({ number: null }, { schedule: 'x' })], [])
  const linked = workNumbers({ number: 200 }, fixture('issue_comment.help'), [70, 0, 'x'])
  assert.deepEqual([...linked].sort((a, b) => a - b), [70, 200])
})

test('every command that starts a worker job is declined, with its own words', async () => {
  const cases = [
    ['issue_comment.help', '/agent rerun', 'start `/agent rerun`'],
    ['issue_comment.help', '/agent implement', 'start `/agent implement`'],
    ['issue_comment.help', '/agent analyze', 'start `/agent analyze`'],
    ['issue_comment.help', '/agent retry try again', 'start `/agent retry`'],
    ['issue_comment.pr', '/agent review', 'start `/agent review`'],
    ['issue_comment.pr', '/agent ci-check', 'start `/agent ci_check`'],
    ['issue_comment.help', '/agent why is this slow?', 'answer your question'],
  ]
  for (const [name, body, said] of cases) {
    const payload = comment(name, body)
    const issue = payload.issue.number
    const { decision, result, calls } = await check({ payload, runs: [run(4000, issue)] })
    assert.notEqual(decision.action, 'skip', body)
    assert.equal(result.action, 'skip', body)
    assert.ok(calls.comments[0].body.includes(`so I did not ${said}. Comment it again when that run ends.`), body)
  }
})

test('the answer to a hand-off is declined too', async () => {
  const payload = fixture('issue_comment.answer')
  const extra = { ...write, issueState: issueState() }
  const { decision, result, calls } = await check({ payload, extra, runs: [run(4000, 200)] })
  assert.deepEqual([decision.action, decision.command.name], ['implement', 'answer'])
  assert.equal(result.reason, 'busy: run 4000 works on #200')
  assert.match(calls.comments[0].body, /so I did not act on your answer\./)
})

test('a change request in a review is declined on the pull request, without a reaction', async () => {
  const payload = fixture('pull_request_review.changes_requested')
  const extra = { ...write, agentFacts: agentFacts() }
  const runs = [run(4000, 70)]
  const { decision, result, calls } = await check({ payload, extra, eventName: 'pull_request_review', runs })
  assert.deepEqual([decision.action, decision.kind], ['implement', 'review'])
  assert.equal(result.reason, 'busy: run 4000 works on #70')
  assert.deepEqual(calls.comments.map((c) => c.number), [70])
  assert.match(calls.comments[0].body, /^@carol, .* so I did not act on your change request\./)
  assert.deepEqual(calls.reactions, [])
})

test('stop, help, and cost are never declined, and the busy check does not even list the runs', async () => {
  for (const [name, body] of [['issue_comment.stop', '/agent stop'], ['issue_comment.help', '/agent help'],
    ['issue_comment.cost', '/agent cost'], ['issue_comment.help', '/agent']]) {
    const payload = comment(name, body)
    const { decision, result, calls } = await check({ payload, runs: [run(4000, 200)] })
    assert.equal(result, decision, body)
    assert.deepEqual([calls.listed, calls.comments, calls.reactions], [[], [], []], body)
  }
})

test('automatic events are never declined', async () => {
  const cases = [
    ['pull_request', fixture('pull_request.opened')],
    ['issues', fixture('issues.opened.bug')],
    ['issue_comment', fixture('issue_comment.author-reply')],
    ['workflow_run', fixture('workflow_run.completed')],
    ['schedule', fixture('schedule.sweep')],
  ]
  for (const [eventName, payload] of cases) {
    const decision = { action: 'review', number: 200, reason: 'x' }
    const { client, calls } = fakeClient([run(4000, 200)])
    const result = await declineIfBusy({
      eventName, payload, decision, config: live(), env: {}, getClient: () => client, now: NOW,
    })
    assert.equal(result, decision, eventName)
    assert.deepEqual(calls.listed, [], eventName)
  }
  assert.equal(isWorkerCommand('pull_request', { action: 'review', command: { name: 'review' } }), false)
  assert.equal(isWorkerCommand('issue_comment', { action: 'review', reason: 'no command' }), false)
  assert.equal(isWorkerCommand('issue_comment', { action: 'chat', command: { name: 'help' } }), false)
  assert.equal(isWorkerCommand('issue_comment', { action: 'chat', command: { name: 'cost' } }), false)
  assert.equal(isWorkerCommand('issue_comment', { action: 'chat', command: { name: 'chat' } }), true)
  assert.equal(isWorkerCommand('issue_comment', { action: 'stop', command: { name: 'stop' } }), false)
  assert.equal(isWorkerCommand('issue_comment', { action: 'skip', command: { name: 'review' } }), false)
})

test('a skipped decision is not looked at: no listing for a command without rights', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const extra = { actorPermission: 'read' }
  const { decision, result, calls } = await check({ payload, extra, runs: [run(4000, 200)] })
  assert.equal(decision.action, 'skip')
  assert.equal(result, decision)
  assert.deepEqual(calls.listed, [])
})

test('dry run: no comment and no reaction; the job summary says what would be posted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-busy-test-'))
  try {
    const summary = path.join(dir, 'summary')
    const payload = comment('issue_comment.help', '/agent rerun')
    const { result, calls } = await check({ payload, runs: [run(4000, 200)], config: enabled(), summary })
    assert.equal(result.reason, 'busy: run 4000 works on #200')
    assert.deepEqual([calls.comments, calls.reactions], [[], []])
    const text = fs.readFileSync(summary, 'utf8')
    assert.match(text, /## Dry run: decline on #200/)
    assert.match(text, /> @carol, I am already working on #200 .*did not start `\/agent rerun`/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a failed comment fails the router, so no worker starts', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const config = live()
  const decision = decide({ eventName: 'issue_comment', payload, config, ...write })
  const { client } = fakeClient([run(4000, 200)])
  client.createIssueComment = async () => {
    throw new Error('GitHub POST failed with 403')
  }
  await assert.rejects(
    declineIfBusy({
      eventName: 'issue_comment', payload, decision, config, env: { GITHUB_RUN_ID: String(OWN) },
      getClient: () => client, now: NOW,
    }),
    /403/,
  )
})

test('a command needs GITHUB_RUN_ID to tell its own run from an older one', async () => {
  const payload = comment('issue_comment.help', '/agent rerun')
  const decision = decide({ eventName: 'issue_comment', payload, config: live(), ...write })
  await assert.rejects(
    declineIfBusy({
      eventName: 'issue_comment', payload, decision, config: live(), env: {}, getClient: () => fakeClient([]).client,
      now: NOW,
    }),
    /GITHUB_RUN_ID is not set/,
  )
})

test('findBusyRun takes a plain list of runs', () => {
  const runs = [run(4000, 7), run(4001, 8)]
  assert.deepEqual(findBusyRun(runs, { numbers: new Set([8]), ownRunId: OWN, now: NOW }), { run: runs[1], number: 8 })
  assert.equal(findBusyRun(runs, { numbers: new Set([9]), ownRunId: OWN, now: NOW }), null)
})

test('main writes a skip with the busy reason and posts the comment', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-busy-main-'))
  try {
    const eventPath = path.join(dir, 'event.json')
    fs.writeFileSync(eventPath, JSON.stringify(comment('issue_comment.help', '/agent rerun')))
    const env = {
      GITHUB_EVENT_NAME: 'issue_comment',
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: path.join(dir, 'output'),
      GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_RUN_ID: String(OWN),
      AGENT_ENABLED: 'true',
      AGENT_DRY_RUN: 'false',
    }
    const { client, calls } = fakeClient([run(4000, 200)])
    client.getPermission = async () => 'write'
    const decision = await main(env, { getClient: () => client, now: NOW })
    assert.deepEqual(decision, { action: 'skip', number: 200, reason: 'busy: run 4000 works on #200' })
    assert.equal(
      fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'),
      'action=skip\nnumber=200\nreason=busy: run 4000 works on #200\ncommand=\n',
    )
    assert.match(fs.readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'), /chose `skip` for #200: busy: run 4000/)
    assert.equal(calls.comments.length, 1)
    assert.deepEqual(calls.reactions, [{ id: 9101, content: 'confused' }])

    // The same command with no run in the way goes on to the worker job.
    fs.rmSync(env.GITHUB_OUTPUT)
    const free = fakeClient([])
    free.client.getPermission = async () => 'write'
    const next = await main(env, { getClient: () => free.client, now: NOW })
    assert.equal(next.action, 'rerun')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
