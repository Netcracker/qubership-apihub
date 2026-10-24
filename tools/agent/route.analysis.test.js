'use strict'
// Routing rules of phase 2: analysis of issues. The phase 1 rules are tested in route.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const state = require('./lib/state')
const log = require('./lib/log')
const { decide, gather, needsIssueState, formatOutputs, main } = require('./route')

log.setWriter(() => {})

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))
const enabled = (extra = {}) => loadConfig({ AGENT_ENABLED: 'true', ...extra })
const route = (eventName, payload, extra = {}, env = {}) =>
  decide({ eventName, payload, config: enabled(env), ...extra })
const needsInfo = (extra = {}) => ({ ...state.emptyIssueState(200), phase: 'needs-info', ...extra })
const analyses = (n) => Array.from({ length: n }, (_, i) => ({ at: `2026-10-0${i + 1}`, verdict: 'needs-info' }))

test('a new Bug issue is analyzed', () => {
  assert.deepEqual(route('issues', fixture('issues.opened.bug')), {
    action: 'analyze',
    number: 200,
    reason: 'issue opened',
    trigger: 'opened',
  })
})

test('an issue that gets the type Task is analyzed with the trigger typed', () => {
  const result = route('issues', fixture('issues.typed.task'))
  assert.deepEqual([result.action, result.number, result.trigger], ['analyze', 202, 'typed'])
})

test('issues of another type or without a type are skipped', () => {
  const feature = route('issues', fixture('issues.opened.feature'))
  assert.equal(feature.action, 'skip')
  assert.equal(feature.number, 201)
  assert.match(feature.reason, /Bug and Task.*'Feature'/)
  const untyped = fixture('issues.opened.bug')
  delete untyped.issue.type
  assert.match(route('issues', untyped).reason, /no type/)
  untyped.issue.type = null
  assert.equal(route('issues', untyped).action, 'skip')
})

test('a pull request and a bot author are skipped', () => {
  const pull = fixture('issues.opened.bug')
  pull.issue.pull_request = { url: 'x' }
  assert.equal(route('issues', pull).action, 'skip')
  const bot = fixture('issues.opened.bug')
  bot.issue.user.login = 'dependabot[bot]'
  const result = route('issues', bot)
  assert.equal(result.action, 'skip')
  assert.match(result.reason, /bot/)
})

test('a decision a person made is respected, whatever the label objects look like', () => {
  for (const label of ['ai:suitable', 'ai:unsuitable']) {
    const payload = fixture('issues.opened.bug')
    payload.issue.labels = [{ name: 'bug' }, { name: label }]
    const result = route('issues', payload)
    assert.equal(result.action, 'skip', label)
    assert.match(result.reason, /person already set/)
  }
  const strings = fixture('issues.opened.bug')
  strings.issue.labels = ['ai:suitable']
  assert.equal(route('issues', strings).action, 'skip')
  const other = fixture('issues.opened.bug')
  other.issue.labels = [{ name: 'agent:needs-human' }, { name: 'ai:l1-executor' }]
  assert.equal(route('issues', other).action, 'analyze')
})

test('the issue author must be in AGENT_ALLOWED_ACTORS; the sender does not matter', () => {
  const denied = route('issues', fixture('issues.opened.bug'), {}, { AGENT_ALLOWED_ACTORS: 'bob' })
  assert.equal(denied.action, 'skip')
  assert.match(denied.reason, /alice.*AGENT_ALLOWED_ACTORS/)
  assert.equal(route('issues', fixture('issues.opened.bug'), {}, { AGENT_ALLOWED_ACTORS: 'Alice' }).action, 'analyze')
  // carol typed the issue, but the author (alice) decides.
  const typed = route('issues', fixture('issues.typed.task'), {}, { AGENT_ALLOWED_ACTORS: 'carol' })
  assert.equal(typed.action, 'skip')
})

test('an analysis needs no write access', () => {
  const result = route('issues', fixture('issues.opened.bug'), { actorPermission: 'none' })
  assert.equal(result.action, 'analyze')
})

test('the limit of analyses stops opened and typed, and passes without a state', () => {
  const full = { issueState: needsInfo({ analyses: analyses(5) }) }
  for (const name of ['issues.opened.bug', 'issues.typed.task']) {
    const result = route('issues', fixture(name), full)
    assert.equal(result.action, 'skip', name)
    assert.equal(result.reason, 'analysis limit reached; comment /agent analyze')
  }
  const almost = { issueState: needsInfo({ analyses: analyses(4) }) }
  assert.equal(route('issues', fixture('issues.typed.task'), almost).action, 'analyze')
  assert.equal(route('issues', fixture('issues.typed.task'), { issueState: null }).action, 'analyze')
  const lowered = route('issues', fixture('issues.typed.task'), { issueState: needsInfo({ analyses: analyses(2) }) },
    { AGENT_MAX_ANALYSES: '2' })
  assert.equal(lowered.action, 'skip')
})

