'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const state = require('./lib/state')
const log = require('./lib/log')
const {
  decide,
  gather,
  needsActorPermission,
  needsPullState,
  formatOutputs,
  formatSummary,
  main,
} = require('./route')

// The router logs to stdout; keep the test output readable.
log.setWriter(() => {})

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'))
const enabled = (extra = {}) => loadConfig({ AGENT_ENABLED: 'true', ...extra })
const route = (eventName, payload, extra = {}) => decide({ eventName, payload, config: enabled(), ...extra })
const comment = (body, name = 'issue_comment.pr') => {
  const payload = fixture(name)
  payload.comment.body = body
  return payload
}

test('disabled agent skips every event', () => {
  const config = loadConfig({})
  const result = decide({ eventName: 'pull_request', payload: fixture('pull_request.opened'), config })
  assert.deepEqual(result, { action: 'skip', number: 123, reason: 'AGENT_ENABLED is not true' })
  const issueResult = decide({ eventName: 'issue_comment', payload: fixture('issue_comment.pr'), config })
  assert.equal(issueResult.action, 'skip')
  assert.equal(issueResult.reason, 'AGENT_ENABLED is not true')
  assert.equal(decide({ eventName: 'push', payload: {}, config }).number, null)
})

test('pull_request opened by a person is reviewed', () => {
  const result = route('pull_request', fixture('pull_request.opened'))
  assert.equal(result.action, 'review')
  assert.equal(result.number, 123)
  assert.equal(result.command, undefined)
  assert.ok(result.reason)
})

test('draft pull request is skipped', () => {
  const result = route('pull_request', fixture('pull_request.draft'))
  assert.deepEqual([result.action, result.number, result.reason], ['skip', 123, 'draft pull request'])
})

test('fork pull request is skipped on opened and ready_for_review', () => {
  const result = route('pull_request', fixture('pull_request.fork'))
  assert.equal(result.action, 'skip')
  assert.match(result.reason, /fork pull requests run only on \/agent review/)
  const ready = fixture('pull_request.fork')
  ready.action = 'ready_for_review'
  assert.equal(route('pull_request', ready).action, 'skip')
})

test('pull request from a deleted fork (no head repo) counts as a fork', () => {
  const payload = fixture('pull_request.opened')
  payload.pull_request.head.repo = null
  assert.match(route('pull_request', payload).reason, /fork/)
})

test('repository names compare case-insensitively', () => {
  const payload = fixture('pull_request.opened')
  payload.pull_request.head.repo.full_name = 'NETCRACKER/Qubership-APIHUB'
  assert.equal(route('pull_request', payload).action, 'review')
})

test('bot authors are skipped', () => {
  const result = route('pull_request', fixture('pull_request.dependabot'))
  assert.equal(result.action, 'skip')
  assert.match(result.reason, /dependabot\[bot\].*bot/)
  const other = fixture('pull_request.opened')
  other.pull_request.user.login = 'renovate[bot]'
  assert.equal(route('pull_request', other).action, 'skip')
})

test('pull request opened by the agent is skipped', () => {
  const result = route('pull_request', fixture('pull_request.agent-marker'))
  assert.deepEqual([result.action, result.reason], ['skip', 'pull request was opened by the agent'])
})

test('a null body is fine', () => {
  const payload = fixture('pull_request.opened')
  payload.pull_request.body = null
  assert.equal(route('pull_request', payload).action, 'review')
})

test('author outside AGENT_ALLOWED_ACTORS is skipped, case-insensitively allowed otherwise', () => {
  const payload = fixture('pull_request.opened')
  const denied = decide({
    eventName: 'pull_request',
    payload,
    config: enabled({ AGENT_ALLOWED_ACTORS: 'bob, carol' }),
  })
  assert.equal(denied.action, 'skip')
  assert.match(denied.reason, /alice.*AGENT_ALLOWED_ACTORS/)
  const allowed = decide({
    eventName: 'pull_request',
    payload,
    config: enabled({ AGENT_ALLOWED_ACTORS: 'Alice' }),
  })
  assert.equal(allowed.action, 'review')
})

