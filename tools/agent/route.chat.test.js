'use strict'
// Routing rules of phase 5: the conversation. The commands, the answer to a hand-off, and the change requests of a
// review. The earlier rules are tested in route.test.js, route.analysis.test.js, and route.ci.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const state = require('./lib/state')
const log = require('./lib/log')
const {
  decide,
  gather,
  needsActorPermission,
  needsAgentFacts,
  needsIssueState,
  isHandOffAnswer,
  formatOutputs,
} = require('./route')

log.setWriter(() => {})

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))
const enabled = (extra = {}) => loadConfig({ AGENT_ENABLED: 'true', ...extra })
const route = (eventName, payload, extra = {}, env = {}) =>
  decide({ eventName, payload, config: enabled(env), ...extra })

/** The state of issue 200 when its pull request 70 exists. */
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
const agentFacts = (st = issueState()) => ({ issueNumber: 200, issueState: st })
const write = { actorPermission: 'write' }

const comment = (name, body) => {
  const payload = fixture(name)
  payload.comment.body = body
  return payload
}
/** A comment on a pull request of a person: the pull request of the older fixtures, without the marker. */
const onPersonPull = (body) => comment('issue_comment.pr', body)

// ---------------------------------------------------------------------------------------------------------------
// help, cost, stop
// ---------------------------------------------------------------------------------------------------------------

test('/agent alone and /agent help on an issue go to the chat job with the parsed command', () => {
  assert.deepEqual(route('issue_comment', fixture('issue_comment.help'), write), {
    action: 'chat',
    number: 200,
    reason: '/agent help',
    command: { name: 'help', force: false, notes: '' },
  })
  const explicit = route('issue_comment', comment('issue_comment.help', '/agent help'), write)
  assert.deepEqual([explicit.action, explicit.command.name], ['chat', 'help'])
})

test('/agent cost goes to the chat job on an issue and on a pull request', () => {
  const issue = route('issue_comment', fixture('issue_comment.cost'), write)
  assert.deepEqual([issue.action, issue.number, issue.command.name], ['chat', 200, 'cost'])
  const pull = route('issue_comment', onPersonPull('/agent cost'), write)
  assert.deepEqual([pull.action, pull.number, pull.reason], ['chat', 123, '/agent cost'])
})

test('/agent stop goes to the stop job on an issue and on a pull request of the agent', () => {
  const issue = route('issue_comment', fixture('issue_comment.stop'), write)
  assert.deepEqual([issue.action, issue.number, issue.reason], ['stop', 200, '/agent stop'])
  const pull = comment('issue_comment.chat.agent-pr', '/agent stop')
  const result = route('issue_comment', pull, { ...write, agentFacts: agentFacts() })
  assert.deepEqual([result.action, result.number, result.command.name], ['stop', 70, 'stop'])
})

test('/agent stop on a pull request that is not the agent\'s, or not named by its issue, is skipped', () => {
  const person = route('issue_comment', onPersonPull('/agent stop'), write)
  assert.deepEqual([person.action, person.reason], ['skip', 'stop works on issues and on pull requests of the agent'])
  const pull = comment('issue_comment.chat.agent-pr', '/agent stop')
  const forged = route('issue_comment', pull, { ...write, agentFacts: agentFacts(issueState({ pr: 99 })) })
  assert.equal(forged.action, 'skip')
  const noState = route('issue_comment', pull, { ...write, agentFacts: { issueNumber: 200, issueState: null } })
  assert.equal(noState.action, 'skip')
})

// ---------------------------------------------------------------------------------------------------------------
// retry
// ---------------------------------------------------------------------------------------------------------------

test('/agent retry on an issue starts a person\'s attempt and carries the guidance', () => {
  assert.deepEqual(route('issue_comment', fixture('issue_comment.retry'), write), {
    action: 'implement',
    number: 200,
    kind: 'human',
    reason: '/agent retry',
    command: { name: 'retry', force: false, notes: 'try the other parser\n\nThe first one drops empty lists.' },
  })
})