test('an edit by the author while the issue waits for information is analyzed', () => {
  const result = route('issues', fixture('issues.edited'), { issueState: needsInfo() })
  assert.deepEqual(result, { action: 'analyze', number: 200, reason: 'author edited the issue', trigger: 'edited' })
})

test('an edit is skipped without the needs-info phase, from another user, or over the limit', () => {
  for (const issueState of [null, state.emptyIssueState(200), needsInfo({ phase: 'analyzed' })]) {
    const result = route('issues', fixture('issues.edited'), { issueState })
    assert.deepEqual([result.action, result.reason], ['skip', 'issue is not waiting for information'])
  }
  const other = fixture('issues.edited')
  other.sender.login = 'carol'
  const byOther = route('issues', other, { issueState: needsInfo() })
  assert.equal(byOther.action, 'skip')
  assert.match(byOther.reason, /carol.*not its author/)
  const full = route('issues', fixture('issues.edited'), { issueState: needsInfo({ analyses: analyses(5) }) })
  assert.match(full.reason, /limit reached/)
  const denied = route('issues', fixture('issues.edited'), { issueState: needsInfo() }, { AGENT_ALLOWED_ACTORS: 'bob' })
  assert.match(denied.reason, /AGENT_ALLOWED_ACTORS/)
})

test('other issues actions are skipped', () => {
  for (const action of ['closed', 'reopened', 'labeled', 'assigned', 'deleted']) {
    const payload = fixture('issues.opened.bug')
    payload.action = action
    const result = route('issues', payload)
    assert.equal(result.action, 'skip', action)
    assert.equal(result.number, 200)
  }
})

test('an issues event without an issue is an error', () => {
  assert.throws(() => route('issues', { action: 'opened' }), TypeError)
})

test('the author replying to the questions starts an analysis', () => {
  const result = route('issue_comment', fixture('issue_comment.author-reply'), { issueState: needsInfo() })
  assert.deepEqual(result, {
    action: 'analyze',
    number: 200,
    reason: 'author replied to the questions',
    trigger: 'author-reply',
  })
})

test('a comment is not an answer unless the author writes it on an issue that waits', () => {
  const reply = fixture('issue_comment.author-reply')
  const notWaiting = route('issue_comment', reply, { issueState: needsInfo({ phase: 'analyzed' }) })
  assert.equal(notWaiting.action, 'skip')
  assert.match(notWaiting.reason, /not a command.*not waiting/)
  assert.equal(route('issue_comment', reply).action, 'skip')

  const other = fixture('issue_comment.author-reply')
  other.comment.user.login = 'carol'
  assert.deepEqual(
    [route('issue_comment', other, { issueState: needsInfo() }).action, route('issue_comment', other).reason],
    ['skip', 'not a command'],
  )

  const pull = fixture('issue_comment.author-reply')
  pull.issue.pull_request = { url: 'x' }
  assert.equal(route('issue_comment', pull, { issueState: needsInfo() }).reason, 'not a command')

  const bot = fixture('issue_comment.author-reply')
  bot.comment.user.login = 'alice[bot]'
  assert.match(route('issue_comment', bot, { issueState: needsInfo() }).reason, /bot/)
})

test('an author reply respects AGENT_ALLOWED_ACTORS and the limit', () => {
  const reply = fixture('issue_comment.author-reply')
  const denied = route('issue_comment', reply, { issueState: needsInfo() }, { AGENT_ALLOWED_ACTORS: 'carol' })
  assert.match(denied.reason, /alice.*AGENT_ALLOWED_ACTORS/)
  const full = route('issue_comment', reply, { issueState: needsInfo({ analyses: analyses(5) }) })
  assert.equal(full.reason, 'analysis limit reached; comment /agent analyze')
})

test('an edited or deleted author comment is skipped', () => {
  for (const action of ['edited', 'deleted']) {
    const payload = fixture('issue_comment.author-reply')
    payload.action = action
    assert.equal(route('issue_comment', payload, { issueState: needsInfo() }).action, 'skip', action)
  }
})

test('/agent analyze on an issue analyzes with the trigger command', () => {
  const result = route('issue_comment', fixture('issue_comment.analyze'), { actorPermission: 'write' })
  assert.deepEqual(result, {
    action: 'analyze',
    number: 200,
    reason: '/agent analyze',
    trigger: 'command',
    command: { name: 'analyze', force: false, notes: '' },
  })
})