test('ready_for_review: reviewed pull request is skipped, fresh one is reviewed', () => {
  const payload = fixture('pull_request.ready_for_review')
  const reviewed = route('pull_request', payload, { pullState: state.emptyPullState(123) })
  assert.equal(reviewed.action, 'review')
  const withReview = { ...state.emptyPullState(123), reviews: [{ sha: 'abc' }] }
  const skipped = route('pull_request', payload, { pullState: withReview })
  assert.deepEqual([skipped.action, skipped.reason], ['skip', 'already reviewed; use /agent review'])
  assert.equal(route('pull_request', payload, { pullState: null }).action, 'review')
  assert.equal(route('pull_request', payload).action, 'review')
})

test('a state with reviews does not block "opened"', () => {
  const withReview = { ...state.emptyPullState(123), reviews: [{ sha: 'abc' }] }
  assert.equal(route('pull_request', fixture('pull_request.opened'), { pullState: withReview }).action, 'review')
})

test('other pull_request actions are skipped', () => {
  for (const action of ['synchronize', 'closed', 'reopened', 'labeled', 'edited']) {
    const payload = fixture('pull_request.opened')
    payload.action = action
    const result = route('pull_request', payload)
    assert.equal(result.action, 'skip', action)
    assert.equal(result.number, 123)
  }
})

test('a pull_request event without the pull_request payload is an error', () => {
  assert.throws(() => route('pull_request', { action: 'opened' }), TypeError)
})

test('/agent review on a pull request starts a review, fork or not', () => {
  const result = route('issue_comment', fixture('issue_comment.pr'), { actorPermission: 'write' })
  assert.deepEqual(result, {
    action: 'review',
    number: 123,
    reason: '/agent review',
    command: { name: 'review', force: false, notes: '' },
  })
  for (const permission of ['admin', 'maintain']) {
    assert.equal(route('issue_comment', fixture('issue_comment.pr'), { actorPermission: permission }).action, 'review')
  }
})

test('/agent review passes the notes on', () => {
  const result = route('issue_comment', comment('/agent review\nFocus on the migration.'), { actorPermission: 'write' })
  assert.equal(result.action, 'review')
  assert.equal(result.command.notes, 'Focus on the migration.')
})

test('/agent review on an issue is skipped', () => {
  const result = route('issue_comment', fixture('issue_comment.issue'), { actorPermission: 'write' })
  assert.deepEqual([result.action, result.number, result.reason], ['skip', 123, 'review works on pull requests'])
})

test('commenter without write access is skipped', () => {
  for (const actorPermission of ['read', 'triage', 'none', undefined]) {
    const result = route('issue_comment', fixture('issue_comment.pr'), { actorPermission })
    assert.equal(result.action, 'skip', String(actorPermission))
    assert.match(result.reason, /carol.*no write access/)
  }
})

test('commenter outside AGENT_ALLOWED_ACTORS is skipped even with write access', () => {
  const result = decide({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.pr'),
    config: enabled({ AGENT_ALLOWED_ACTORS: 'dave' }),
    actorPermission: 'admin',
  })
  assert.equal(result.action, 'skip')
  assert.match(result.reason, /carol.*AGENT_ALLOWED_ACTORS/)
})

test('ordinary comments and bot comments are skipped', () => {
  const plain = route('issue_comment', comment('looks good'), { actorPermission: 'admin' })
  assert.deepEqual([plain.action, plain.reason], ['skip', 'not a command'])
  const bot = comment('/agent review')
  bot.comment.user = { login: 'github-actions[bot]', type: 'Bot' }
  const result = route('issue_comment', bot, { actorPermission: 'admin' })
  assert.equal(result.action, 'skip')
  assert.match(result.reason, /bot/)
})

test('commands other than review, analyze, and implement are not available yet', () => {
  for (const body of ['/agent', '/agent retry', '/agent stop', '/agent cost', '/agent what do you think?']) {
    const result = route('issue_comment', comment(body), { actorPermission: 'write' })
    assert.equal(result.action, 'skip', body)
    assert.match(result.reason, /not available yet/, body)
    assert.equal(result.number, 123)
  }
})