test('/agent retry on a pull request of the agent resolves its issue from the marker and the state', () => {
  const payload = comment('issue_comment.chat.agent-pr', '/agent retry use the second parser')
  const result = route('issue_comment', payload, { ...write, agentFacts: agentFacts() })
  assert.deepEqual(result, {
    action: 'implement',
    number: 200,
    pr: 70,
    kind: 'human',
    reason: '/agent retry',
    command: { name: 'retry', force: false, notes: 'use the second parser' },
  })
})

test('/agent retry on a pull request without the agent is skipped', () => {
  const person = route('issue_comment', onPersonPull('/agent retry'), write)
  assert.equal(person.reason, 'retry works on issues and on pull requests of the agent')
  const pull = comment('issue_comment.chat.agent-pr', '/agent retry')
  const forged = route('issue_comment', pull, { ...write, agentFacts: agentFacts(issueState({ pr: 99 })) })
  assert.equal(forged.action, 'skip')
})

// ---------------------------------------------------------------------------------------------------------------
// rerun
// ---------------------------------------------------------------------------------------------------------------

test('/agent rerun on an issue goes to the rerun job with the issue number', () => {
  const result = route('issue_comment', comment('issue_comment.help', '/agent rerun a flaky test'), write)
  assert.deepEqual(result, {
    action: 'rerun',
    number: 200,
    reason: '/agent rerun',
    command: { name: 'rerun', force: false, notes: 'a flaky test' },
  })
  assert.equal(formatOutputs(result).includes('pr='), false)
})

test('/agent rerun on a pull request of the agent names its issue and the pull request', () => {
  const payload = comment('issue_comment.chat.agent-pr', '/agent rerun')
  const result = route('issue_comment', payload, { ...write, agentFacts: agentFacts() })
  assert.deepEqual(result, {
    action: 'rerun',
    number: 200,
    pr: 70,
    reason: '/agent rerun',
    command: { name: 'rerun', force: false, notes: '' },
  })
  assert.match(formatOutputs(result), /^action=rerun\nnumber=200\n.*\npr=70\n$/s)
})

test('/agent rerun on a pull request of a person, or one the issue state does not confirm, is skipped', () => {
  const person = route('issue_comment', onPersonPull('/agent rerun'), write)
  assert.deepEqual([person.action, person.reason], ['skip', 'rerun works on an issue or a pull request of the agent'])
  const pull = comment('issue_comment.chat.agent-pr', '/agent rerun')
  for (const facts of [agentFacts(issueState({ pr: 99 })), { issueNumber: 200, issueState: null }, null]) {
    assert.equal(route('issue_comment', pull, { ...write, agentFacts: facts }).action, 'skip')
  }
})