test('/agent analyze bypasses the limit but not the permission checks', () => {
  const full = { actorPermission: 'maintain', issueState: needsInfo({ analyses: analyses(9) }) }
  assert.equal(route('issue_comment', fixture('issue_comment.analyze'), full).action, 'analyze')
  for (const actorPermission of ['read', 'triage', 'none']) {
    const result = route('issue_comment', fixture('issue_comment.analyze'), { actorPermission })
    assert.match(result.reason, /carol.*no write access/, actorPermission)
  }
  const denied = route('issue_comment', fixture('issue_comment.analyze'), { actorPermission: 'admin' },
    { AGENT_ALLOWED_ACTORS: 'dave' })
  assert.match(denied.reason, /carol.*AGENT_ALLOWED_ACTORS/)
})

test('/agent analyze on a pull request is skipped', () => {
  const payload = fixture('issue_comment.analyze')
  payload.issue.pull_request = { url: 'x' }
  const result = route('issue_comment', payload, { actorPermission: 'write' })
  assert.deepEqual([result.action, result.reason], ['skip', 'analyze works on issues'])
})

test('formatOutputs adds the trigger only to decisions that have one', () => {
  const text = formatOutputs({ action: 'analyze', number: 200, reason: 'issue opened', trigger: 'opened' })
  assert.equal(text, 'action=analyze\nnumber=200\nreason=issue opened\ncommand=\ntrigger=opened\n')
})

test('needsIssueState asks for the state only when a rule reads it', () => {
  assert.equal(needsIssueState('issues', fixture('issues.opened.bug')), false)
  assert.equal(needsIssueState('issues', fixture('issues.typed.task')), true)
  assert.equal(needsIssueState('issues', fixture('issues.edited')), true)
  const otherEditor = fixture('issues.edited')
  otherEditor.sender.login = 'carol'
  assert.equal(needsIssueState('issues', otherEditor), false)
  const feature = fixture('issues.typed.task')
  feature.issue.type.name = 'Feature'
  assert.equal(needsIssueState('issues', feature), false)
  assert.equal(needsIssueState('issue_comment', fixture('issue_comment.author-reply')), true)
  assert.equal(needsIssueState('issue_comment', fixture('issue_comment.analyze')), false)
  const other = fixture('issue_comment.author-reply')
  other.comment.user.login = 'carol'
  // Anyone may answer a hand-off of the agent without a command (phase 5), so the state is needed.
  assert.equal(needsIssueState('issue_comment', other), true)
  const pull = fixture('issue_comment.author-reply')
  pull.issue.pull_request = { url: 'x' }
  assert.equal(needsIssueState('issue_comment', pull), false)
  assert.equal(needsIssueState('pull_request', fixture('pull_request.opened')), false)
  assert.equal(needsIssueState('issues', undefined), false)
})

function fakeClient({ comments = [] } = {}) {
  const calls = []
  return {
    calls,
    getPermission: async (login) => (calls.push(['getPermission', login]), 'write'),
    listIssueComments: async (n) => (calls.push(['listIssueComments', n]), comments),
  }
}

test('gather resolves the issue state of the author reply and of an edit', async () => {
  const saved = needsInfo({ analyses: analyses(1) })
  const comments = [
    { id: 1, user: { login: 'mallory' }, body: state.render('fake', { schema: 1, phase: 'analyzed' }) },
    { id: 2, user: { login: 'github-actions[bot]' }, body: state.render('real', saved) },
  ]
  for (const [eventName, name] of [['issue_comment', 'issue_comment.author-reply'], ['issues', 'issues.edited']]) {
    const client = fakeClient({ comments })
    const result = await gather({ eventName, payload: fixture(name), config: enabled(), getClient: () => client })
    assert.deepEqual(result, { actorPermission: 'none', pullState: null, issueState: saved }, name)
    assert.deepEqual(client.calls, [['listIssueComments', 200]], name)
  }
  const none = await gather({
    eventName: 'issues',
    payload: fixture('issues.edited'),
    config: enabled(),
    getClient: () => fakeClient(),
  })
  assert.equal(none.issueState, null)
})

test('gather asks for the permission, not the state, for /agent analyze', async () => {
  const client = fakeClient()
  const result = await gather({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.analyze'),
    config: enabled(),
    getClient: () => client,
  })
  assert.deepEqual(result, { actorPermission: 'write', pullState: null })
  assert.deepEqual(client.calls, [['getPermission', 'carol']])
})

test('gather makes no API call for a new issue', async () => {
  const getClient = () => assert.fail('the client must not be created')
  const result = await gather({
    eventName: 'issues',
    payload: fixture('issues.opened.bug'),
    config: enabled(),
    getClient,
  })
  assert.deepEqual(result, { actorPermission: 'none', pullState: null })
})