test('edited and deleted comments are skipped', () => {
  for (const action of ['edited', 'deleted']) {
    const payload = fixture('issue_comment.pr')
    payload.action = action
    assert.equal(route('issue_comment', payload, { actorPermission: 'write' }).action, 'skip', action)
  }
})

test('an issue_comment event without issue or comment is an error', () => {
  assert.throws(() => route('issue_comment', { action: 'created' }), TypeError)
})

test('unhandled events are skipped', () => {
  const result = route('push', { ref: 'refs/heads/develop' })
  assert.deepEqual(result, { action: 'skip', number: null, reason: "event 'push' is not handled" })
  assert.equal(route('issues', { action: 'opened', issue: { number: 7 } }).number, 7)
})

test('needsActorPermission and needsPullState', () => {
  assert.equal(needsActorPermission('issue_comment', fixture('issue_comment.pr')), true)
  assert.equal(needsActorPermission('issue_comment', comment('hello')), false)
  assert.equal(needsActorPermission('pull_request', fixture('pull_request.opened')), false)
  const edited = fixture('issue_comment.pr')
  edited.action = 'edited'
  assert.equal(needsActorPermission('issue_comment', edited), false)
  const bot = fixture('issue_comment.pr')
  bot.comment.user.login = 'github-actions[bot]'
  assert.equal(needsActorPermission('issue_comment', bot), false)

  assert.equal(needsPullState('pull_request', fixture('pull_request.ready_for_review')), true)
  assert.equal(needsPullState('pull_request', fixture('pull_request.opened')), false)
  assert.equal(needsPullState('issue_comment', fixture('issue_comment.pr')), false)
})

function fakeClient({ permission = 'write', comments = [] } = {}) {
  const calls = []
  return {
    calls,
    getPermission: async (login) => (calls.push(['getPermission', login]), permission),
    listIssueComments: async (n) => (calls.push(['listIssueComments', n]), comments),
  }
}

test('gather resolves the permission of a commenter who wrote a command', async () => {
  const client = fakeClient({ permission: 'maintain' })
  const result = await gather({
    eventName: 'issue_comment',
    payload: fixture('issue_comment.pr'),
    config: enabled(),
    getClient: () => client,
  })
  assert.deepEqual(result, { actorPermission: 'maintain', pullState: null })
  assert.deepEqual(client.calls, [['getPermission', 'carol']])
})

test('gather resolves the pull request state on ready_for_review', async () => {
  const saved = { ...state.emptyPullState(123), reviews: [{ sha: 'abc' }] }
  const comments = [
    { id: 1, user: { login: 'mallory' }, body: state.render('fake', { schema: 1, reviews: [] }) },
    { id: 2, user: { login: 'github-actions[bot]' }, body: state.render('real', saved) },
  ]
  const client = fakeClient({ comments })
  const result = await gather({
    eventName: 'pull_request',
    payload: fixture('pull_request.ready_for_review'),
    config: enabled(),
    getClient: () => client,
  })
  assert.deepEqual(result.pullState, saved)
  assert.deepEqual(client.calls, [['listIssueComments', 123]])

  const empty = fakeClient({ comments: [] })
  const none = await gather({
    eventName: 'pull_request',
    payload: fixture('pull_request.ready_for_review'),
    config: enabled(),
    getClient: () => empty,
  })
  assert.equal(none.pullState, null)
})

test('gather propagates a damaged state block', async () => {
  const body = `${state.MARKER}\nhuman\n\n<!-- ai-autonomous-state-json\n{ not json\n-->\n`
  const client = fakeClient({ comments: [{ id: 2, user: { login: 'github-actions[bot]' }, body }] })
  await assert.rejects(
    gather({
      eventName: 'pull_request',
      payload: fixture('pull_request.ready_for_review'),
      config: enabled(),
      getClient: () => client,
    }),
    /invalid JSON/,
  )
})