test('/agent rerun without write access is skipped', () => {
  for (const actorPermission of ['read', 'triage', 'none']) {
    const result = route('issue_comment', comment('issue_comment.help', '/agent rerun'), { actorPermission })
    assert.equal(result.action, 'skip', actorPermission)
    assert.match(result.reason, /carol.*no write access/)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// free text
// ---------------------------------------------------------------------------------------------------------------

test('/agent <text> on an issue and on a pull request of a person goes to the assistant', () => {
  const issue = route('issue_comment', fixture('issue_comment.chat'), write)
  assert.deepEqual(issue, {
    action: 'chat',
    number: 200,
    reason: '/agent <question>',
    command: { name: 'chat', force: false, notes: 'why does the changelog builder return null here?' },
  })
  const pull = route('issue_comment', onPersonPull('/agent is this safe to merge?'), write)
  assert.deepEqual([pull.action, pull.number, pull.command.name], ['chat', 123, 'chat'])
})

test('/agent <text> on a pull request of the agent is a change request: one attempt on the branch', () => {
  const result = route('issue_comment', fixture('issue_comment.chat.agent-pr'), { ...write, agentFacts: agentFacts() })
  assert.deepEqual(result, {
    action: 'implement',
    number: 200,
    pr: 70,
    kind: 'human',
    reason: 'change request on a pull request of the agent',
    command: { name: 'chat', force: false, notes: 'rename the helper to buildChangelog' },
  })
})

test('a marker that the issue state does not confirm is a pull request of a person: the assistant answers', () => {
  const payload = fixture('issue_comment.chat.agent-pr')
  for (const facts of [agentFacts(issueState({ pr: 99 })), { issueNumber: 200, issueState: null }, null]) {
    const result = route('issue_comment', payload, { ...write, agentFacts: facts })
    assert.deepEqual([result.action, result.number], ['chat', 70])
  }
})

// ---------------------------------------------------------------------------------------------------------------
// who may command
// ---------------------------------------------------------------------------------------------------------------

test('every command needs an allowed commenter with write access who is not a bot', () => {
  const bodies = ['/agent', '/agent cost', '/agent stop', '/agent retry', '/agent rerun', '/agent a question']
  for (const body of bodies) {
    const payload = comment('issue_comment.help', body)
    for (const actorPermission of ['read', 'triage', 'none']) {
      const result = route('issue_comment', payload, { actorPermission })
      assert.match(result.reason, /carol.*no write access/, `${body} ${actorPermission}`)
    }
    const denied = route('issue_comment', payload, write, { AGENT_ALLOWED_ACTORS: 'dave' })
    assert.match(denied.reason, /carol.*AGENT_ALLOWED_ACTORS/, body)
    const bot = comment('issue_comment.help', body)
    bot.comment.user = { login: 'github-actions[bot]', type: 'Bot' }
    assert.match(route('issue_comment', bot, write).reason, /bot/, body)
    assert.equal(route('issue_comment', payload, write, {}).action === 'skip', false, body)
  }
  const off = loadConfig({})
  const disabled = decide({ eventName: 'issue_comment', payload: fixture('issue_comment.help'), config: off })
  assert.equal(disabled.reason, 'AGENT_ENABLED is not true')
})

test('a pull request of Dependabot stays ignored by every new command', () => {
  for (const body of ['/agent', '/agent cost', '/agent stop', '/agent retry', '/agent rerun', '/agent a question']) {
    const payload = onPersonPull(body)
    payload.issue.user.login = 'dependabot[bot]'
    const result = route('issue_comment', payload, { ...write, agentFacts: agentFacts() })
    assert.equal(result.action, 'skip', body)
    assert.equal(result.reason, 'dependency update pull requests are not handled', body)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// the answer to a hand-off
// ---------------------------------------------------------------------------------------------------------------

test('a comment without /agent on an issue in needs-human is the answer: a person\'s attempt', () => {
  const result = route('issue_comment', fixture('issue_comment.answer'), { ...write, issueState: issueState() })
  assert.deepEqual(result, {
    action: 'implement',
    number: 200,
    kind: 'human',
    reason: 'answer to the hand-off of the agent from carol',
    command: { name: 'answer', force: false, notes: 'Use the second parser, the first one drops empty lists.' },
  })
})

test('the answer resumes the flow once: only the phase needs-human accepts it', () => {
  for (const phase of ['implementing', 'waiting-ci', 'completed', 'analyzed', 'stopped', undefined]) {
    const result = route('issue_comment', fixture('issue_comment.answer'), {
      ...write,
      issueState: issueState({ phase }),
    })
    assert.equal(result.action, 'skip', String(phase))
    assert.equal(result.reason, 'not a command', String(phase))
  }
  assert.equal(route('issue_comment', fixture('issue_comment.answer'), write).reason, 'not a command')
})

test('the analysis stop (needs-info) is not a hand-off: only its author answers it, as before', () => {
  const stateWaiting = issueState({ phase: 'needs-info', analyses: [] })
  const other = route('issue_comment', fixture('issue_comment.answer'), { ...write, issueState: stateWaiting })
  assert.equal(other.action, 'skip')
  const author = fixture('issue_comment.answer')
  author.comment.user.login = 'alice'
  const result = route('issue_comment', author, { actorPermission: 'none', issueState: stateWaiting })
  assert.deepEqual([result.action, result.trigger], ['analyze', 'author-reply'])
})

test('the answer needs an allowed commenter with write access who is not a bot', () => {
  const given = { issueState: issueState() }
  for (const actorPermission of ['read', 'triage', 'none']) {
    const result = route('issue_comment', fixture('issue_comment.answer'), { ...given, actorPermission })
    assert.match(result.reason, /carol.*no write access/, actorPermission)
  }
  const denied = route('issue_comment', fixture('issue_comment.answer'), { ...given, ...write }, {
    AGENT_ALLOWED_ACTORS: 'dave',
  })
  assert.match(denied.reason, /carol.*AGENT_ALLOWED_ACTORS/)
  const bot = fixture('issue_comment.answer')
  bot.comment.user = { login: 'github-actions[bot]', type: 'Bot' }
  assert.match(route('issue_comment', bot, { ...given, ...write }).reason, /bot/)
  const edited = fixture('issue_comment.answer')
  edited.action = 'edited'
  assert.equal(route('issue_comment', edited, { ...given, ...write }).action, 'skip')
})

test('a comment on a pull request of the agent in needs-human is the answer, and names the issue', () => {
  const payload = comment('issue_comment.chat.agent-pr', 'The helper name is fine, fix the nil check.')
  const result = route('issue_comment', payload, { ...write, agentFacts: agentFacts() })
  assert.deepEqual(
    [result.action, result.number, result.pr, result.kind, result.command.name],
    ['implement', 200, 70, 'human', 'answer'],
  )
  const idle = agentFacts(issueState({ phase: 'waiting-ci' }))
  const waiting = route('issue_comment', payload, { ...write, agentFacts: idle })
  assert.deepEqual([waiting.action, waiting.reason], ['skip', 'not a command'])
  const forged = route('issue_comment', payload, { ...write, agentFacts: agentFacts(issueState({ pr: 99 })) })
  assert.equal(forged.reason, 'not a command')
  assert.equal(route('issue_comment', payload, write).reason, 'not a command')
})

test('a long answer is cut before it reaches a job output', () => {
  const payload = comment('issue_comment.answer', 'x'.repeat(20000))
  const result = route('issue_comment', payload, { ...write, issueState: issueState() })
  assert.ok(result.command.notes.length < 8100)
  assert.match(result.command.notes, /\[cut: the text is longer\]$/)
})

// ---------------------------------------------------------------------------------------------------------------
// a review with change requests
// ---------------------------------------------------------------------------------------------------------------

test('a review with change requests on a pull request of the agent starts one attempt of kind review', () => {
  const result = route('pull_request_review', fixture('pull_request_review.changes_requested'), {
    ...write,
    agentFacts: agentFacts(issueState({ phase: 'waiting-ci' })),
  })
  assert.deepEqual(result, {
    action: 'implement',
    number: 200,
    pr: 70,
    kind: 'review',
    reason: 'carol asked for changes',
    command: { name: 'review-changes', force: false, notes: 'Two things: the nil check and the test name.' },
  })
})

test('a review that asks for no changes, or comes from a bot, or has no right, changes nothing', () => {
  const given = { ...write, agentFacts: agentFacts() }
  for (const state of ['approved', 'commented', 'dismissed']) {
    const payload = fixture('pull_request_review.changes_requested')
    payload.review.state = state
    assert.match(route('pull_request_review', payload, given).reason, /asks for no changes/, state)
  }
  const upper = fixture('pull_request_review.changes_requested')
  upper.review.state = 'CHANGES_REQUESTED'
  assert.equal(route('pull_request_review', upper, given).action, 'implement')
  const bot = fixture('pull_request_review.changes_requested')
  bot.review.user.login = 'copilot[bot]'
  assert.match(route('pull_request_review', bot, given).reason, /bot/)
  for (const actorPermission of ['read', 'triage', 'none']) {
    const result = route('pull_request_review', fixture('pull_request_review.changes_requested'), {
      ...given,
      actorPermission,
    })
    assert.match(result.reason, /carol.*no write access/, actorPermission)
  }
  const denied = route('pull_request_review', fixture('pull_request_review.changes_requested'), given, {
    AGENT_ALLOWED_ACTORS: 'dave',
  })
  assert.match(denied.reason, /carol.*AGENT_ALLOWED_ACTORS/)
  const edited = fixture('pull_request_review.changes_requested')
  edited.action = 'dismissed'
  assert.equal(route('pull_request_review', edited, given).action, 'skip')
})

test('a review of a pull request that is not the agent\'s, from a fork, or of Dependabot changes nothing', () => {
  const payload = fixture('pull_request_review.changes_requested')
  assert.match(route('pull_request_review', payload, write).reason, /not the agent's/)
  const forged = route('pull_request_review', payload, { ...write, agentFacts: agentFacts(issueState({ pr: 99 })) })
  assert.match(forged.reason, /not the agent's/)
  const fork = fixture('pull_request_review.changes_requested')
  fork.pull_request.head.repo = { full_name: 'mallory/qubership-apihub' }
  assert.match(route('pull_request_review', fork, { ...write, agentFacts: agentFacts() }).reason, /fork/)
  const bump = fixture('pull_request_review.changes_requested')
  bump.pull_request.user.login = 'dependabot[bot]'
  assert.match(route('pull_request_review', bump, { ...write, agentFacts: agentFacts() }).reason, /dependency update/)
  const disabled = decide({
    eventName: 'pull_request_review',
    payload: fixture('pull_request_review.changes_requested'),
    config: loadConfig({}),
  })
  assert.deepEqual(disabled, { action: 'skip', number: 70, reason: 'AGENT_ENABLED is not true' })
  assert.throws(() => route('pull_request_review', { action: 'submitted' }), TypeError)
})

// ---------------------------------------------------------------------------------------------------------------
// the outputs of the job, and the facts the router fetches
// ---------------------------------------------------------------------------------------------------------------

test('formatOutputs writes the pull request and the kind of a person\'s attempt, and no head_sha', () => {
  const result = route('pull_request_review', fixture('pull_request_review.changes_requested'), {
    ...write,
    agentFacts: agentFacts(),
  })
  const lines = formatOutputs(result).split('\n')
  assert.ok(lines.includes('action=implement'))
  assert.ok(lines.includes('pr=70'))
  assert.ok(lines.includes('kind=review'))
  assert.ok(lines.every((line) => !line.startsWith('head_sha=')))
  const implement = { action: 'implement', number: 200, reason: '/agent implement', command: { name: 'implement' } }
  const plain = formatOutputs(implement)
  assert.ok(!plain.includes('kind=') && !plain.includes('pr='))
  const gate = formatOutputs({ action: 'ci-gate', number: 200, pr: 70, headSha: 'abc', reason: 'x' })
  assert.ok(gate.includes('pr=70\nhead_sha=abc\n'))
})

test('needsActorPermission and needsAgentFacts: a change request, a command, and an answer', () => {
  assert.equal(needsActorPermission('pull_request_review', fixture('pull_request_review.changes_requested')), true)
  const approved = fixture('pull_request_review.changes_requested')
  approved.review.state = 'approved'
  assert.equal(needsActorPermission('pull_request_review', approved), false)
  assert.equal(needsActorPermission('issue_comment', fixture('issue_comment.answer')), false)

  assert.equal(needsAgentFacts('pull_request_review', fixture('pull_request_review.changes_requested')), true)
  assert.equal(needsAgentFacts('pull_request_review', approved), false)
  for (const body of ['/agent retry', '/agent rerun', '/agent stop', '/agent a question', 'no command']) {
    assert.equal(needsAgentFacts('issue_comment', comment('issue_comment.chat.agent-pr', body)), true, body)
  }
  for (const body of ['/agent cost', '/agent', '/agent review', '/agent implement']) {
    assert.equal(needsAgentFacts('issue_comment', comment('issue_comment.chat.agent-pr', body)), false, body)
  }
  assert.equal(needsAgentFacts('issue_comment', onPersonPull('/agent retry')), false)
  assert.equal(needsAgentFacts('issue_comment', fixture('issue_comment.retry')), false)
  const bot = fixture('issue_comment.chat.agent-pr')
  bot.comment.user.login = 'github-actions[bot]'
  assert.equal(needsAgentFacts('issue_comment', bot), false)
  assert.equal(needsAgentFacts('pull_request', fixture('pull_request.opened')), false)
})

test('needsIssueState: any person who writes a comment without a command on an issue', () => {
  assert.equal(needsIssueState('issue_comment', fixture('issue_comment.answer')), true)
  assert.equal(needsIssueState('issue_comment', fixture('issue_comment.retry')), false)
  const bot = fixture('issue_comment.answer')
  bot.comment.user.login = 'github-actions[bot]'
  assert.equal(needsIssueState('issue_comment', bot), false)
})

test('isHandOffAnswer is true only for a comment without a command on a hand-off', () => {
  const payload = fixture('issue_comment.answer')
  assert.equal(isHandOffAnswer('issue_comment', payload, { issueState: issueState() }), true)
  assert.equal(isHandOffAnswer('issue_comment', payload, { issueState: issueState({ phase: 'needs-info' }) }), false)
  assert.equal(isHandOffAnswer('issue_comment', payload, {}), false)
  assert.equal(isHandOffAnswer('issue_comment', fixture('issue_comment.retry'), { issueState: issueState() }), false)
  const pull = comment('issue_comment.chat.agent-pr', 'looks fine')
  assert.equal(isHandOffAnswer('issue_comment', pull, { agentFacts: agentFacts() }), true)
  assert.equal(isHandOffAnswer('issue_comment', pull, { agentFacts: agentFacts(issueState({ pr: 99 })) }), false)
  assert.equal(isHandOffAnswer('pull_request_review', pull, { agentFacts: agentFacts() }), false)
})

function fakeClient({ permission = 'write', comments = {} } = {}) {
  const calls = []
  return {
    calls,
    getPermission: async (login) => (calls.push(['getPermission', login]), permission),
    listIssueComments: async (n) => (calls.push(['listIssueComments', n]), comments[n] ?? []),
  }
}
const stateComment = (st) => ({ id: 5, user: { login: 'github-actions[bot]' }, body: state.render('x', st) })

test('gather: a comment on a pull request of the agent reads the issue state of the marker', async () => {
  const client = fakeClient({ comments: { 200: [stateComment(issueState())] } })
  const result = await gather({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.chat.agent-pr'),
    config: enabled(),
    getClient: () => client,
  })
  assert.deepEqual(result.agentFacts, { issueNumber: 200, issueState: issueState() })
  assert.equal(result.actorPermission, 'write')
  assert.deepEqual(client.calls, [['getPermission', 'carol'], ['listIssueComments', 200]])
})

test('gather: an answer to a hand-off looks up the permission after the state shows a hand-off', async () => {
  const client = fakeClient({ comments: { 200: [stateComment(issueState())] } })
  const result = await gather({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.answer'),
    config: enabled(),
    getClient: () => client,
  })
  assert.equal(result.issueState.phase, 'needs-human')
  assert.equal(result.actorPermission, 'write')
  assert.deepEqual(client.calls, [['listIssueComments', 200], ['getPermission', 'carol']])
})

test('gather: a comment on an issue that waits for nothing costs no permission call', async () => {
  const client = fakeClient({ comments: { 200: [stateComment(issueState({ phase: 'waiting-ci' }))] } })
  const result = await gather({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.answer'),
    config: enabled(),
    getClient: () => client,
  })
  assert.equal(result.actorPermission, 'none')
  assert.deepEqual(client.calls, [['listIssueComments', 200]])
})

test('gather: a review with change requests reads the permission and the issue state', async () => {
  const client = fakeClient({ comments: { 200: [stateComment(issueState())] } })
  const result = await gather({
    eventName: 'pull_request_review',
    payload: fixture('pull_request_review.changes_requested'),
    config: enabled(),
    getClient: () => client,
  })
  assert.equal(result.actorPermission, 'write')
  assert.equal(result.agentFacts.issueState.pr, 70)
  const approved = fixture('pull_request_review.changes_requested')
  approved.review.state = 'approved'
  const none = await gather({
    eventName: 'pull_request_review',
    payload: approved,
    config: enabled(),
    getClient: () => assert.fail('the client must not be created'),
  })
  assert.deepEqual(none, { actorPermission: 'none', pullState: null })
})

test('gather: a state comment of someone else does not count as the issue state', async () => {
  const fake = { id: 1, user: { login: 'mallory' }, body: state.render('fake', issueState()) }
  const client = fakeClient({ comments: { 200: [fake] } })
  const result = await gather({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.chat.agent-pr'),
    config: enabled(),
    getClient: () => client,
  })
  assert.equal(result.agentFacts.issueState, null)
  const decision = decide({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.chat.agent-pr'),
    config: enabled(),
    ...result,
  })
  assert.equal(decision.action, 'chat')
})