test('main routes a new Bug issue without a token and writes the trigger', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-analysis-test-'))
  try {
    const env = {
      GITHUB_EVENT_NAME: 'issues',
      GITHUB_EVENT_PATH: path.join(dir, 'event.json'),
      GITHUB_OUTPUT: path.join(dir, 'output'),
      GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
      AGENT_ENABLED: 'true',
    }
    fs.copyFileSync(path.join(__dirname, 'fixtures', 'issues.opened.bug.json'), env.GITHUB_EVENT_PATH)
    const decision = await main(env)
    assert.equal(decision.action, 'analyze')
    assert.equal(
      fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'),
      'action=analyze\nnumber=200\nreason=issue opened\ncommand=\ntrigger=opened\n',
    )
    assert.match(fs.readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'), /chose `analyze` for #200/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// Phase 3: /agent implement.

test('/agent implement on an issue starts the implementation and carries the parsed command', () => {
  const result = route('issue_comment', fixture('issue_comment.implement'), { actorPermission: 'write' })
  assert.deepEqual(result, {
    action: 'implement',
    number: 200,
    reason: '/agent implement',
    command: { name: 'implement', force: false, notes: '' },
  })
})

test('/agent fix force is the implement command with force and the notes', () => {
  const result = route('issue_comment', fixture('issue_comment.implement-force'), { actorPermission: 'maintain' })
  assert.equal(result.action, 'implement')
  assert.equal(result.number, 202)
  assert.equal(result.reason, '/agent implement force')
  assert.deepEqual(result.command, {
    name: 'implement',
    force: true,
    notes: 'Keep the old paths working for one release.',
  })
})

test('the router does not look at the type, the labels, or the state of the issue', () => {
  const untyped = fixture('issue_comment.implement')
  untyped.issue.type = null
  untyped.issue.labels = [{ name: 'ai:unsuitable' }]
  const issueState = needsInfo({ phase: 'implementing' })
  const result = route('issue_comment', untyped, { actorPermission: 'write', issueState })
  assert.equal(result.action, 'implement')
})

test('/agent implement on a pull request is skipped with a reason', () => {
  const payload = fixture('issue_comment.pr')
  payload.comment.body = '/agent implement'
  const result = route('issue_comment', payload, { actorPermission: 'write' })
  assert.deepEqual([result.action, result.number, result.reason], ['skip', 123, 'implement works on issues'])
})

test('/agent implement needs write access and an allowed commenter', () => {
  const payload = fixture('issue_comment.implement')
  const noWrite = route('issue_comment', payload, { actorPermission: 'read' })
  assert.equal(noWrite.action, 'skip')
  assert.match(noWrite.reason, /no write access/)
  const denied = route('issue_comment', payload, { actorPermission: 'write' }, { AGENT_ALLOWED_ACTORS: 'bob' })
  assert.equal(denied.action, 'skip')
  assert.match(denied.reason, /carol.*AGENT_ALLOWED_ACTORS/)
})

test('the outputs of an implement decision carry the command as JSON', () => {
  const decision = route('issue_comment', fixture('issue_comment.implement-force'), { actorPermission: 'write' })
  const lines = formatOutputs(decision).split('\n')
  assert.equal(lines[0], 'action=implement')
  assert.equal(lines[1], 'number=202')
  assert.deepEqual(JSON.parse(lines[3].slice('command='.length)), decision.command)
})

// Review of phase 2: the type check applies to every path to an analysis.

test('an edit of an issue that is no longer a Bug or Task is skipped', () => {
  for (const type of [{ name: 'Feature' }, null]) {
    const payload = fixture('issues.edited')
    payload.issue.type = type
    const result = route('issues', payload, { issueState: needsInfo() })
    assert.equal(result.action, 'skip', JSON.stringify(type))
    assert.match(result.reason, /analysis covers Bug and Task issues/)
  }
})

test('/agent analyze on a Feature or an untyped issue is skipped', () => {
  for (const type of [{ name: 'Feature' }, undefined]) {
    const payload = fixture('issue_comment.analyze')
    payload.issue.type = type
    const result = route('issue_comment', payload, { actorPermission: 'write' })
    assert.equal(result.action, 'skip', JSON.stringify(type))
    assert.equal(result.number, 200)
    assert.match(result.reason, /^analysis covers Bug and Task issues/)
  }
})

test('/agent analyze works on a Task', () => {
  const payload = fixture('issue_comment.analyze')
  payload.issue.type = { name: 'Task' }
  assert.equal(route('issue_comment', payload, { actorPermission: 'write' }).action, 'analyze')
})

test('an answer of the author on an issue that is no longer a Bug or Task is skipped too', () => {
  const reply = fixture('issue_comment.author-reply')
  reply.issue.type = { name: 'Feature' }
  const result = route('issue_comment', reply, { issueState: needsInfo() })
  assert.equal(result.action, 'skip')
  assert.match(result.reason, /analysis covers Bug and Task issues/)
})
