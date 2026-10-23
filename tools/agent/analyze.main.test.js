'use strict'
// main() of analyze.js over a fake GitHub client and a fake opencode run. The pure functions are in analyze.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { ContractError } = require('./lib/contract')
const log = require('./lib/log')
const state = require('./lib/state')
const { main, analyze, nextState } = require('./analyze')

log.setWriter(() => {})

const FENCE = '```'
const RUN = 'https://github.com/o/r/actions/runs/1'

const plan = { modules: ['portal-backend'], approach: 'Guard the nil changelog.', tests: 'A unit test.', risk: 'low' }
const suitable = { verdict: 'suitable', reason: 'The bug is located.', questions: [], plan }
const unsuitable = { verdict: 'unsuitable', reason: 'It needs a production cluster.', questions: [], plan: null }
const needsInfo = {
  verdict: 'needs-info',
  reason: 'The version is missing.',
  questions: ['Which version is affected?', 'Does it happen in the UI?'],
  plan: null,
}

const issue = {
  number: 200,
  title: 'Changelog is empty',
  body: 'Steps: publish, open the changelog.',
  type: { name: 'Bug' },
  user: { login: 'alice' },
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-03T00:00:00Z',
}

/** The opencode event stream of a run that costs $0.002 and ends with `answer`. */
function eventsFor(answer) {
  const text = typeof answer === 'string' ? answer : `Done.\n${FENCE}json\n${JSON.stringify(answer)}\n${FENCE}`
  const step = { type: 'step_finish', part: { tokens: { input: 100, output: 20, cache: { read: 50 } }, cost: 0.002 } }
  return [step, { type: 'text', part: { text } }].map((e) => JSON.stringify(e)).join('\n')
}

function fakeGh({ labels = [], laterLabels = null, comments = [], failOn = null } = {}) {
  const calls = []
  let reads = 0
  // `failOn` names a method that rejects, to show what the state says after a failed label call.
  const call = (...args) => {
    calls.push(args)
    if (failOn === args[0]) throw new Error(`${args[0]} failed`)
  }
  return {
    calls,
    // `laterLabels` is what a person changed while the model ran: every read after the first sees it.
    getIssue: async () => {
      reads += 1
      const current = reads > 1 && laterLabels ? laterLabels : labels
      return { ...issue, labels: current.map((name) => ({ name })) }
    },
    listIssueComments: async () => comments,
    createIssueComment: async (n, body) => call('createIssueComment', n, body),
    updateIssueComment: async (id, body) => call('updateIssueComment', id, body),
    addLabels: async (n, add) => call('addLabels', n, add),
    removeLabel: async (n, label) => call('removeLabel', n, label),
  }
}

