'use strict'
// Routing rules of phase 4: the CI gate on `workflow_run`. The earlier rules are tested in route.test.js and
// route.analysis.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const state = require('./lib/state')
const log = require('./lib/log')
const { decide, gather, needsCiFacts, agentIssueOf, formatOutputs, formatSummary, main } = require('./route')

log.setWriter(() => {})

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))
const enabled = (extra = {}) => loadConfig({ AGENT_ENABLED: 'true', ...extra })
const SHA = '3f2a9c1d5b7e8f40a1b2c3d4e5f60718293a4b5c'
const MARKER = '<!-- ai-autonomous-agent issue=200 -->'

const agentPull = (extra = {}) => ({
  number: 70,
  state: 'open',
  draft: false,
  body: `## Why\n\nA fix.\n\nCloses #200.\n\nImplemented by the AI Autonomous agent on request of @carol.\n\n${MARKER}`,
  head: { ref: 'bugfix/200-changelog-is-empty-for-a', sha: SHA },
  ...extra,
})
const waiting = (extra = {}) => ({
  schema: 1,
  kind: 'issue',
  number: 200,
  phase: 'waiting-ci',
  pr: 70,
  attempts: [{ n: 1, kind: 'initial', actor: 'carol', result: 'pr-opened' }],
  costs: [],
  ...extra,
})
const route = (payload, ciFacts, config = enabled()) => decide({ eventName: 'workflow_run', payload, config, ciFacts })
const facts = (pull = agentPull(), issueState = waiting()) => ({ pull, issueState })

test('a finished CI run of the open pull request of the agent that waits for CI goes to the gate', () => {
  assert.deepEqual(route(fixture('workflow_run.completed'), facts()), {
    action: 'ci-gate',
    number: 200,
    pr: 70,
    headSha: SHA,
    reason: 'CI finished for pull request #70',
  })
})

test('the gate takes the issue number from the marker and the person from the state, not from the event', () => {
  const result = route(
    fixture('workflow_run.completed'),
    facts(agentPull({ body: 'x <!-- ai-autonomous-agent issue=321 -->' }), waiting({ number: 321 })),
  )
  assert.equal(result.number, 321)
  // The state of a CI fix in progress names the actor too.
  const running = waiting({ phase: 'waiting-ci', implementing: { actor: 'dave' }, attempts: [] })
  assert.equal(route(fixture('workflow_run.completed'), facts(agentPull(), running)).action, 'ci-gate')
})

test('AGENT_DRY_RUN does not matter for the router; AGENT_ENABLED does', () => {
  const payload = fixture('workflow_run.completed')
  assert.equal(route(payload, facts(), enabled({ AGENT_DRY_RUN: 'true' })).action, 'ci-gate')
  const disabled = route(payload, facts(), loadConfig({}))
  assert.deepEqual(disabled, { action: 'skip', number: 70, reason: 'AGENT_ENABLED is not true' })
})