test('gather makes no API call when nothing is needed or the agent is disabled', async () => {
  const getClient = () => assert.fail('the client must not be created')
  const neutral = { actorPermission: 'none', pullState: null }
  assert.deepEqual(
    await gather({ eventName: 'pull_request', payload: fixture('pull_request.opened'), config: enabled(), getClient }),
    neutral,
  )
  assert.deepEqual(
    await gather({ eventName: 'issue_comment', payload: comment('hi'), config: enabled(), getClient }),
    neutral,
  )
  assert.deepEqual(
    await gather({
      eventName: 'issue_comment',
      payload: fixture('issue_comment.pr'),
      config: loadConfig({}),
      getClient,
    }),
    neutral,
  )
})

test('formatOutputs writes key=value lines on one line each', () => {
  const text = formatOutputs({
    action: 'review',
    number: 123,
    reason: 'first\nsecond',
    command: { name: 'review', force: false, notes: 'a\nb' },
  })
  assert.equal(
    text,
    'action=review\nnumber=123\nreason=first second\n' +
      'command={"name":"review","force":false,"notes":"a\\nb"}\n',
  )
  const bare = formatOutputs({ action: 'skip', number: null, reason: 'x' })
  assert.equal(bare, 'action=skip\nnumber=\nreason=x\ncommand=\n')
})

test('formatSummary is one Markdown line', () => {
  assert.equal(
    formatSummary({ action: 'skip', number: 5, reason: 'draft pull request' }),
    '- AI Autonomous agent chose `skip` for #5: draft pull request\n',
  )
  assert.equal(
    formatSummary({ action: 'skip', number: null, reason: "event 'push' is not handled" }),
    "- AI Autonomous agent chose `skip`: event 'push' is not handled\n",
  )
})

async function runMain(fixtureName, envExtra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-test-'))
  try {
    const eventPath = path.join(dir, 'event.json')
    fs.copyFileSync(path.join(__dirname, 'fixtures', `${fixtureName}.json`), eventPath)
    const env = {
      GITHUB_EVENT_NAME: fixtureName.split('.')[0],
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: path.join(dir, 'output'),
      GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
      ...envExtra,
    }
    const decision = await main(env)
    return {
      decision,
      output: fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'),
      summary: fs.readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'),
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('main writes the outputs and the summary without any token for a pull_request opened event', async () => {
  const { decision, output, summary } = await runMain('pull_request.opened', { AGENT_ENABLED: 'true' })
  assert.equal(decision.action, 'review')
  assert.equal(output, 'action=review\nnumber=123\nreason=pull request opened\ncommand=\n')
  assert.match(summary, /chose `review` for #123/)
})

test('main skips when the agent is disabled', async () => {
  const { output } = await runMain('pull_request.opened')
  assert.match(output, /^action=skip\nnumber=123\nreason=AGENT_ENABLED is not true\n/)
})

test('main fails on a bad configuration and on missing event variables', async () => {
  await assert.rejects(runMain('pull_request.opened', { AGENT_MAX_ATTEMPTS: 'x' }), /AGENT_MAX_ATTEMPTS/)
  await assert.rejects(main({}), /GITHUB_EVENT_NAME is not set/)
  await assert.rejects(main({ GITHUB_EVENT_NAME: 'push' }), /GITHUB_EVENT_PATH is not set/)
})

test('main needs a token only when it must call the API', async () => {
  await assert.rejects(runMain('issue_comment.pr', { AGENT_ENABLED: 'true' }), /GITHUB_TOKEN is not set/)
})

test('/agent review on a Dependabot pull request is skipped, whoever asks', () => {
  for (const permission of ['write', 'admin']) {
    const result = route('issue_comment', fixture('issue_comment.pr-dependabot'), { actorPermission: permission })
    assert.deepEqual([result.action, result.number], ['skip', 124], permission)
    assert.equal(result.reason, 'dependency update pull requests are not reviewed')
  }
  const plain = fixture('issue_comment.pr-dependabot')
  plain.issue.user = { login: 'Dependabot', type: 'Bot' }
  assert.equal(route('issue_comment', plain, { actorPermission: 'write' }).action, 'skip')
})

test('/agent review on a pull request of a person is still reviewed', () => {
  const result = route('issue_comment', fixture('issue_comment.pr'), { actorPermission: 'write' })
  assert.equal(result.action, 'review')
})