async function runMain({ answer, exitCode = 0, gh = fakeGh(), env = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'))
  const agentCalls = []
  const runAgent = async (options) => {
    agentCalls.push({ ...options, inputText: fs.readFileSync(options.files[0], 'utf8') })
    return { exitCode, eventsText: eventsFor(answer), stderrTail: 'stderr text' }
  }
  const fullEnv = {
    AGENT_NUMBER: '200',
    AGENT_TRIGGER: 'opened',
    AGENT_RUN_URL: RUN,
    AGENT_OUT: path.join(dir, 'out'),
    AGENT_DRY_RUN: 'false',
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    ...env,
  }
  let error = null
  try {
    await main(fullEnv, { gh, runAgent })
  } catch (err) {
    error = err
  }
  const summary = fs.existsSync(fullEnv.GITHUB_STEP_SUMMARY) ? fs.readFileSync(fullEnv.GITHUB_STEP_SUMMARY, 'utf8') : ''
  const files = fs.readdirSync(fullEnv.AGENT_OUT).sort()
  fs.rmSync(dir, { recursive: true, force: true })
  return { gh, agentCalls, error, summary, files }
}

function stateAfter(analysis, label) {
  return nextState(state.emptyIssueState(200), {
    analysis,
    label,
    issueUpdatedAt: 'x',
    run: RUN,
    at: '2026-10-01T00:00:00Z',
    trigger: 'opened',
  })
}

test('a suitable verdict adds the label, then writes the state', async () => {
  const { gh, agentCalls, error, files } = await runMain({ answer: suitable })
  assert.equal(error, null)
  assert.deepEqual(gh.calls.map((c) => c.slice(0, 2)), [['addLabels', 200], ['createIssueComment', 200]])
  assert.deepEqual(gh.calls[0][2], ['ai:suitable'])
  const saved = state.parse(gh.calls[1][2])
  assert.equal(saved.phase, 'analyzed')
  assert.equal(saved.analysis.label, 'ai:suitable')
  assert.equal(saved.analysis.labelSetBy, 'agent')
  assert.equal(saved.analysis.issueUpdatedAt, '2026-10-03T00:00:00Z')
  assert.deepEqual(saved.analyses.map((a) => [a.verdict, a.trigger]), [['suitable', 'opened']])
  assert.deepEqual(saved.costs.map((c) => [c.flow, c.role, c.usd]), [['analyze', 'analyst', 0.002]])
  assert.match(gh.calls[1][2], /### AI analysis\n\n\*\*Suitable for AI implementation\./)
  assert.equal(agentCalls.length, 1)
  assert.equal(agentCalls[0].agent, 'analyst')
  assert.match(agentCalls[0].inputText, /^# Issue #200\n/)
  assert.deepEqual(files, ['analysis-input.md', 'analyst.final.md', 'summary.md'])
})

test('needs-info labels the issue and posts a separate comment that mentions the author', async () => {
  const { gh, error } = await runMain({ answer: needsInfo })
  assert.equal(error, null)
  assert.deepEqual(gh.calls.map((c) => c[0]), ['addLabels', 'createIssueComment', 'createIssueComment'])
  assert.deepEqual(gh.calls[0][2], ['agent:needs-human'])
  assert.equal(state.parse(gh.calls[1][2]).phase, 'needs-info')
  assert.match(gh.calls[2][2], /^@alice, /)
  assert.match(gh.calls[2][2], /1\. Which version is affected\?/)
})

test('a re-analysis updates the state comment, reads the old verdict, and swaps the labels', async () => {
  const comments = [
    { id: 1, user: { login: 'bob' }, created_at: 'd', body: 'It still fails.' },
    {
      id: 77,
      user: { login: 'github-actions[bot]' },
      created_at: 'd',
      body: state.render('old', stateAfter(unsuitable, 'ai:unsuitable')),
    },
  ]
  const gh = fakeGh({ labels: ['ai:unsuitable', 'agent:needs-human'], comments })
  const { agentCalls, error } = await runMain({ answer: suitable, gh, env: { AGENT_TRIGGER: 'command' } })
  assert.equal(error, null)
  assert.deepEqual(gh.calls.map((c) => c.slice(0, 2)), [
    ['addLabels', 200],
    ['removeLabel', 200],
    ['removeLabel', 200],
    ['updateIssueComment', 77],
  ])
  assert.deepEqual(gh.calls.slice(1, 3).map((c) => c[2]), ['ai:unsuitable', 'agent:needs-human'])
  const saved = state.parse(gh.calls[3][2])
  assert.deepEqual(saved.analyses.map((a) => a.verdict), ['unsuitable', 'suitable'])
  assert.equal(saved.analyses[1].trigger, 'command')
  // The input has the comment of the person and the previous verdict, but not the state comment.
  assert.match(agentCalls[0].inputText, /It still fails\./)
  assert.match(agentCalls[0].inputText, /## Previous analysis\n\n- Verdict: unsuitable/)
  assert.doesNotMatch(agentCalls[0].inputText, /ai-autonomous-state/)
})

test('a label of a person stays, and the state does not claim it', async () => {
  const gh = fakeGh({ labels: ['ai:unsuitable'] })
  const { error } = await runMain({ answer: suitable, gh })
  assert.equal(error, null)
  assert.deepEqual(gh.calls.map((c) => c[0]), ['createIssueComment'])
  const saved = state.parse(gh.calls[0][2])
  assert.equal(saved.analysis.label, null)
  assert.equal(saved.analysis.labelSetBy, null)
})

test('dry-run writes nothing to GitHub and reports the labels and the comment in the summary', async () => {
  const { gh, summary, error } = await runMain({ answer: needsInfo, env: { AGENT_DRY_RUN: 'true' } })
  assert.equal(error, null)
  assert.deepEqual(gh.calls, [])
  assert.match(summary, /^## Dry run: AI analysis of #200\n/)
  assert.match(summary, /- labels to add: agent:needs-human\n- labels to remove: none/)
  assert.match(summary, /> @alice, /)
  assert.match(summary, /More information needed/)
})

test('an unusable answer writes a failure state with the cost and fails the job', async () => {
  const { gh, error } = await runMain({ answer: 'I could not decide.' })
  assert.ok(error instanceof ContractError)
  assert.deepEqual(gh.calls.map((c) => c[0]), ['createIssueComment'])
  const saved = state.parse(gh.calls[0][2])
  assert.equal(saved.costs.length, 1)
  assert.equal(saved.analyses.at(-1).verdict, 'failed')
  assert.equal(saved.phase, null)
  assert.match(gh.calls[0][2], /### AI analysis failed\n\nThe analysis did not finish: /)
})

test('an inconsistent answer is a failure too, and no label changes', async () => {
  const { gh, error } = await runMain({ answer: { ...needsInfo, questions: [] } })
  assert.ok(error instanceof ContractError)
  assert.match(error.message, /needs at least one question/)
  assert.deepEqual(gh.calls.map((c) => c[0]), ['createIssueComment'])
})

test('a failed opencode run without an answer reports the exit code and keeps the old phase', async () => {
  const waiting = stateAfter(needsInfo, null)
  const comments = [{ id: 5, user: { login: 'github-actions[bot]' }, body: state.render('old', waiting) }]
  const eventsText = JSON.stringify({ type: 'step_finish', part: { tokens: { input: 1 }, cost: 0.5 } })
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'))
  const gh = fakeGh({ comments })
  try {
    await assert.rejects(
      main(
        { AGENT_NUMBER: '200', AGENT_RUN_URL: RUN, AGENT_OUT: dir, AGENT_DRY_RUN: 'false' },
        { gh, runAgent: async () => ({ exitCode: 3, eventsText, stderrTail: 'out of quota' }) },
      ),
      /analyst exited with 3: out of quota/,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  assert.deepEqual(gh.calls.map((c) => c[0]), ['updateIssueComment'])
  const saved = state.parse(gh.calls[0][2])
  assert.equal(saved.phase, 'needs-info')
  assert.equal(saved.costs.at(-1).usd, 0.5)
  assert.equal(saved.analyses.at(-1).trigger, 'unknown')
})

const botComment = (id, st) => ({ id, user: { login: 'github-actions[bot]' }, body: state.render('old', st) })

test('the labels are read again after the model call, so a label set during the run wins', async () => {
  // The issue had no decision label when the run started; a person added ai:unsuitable while the model worked.
  const gh = fakeGh({ labels: [], laterLabels: ['ai:unsuitable'] })
  const { error } = await runMain({ answer: suitable, gh })
  assert.equal(error, null)
  assert.deepEqual(gh.calls.map((c) => c[0]), ['createIssueComment'])
  const saved = state.parse(gh.calls[0][2])
  assert.equal(saved.analysis.label, null)
  assert.equal(saved.analysis.labelSetBy, null)
})

test('a label that a person removed during the run is not removed again', async () => {
  const comments = [botComment(77, stateAfter(unsuitable, 'ai:unsuitable'))]
  const gh = fakeGh({ labels: ['ai:unsuitable'], laterLabels: [], comments })
  const { error } = await runMain({ answer: suitable, gh, env: { AGENT_TRIGGER: 'command' } })
  assert.equal(error, null)
  assert.deepEqual(gh.calls.map((c) => c.slice(0, 2)), [['addLabels', 200], ['updateIssueComment', 77]])
  assert.equal(state.parse(gh.calls[1][2]).analysis.label, 'ai:suitable')
})

test('a failed label call keeps the previous ownership, still writes the state with the cost, and fails', async () => {
  const gh = fakeGh({ failOn: 'addLabels' })
  const { error } = await runMain({ answer: suitable, gh })
  assert.match(error.message, /addLabels failed/)
  assert.deepEqual(gh.calls.map((c) => c[0]), ['addLabels', 'createIssueComment'])
  const saved = state.parse(gh.calls[1][2])
  // The label was not added, so the state must not claim it.
  assert.equal(saved.analysis.label, null)
  assert.equal(saved.analysis.labelSetBy, null)
  assert.equal(saved.analysis.verdict, 'suitable')
  assert.equal(saved.costs.length, 1)
})

test('a failed removal still records the label that was added as the agent label', async () => {
  const comments = [botComment(77, stateAfter(unsuitable, 'ai:unsuitable'))]
  const gh = fakeGh({ labels: ['ai:unsuitable'], comments, failOn: 'removeLabel' })
  const { error } = await runMain({ answer: suitable, gh, env: { AGENT_TRIGGER: 'command' } })
  assert.match(error.message, /removeLabel failed/)
  const saved = state.parse(gh.calls.at(-1)[2])
  assert.equal(saved.analysis.label, 'ai:suitable')
  assert.equal(saved.analysis.labelSetBy, 'agent')
})

test('analyze() returns the state, the comment id, and the failure without throwing', async () => {
  const gh = fakeGh({ comments: [botComment(5, stateAfter(unsuitable, null))] })
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'))
  try {
    const runAgent = async () => ({ exitCode: 0, eventsText: eventsFor('no json here'), stderrTail: '' })
    const env = { AGENT_NUMBER: '200', AGENT_RUN_URL: RUN, AGENT_OUT: dir, AGENT_DRY_RUN: 'false' }
    const result = await analyze(env, { gh, runAgent })
    assert.ok(result.failure instanceof ContractError)
    assert.equal(result.commentId, 5)
    assert.equal(result.analysis, null)
    assert.equal(result.state.analyses.at(-1).verdict, 'failed')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('askAuthor: false leaves out the separate comment with the questions', async () => {
  const gh = fakeGh()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'))
  try {
    const runAgent = async () => ({ exitCode: 0, eventsText: eventsFor(needsInfo), stderrTail: '' })
    const env = { AGENT_NUMBER: '200', AGENT_RUN_URL: RUN, AGENT_OUT: dir, AGENT_DRY_RUN: 'false' }
    const result = await analyze(env, { gh, runAgent }, { askAuthor: false })
    assert.equal(result.failure, null)
    assert.equal(result.analysis.verdict, 'needs-info')
    assert.deepEqual(gh.calls.map((c) => c[0]), ['addLabels', 'createIssueComment'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