test('a pull request of a person has no marker and is skipped', () => {
  const payload = fixture('workflow_run.completed.human')
  const head = { sha: payload.workflow_run.head_sha }
  const human = agentPull({ number: 71, body: 'Adds a search box.\n\nCloses #120', head })
  const result = route(payload, facts(human, null))
  assert.equal(result.action, 'skip')
  assert.equal(result.number, 71)
  assert.match(result.reason, /not the agent's: it has no marker/)
})

test('a workflow run of a fork is skipped before anything is looked up', () => {
  const payload = fixture('workflow_run.completed.fork')
  const result = route(payload, null)
  assert.deepEqual([result.action, result.reason], ['skip', 'the workflow ran for a branch of a fork'])
  const deleted = fixture('workflow_run.completed')
  deleted.workflow_run.head_repository = null
  assert.match(route(deleted, facts()).reason, /fork/)
  const sameButCase = fixture('workflow_run.completed')
  sameButCase.workflow_run.head_repository.full_name = 'NETCRACKER/Qubership-APIHUB'
  assert.equal(route(sameButCase, facts()).action, 'ci-gate')
})

test('no open pull request: skipped, also for a closed or a missing one', () => {
  const payload = fixture('workflow_run.completed')
  assert.match(
    route(payload, facts(null, null)).reason,
    /no open pull request for the branch 'bugfix\/200-changelog-is-empty-for-a'/,
  )
  assert.match(route(payload, facts(agentPull({ state: 'closed' }), waiting())).reason, /no open pull request/)
  assert.equal(route(payload, undefined).action, 'skip')
})

test('the marker alone is not trusted: the state must exist, name this pull request, and wait for CI', () => {
  const payload = fixture('workflow_run.completed')
  assert.match(route(payload, facts(agentPull(), null)).reason, /issue #200 has no state comment/)
  assert.match(route(payload, facts(agentPull(), waiting({ pr: 71 }))).reason, /names pull request #71, not this one/)
  assert.match(route(payload, facts(agentPull(), waiting({ pr: undefined }))).reason, /names pull request #none/)
  for (const phase of ['implementing', 'needs-human', 'completed', 'analyzed', null]) {
    assert.match(route(payload, facts(agentPull(), waiting({ phase }))).reason, /not 'waiting-ci'/, String(phase))
  }
})

test('a newer commit is coming: the run of an older head commit is skipped', () => {
  const payload = fixture('workflow_run.completed')
  const result = route(payload, facts(agentPull({ head: { sha: 'f'.repeat(40) } })))
  assert.deepEqual([result.action, result.number], ['skip', 70])
  assert.match(result.reason, /a newer commit is on the branch/)
})

test('AGENT_ALLOWED_ACTORS applies to the person recorded in the state, not to the actor of the run', () => {
  const payload = fixture('workflow_run.completed')
  assert.equal(route(payload, facts(), enabled({ AGENT_ALLOWED_ACTORS: 'Carol' })).action, 'ci-gate')
  const other = route(payload, facts(), enabled({ AGENT_ALLOWED_ACTORS: 'agent-owner' }))
  assert.equal(other.action, 'skip')
  assert.match(other.reason, /'carol' is not in AGENT_ALLOWED_ACTORS/)
  assert.match(route(payload, facts(agentPull(), waiting({ attempts: [] }))).reason, /records nobody who asked/)
})

test('another action of workflow_run is not handled', () => {
  const payload = { ...fixture('workflow_run.completed'), action: 'requested' }
  assert.match(route(payload, facts()).reason, /workflow_run action 'requested' is not handled/)
  assert.throws(() => route({ action: 'completed' }, null), /workflow_run payload/)
})

test('agentIssueOf reads the marker of the agent and nothing else', () => {
  assert.equal(agentIssueOf(`text\n\n${MARKER}\n`), 200)
  assert.equal(agentIssueOf('<!--ai-autonomous-agent   issue=7   -->'), 7)
  const bodies = ['', null, undefined, 'Closes #200', '<!-- ai-autonomous-agent issue=x -->', '<!-- other issue=3 -->']
  for (const body of bodies) {
    assert.equal(agentIssueOf(body), null, String(body))
  }
})

// ------------------------------------------------------------------------------------------------ gather

/** A client that records its calls. `pulls` answers `getPull` by number, `listed` answers `listPulls`. */
function fakeClient({ pulls = {}, listed = [], comments = [] } = {}) {
  const calls = []
  return {
    calls,
    getPull: async (n) => {
      calls.push(['getPull', n])
      return pulls[n]
    },
    listPulls: async (options) => {
      calls.push(['listPulls', options])
      return listed
    },
    listIssueComments: async (n) => {
      calls.push(['listIssueComments', n])
      return comments
    },
  }
}
const stateComment = (st) => ({ id: 5, user: { login: 'github-actions[bot]' }, body: state.render('x', st) })
const gatherCi = (payload, client, config = enabled()) =>
  gather({ eventName: 'workflow_run', payload, config, getClient: () => client })

test('gather resolves the pull request listed in the event, the issue of its marker, and the state', async () => {
  const client = fakeClient({ pulls: { 70: agentPull() }, comments: [stateComment(waiting())] })
  const result = await gatherCi(fixture('workflow_run.completed'), client)
  assert.deepEqual(client.calls, [['getPull', 70], ['listIssueComments', 200]])
  assert.equal(result.ciFacts.pull.number, 70)
  assert.equal(result.ciFacts.issueState.phase, 'waiting-ci')
  assert.equal(result.actorPermission, 'none')
})

test('gather finds the pull request of the branch when the event lists none; a stranger state is ignored', async () => {
  const forged = { id: 6, user: { login: 'mallory' }, body: state.render('x', waiting({ phase: 'waiting-ci' })) }
  const client = fakeClient({ listed: [agentPull()], comments: [forged] })
  const payload = fixture('workflow_run.completed')
  payload.workflow_run.pull_requests = []
  const result = await gatherCi(payload, client)
  assert.deepEqual(
    client.calls[0],
    ['listPulls', { head: 'Netcracker:bugfix/200-changelog-is-empty-for-a', state: 'open' }],
  )
  assert.equal(result.ciFacts.pull.number, 70)
  assert.equal(result.ciFacts.issueState, null)
})

test('gather reads no state without the marker, and nothing at all for a fork', async () => {
  const human = fakeClient({ pulls: { 71: agentPull({ number: 71, body: 'Closes #120' }) } })
  const payload = fixture('workflow_run.completed')
  payload.workflow_run.pull_requests = [{ number: 71 }]
  const result = await gatherCi(payload, human)
  assert.deepEqual(human.calls, [['getPull', 71]])
  assert.equal(result.ciFacts.issueState, null)

  const none = fakeClient({ listed: [] })
  const humanRun = fixture('workflow_run.completed.human')
  const empty = await gatherCi(humanRun, none)
  assert.deepEqual(none.calls.map((c) => c[0]), ['listPulls'])
  assert.deepEqual(empty.ciFacts, { pull: null, issueState: null })

  const closed = fakeClient({ pulls: { 70: agentPull({ state: 'closed' }) } })
  await gatherCi(fixture('workflow_run.completed'), closed)
  assert.deepEqual(closed.calls, [['getPull', 70]])

  const fork = fakeClient()
  const forkResult = await gatherCi(fixture('workflow_run.completed.fork'), fork)
  assert.deepEqual(fork.calls, [])
  assert.equal(forkResult.ciFacts, undefined)
})

test('gather does nothing when the agent is disabled, and needsCiFacts follows the same rules', async () => {
  const client = fakeClient()
  const result = await gatherCi(fixture('workflow_run.completed'), client, loadConfig({}))
  assert.deepEqual(client.calls, [])
  assert.deepEqual(result, { actorPermission: 'none', pullState: null })
  assert.equal(needsCiFacts('workflow_run', fixture('workflow_run.completed')), true)
  assert.equal(needsCiFacts('workflow_run', fixture('workflow_run.completed.fork')), false)
  assert.equal(needsCiFacts('workflow_run', { ...fixture('workflow_run.completed'), action: 'requested' }), false)
  assert.equal(needsCiFacts('push', fixture('workflow_run.completed')), false)
})

// ------------------------------------------------------------------------------------------------ outputs and main

test('formatOutputs adds pr and head_sha for a ci-gate decision only', () => {
  const text = formatOutputs({ action: 'ci-gate', number: 200, pr: 70, headSha: SHA, reason: 'CI finished' })
  assert.equal(text, `action=ci-gate\nnumber=200\nreason=CI finished\ncommand=\npr=70\nhead_sha=${SHA}\n`)
  assert.equal(
    formatOutputs({ action: 'skip', number: null, reason: 'x' }),
    'action=skip\nnumber=\nreason=x\ncommand=\n',
  )
  assert.match(formatSummary({ action: 'ci-gate', number: 200, reason: 'r' }), /chose `ci-gate` for #200: r/)
})

async function runMain(fixtureName, envExtra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-ci-test-'))
  try {
    const eventPath = path.join(dir, 'event.json')
    fs.copyFileSync(path.join(__dirname, 'fixtures', `${fixtureName}.json`), eventPath)
    const env = {
      GITHUB_EVENT_NAME: 'workflow_run',
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: path.join(dir, 'output'),
      GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
      ...envExtra,
    }
    const decision = await main(env)
    return { decision, output: fs.readFileSync(env.GITHUB_OUTPUT, 'utf8') }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('main skips a fork run and a disabled agent without a token', async () => {
  const fork = await runMain('workflow_run.completed.fork', { AGENT_ENABLED: 'true' })
  assert.match(fork.output, /^action=skip\nnumber=\nreason=the workflow ran for a branch of a fork\n/)
  const disabled = await runMain('workflow_run.completed')
  assert.match(disabled.output, /^action=skip\nnumber=70\nreason=AGENT_ENABLED is not true\n/)
  await assert.rejects(runMain('workflow_run.completed', { AGENT_ENABLED: 'true' }), /GITHUB_TOKEN is not set/)
})
