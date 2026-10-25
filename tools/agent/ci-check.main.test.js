'use strict'
// ciCheck() of ci-check.js over a fake GitHub client and a fake opencode. The pure functions are in ci-check.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { ciCheck, main } = require('./ci-check')

log.setWriter(() => {})

const FENCE = '```'
const RUN = 'https://github.com/o/r/actions/runs/7'
const TOKEN = 'fake-token-value-0123456789'
const SHA = '3f2a9c1d5b7e8f40a1b2c3d4e5f60718293a4b5c'
const BRANCH = 'bugfix/200-changelog-is-empty-for-a'
const AGENT_BODY = 'Closes #200.\n\n<!-- ai-autonomous-agent issue=200 -->\n'

const checkRun = (name, conclusion, { runId = 900, jobId = 11, ...extra } = {}) => ({
  id: jobId,
  name,
  status: 'completed',
  conclusion,
  html_url: `https://github.com/o/r/actions/runs/${runId}/job/${jobId}`,
  details_url: `https://github.com/o/r/actions/runs/${runId}/job/${jobId}`,
  app: { slug: 'github-actions' },
  ...extra,
})
const running = (name) => ({ ...checkRun(name, null), status: 'in_progress' })
const red = () => [checkRun('e2e / smoke', 'failure'), checkRun('build', 'success', { jobId: 12 })]

const failingLog = [
  '2026-10-23T09:12:01.1000000Z ##[group]Run pnpm exec nx run-many',
  '2026-10-23T09:12:02.2000000Z FAIL packages/x/search.test.ts (3.2 s)',
  '2026-10-23T09:12:03.3000000Z Error: expected 1 to be 2',
  '2026-10-23T09:12:04.4000000Z ##[error]Process completed with exit code 1.',
].join('\n')

const cost = (extra = {}) => ({
  run: RUN, flow: 'implement', role: 'implementer', model: 'openai/gpt-6.1-sol', variant: 'high',
  input: 100, cached: 50, output: 20, reasoning: 0, usd: 1, at: '2026-10-21T10:00:00.000Z', ...extra,
})
const issueState = (extra = {}) => ({
  schema: 1,
  kind: 'issue',
  number: 200,
  phase: 'needs-human',
  branch: BRANCH,
  pr: 70,
  attempts: [{ n: 1, kind: 'initial', actor: 'dave', result: 'ci-red', signature: 'abc' }],
  ciGate: { sha: SHA, decided: true, at: 't', run: 'r' },
  costs: [cost()],
  ...extra,
})
const botComment = (id, st, human = 'The human part.') => ({
  id, user: { login: 'github-actions[bot]' }, body: state.render(human, st),
})

const triage = (extra = {}) => ({
  verdict: 'change',
  confidence: 'high',
  rootCause: 'The change renames the field, and the test still reads the old name.',
  fixes: [{ file: 'frontend/ui/src/search.test.ts', line: 42, what: 'Read the new field name.' }],
  evidence: ['Error: expected 1 to be 2'],
  ...extra,
})

/**
 * A GitHub client over targets by number: `targets[n]` is `{ pull?, comments }`. It keeps the comments like GitHub does
 * and records every write in order.
 */
function fakeGh({
  targets, checkRuns = red(), statuses = [], logs = { 11: failingLog }, rerunFails = false, noCiOk = false,
}) {
  const calls = []
  let nextId = 1000
  const at = (n) => {
    assert.ok(targets[n], `unexpected number ${n}`)
    return targets[n]
  }
  return {
    calls,
    targets,
    getPull: async (n) => ({
      number: n,
      state: 'open',
      title: 'feat(ui): add search box',
      body: 'Adds a search box.',
      base: { ref: 'develop' },
      head: { sha: SHA },
      ...at(n).pull,
    }),
    listCheckRuns: async (sha) => {
      assert.equal(sha, SHA)
      // CI's verdict job exists in every real run.
      return noCiOk || checkRuns.length === 0 || checkRuns.some((r) => r.name === 'ci-ok')
        ? checkRuns
        : [...checkRuns, checkRun('ci-ok', checkRuns.every((r) => r.conclusion === 'success') ? 'success' : 'failure', {
          jobId: 99,
        })]
    },
    getCombinedStatus: async () => ({ state: 'pending', statuses }),
    getJobLog: async (id) => {
      if (logs[id] === undefined) throw new Error(`no log for job ${id}`)
      return logs[id]
    },
    listIssueComments: async (n) => at(n).comments.map((c) => ({ ...c })),
    createIssueComment: async (n, body) => {
      const created = { id: nextId++, user: { login: 'github-actions[bot]' }, body }
      at(n).comments.push(created)
      calls.push(['createIssueComment', n, body])
      return created
    },
    updateIssueComment: async (id, body) => {
      for (const t of Object.values(targets)) {
        const found = t.comments.find((c) => c.id === id)
        if (found) found.body = body
      }
      calls.push(['updateIssueComment', id, body])
    },
    removeLabel: async (n, label) => calls.push(['removeLabel', n, label]),
    rerunFailedJobs: async (id) => {
      if (rerunFails) throw new Error('Workflow is still running')
      calls.push(['rerunFailedJobs', id])
    },
    addReaction: async (id, content) => calls.push(['addReaction', id, content]),
  }
}

function eventsFor(answer) {
  const text = typeof answer === 'string' ? answer : `Here.\n${FENCE}json\n${JSON.stringify(answer)}\n${FENCE}`
  const step = { type: 'step_finish', part: { tokens: { input: 100, output: 20, cache: { read: 50 } }, cost: 0.25 } }
  return [step, { type: 'text', part: { text } }].map((e) => JSON.stringify(e)).join('\n')
}

/** An opencode that answers from a queue and keeps the input text it was given. */
function fakeRunAgent(answers) {
  const queue = [...answers]
  const runs = []
  const runAgent = async (options) => {
    runs.push({ agent: options.agent, model: options.model, inputText: fs.readFileSync(options.files[0], 'utf8') })
    const next = queue.shift()
    assert.ok(next !== undefined, 'unexpected call of the triager')
    fs.writeFileSync(options.eventsFile, eventsFor(next))
    return { exitCode: 0, eventsText: eventsFor(next), stderrTail: '' }
  }
  runAgent.runs = runs
  return runAgent
}

const person = () => ({ 123: { comments: [] } })
const agentPulls = (phase = 'needs-human', extra = {}) => ({
  70: { pull: { body: AGENT_BODY }, comments: [] },
  200: { comments: [botComment(5, issueState({ phase, ...extra }))] },
})

function setup({ targets = person(), number = 123, issue = '', answers = [], env = {}, ...options }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-check-test-'))
  const fullEnv = {
    GITHUB_REPOSITORY: 'o/r',
    GITHUB_TOKEN: TOKEN,
    AGENT_NUMBER: String(number),
    AGENT_ISSUE: String(issue),
    AGENT_COMMAND: JSON.stringify({ name: 'ci-check', force: false, notes: 'The smoke job failed.' }),
    AGENT_ACTOR: 'carol',
    AGENT_COMMENT_ID: '9101',
    AGENT_RUN_URL: RUN,
    AGENT_OUT: path.join(dir, 'out'),
    AGENT_PR_HEAD_REF: `refs/remotes/pull/${number}/head`,
    AGENT_DRY_RUN: 'false',
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    ...env,
  }
  const gh = fakeGh({ targets, ...options })
  const runAgent = fakeRunAgent(answers)
  return {
    env: fullEnv,
    gh,
    runAgent,
    deps: { gh, runAgent, mergeBase: () => 'b4s3' },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    summary: () => (fs.existsSync(fullEnv.GITHUB_STEP_SUMMARY) ? fs.readFileSync(fullEnv.GITHUB_STEP_SUMMARY, 'utf8') : ''),
    out: (name) => fs.readFileSync(path.join(fullEnv.AGENT_OUT, name), 'utf8'),
    has: (name) => fs.existsSync(path.join(fullEnv.AGENT_OUT, name)),
  }
}

async function withContext(options, fn) {
  const ctx = setup(options)
  try {
    return await fn(ctx)
  } finally {
    ctx.cleanup()
  }
}

const writes = (gh) => gh.calls.filter((c) => c[0] !== 'addReaction')
const reactions = (gh) => gh.calls.filter((c) => c[0] === 'addReaction').map((c) => c[2])
const replies = (gh, n) => gh.calls.filter((c) => c[0] === 'createIssueComment' && c[1] === n && !c[2].includes('ai-autonomous-state'))
const stateOf = (targets, n) => state.parse(state.findStateComment(targets[n].comments).body)

// ------------------------------------------------------------------------------------------------ no model

test('CI still runs: the reply names the checks that run, no model, no state write', async () => {
  const checkRuns = [running('e2e / smoke'), checkRun('build', 'success', { jobId: 12 })]
  await withContext({ checkRuns }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result, { ok: true, outcome: 'pending' })
    assert.equal(ctx.runAgent.runs.length, 0)
    assert.equal(writes(ctx.gh).length, 1)
    const [, number, body] = writes(ctx.gh)[0]
    assert.equal(number, 123)
    assert.ok(body.startsWith('@carol, CI still runs on #123 at 3f2a9c1d5b7e (`e2e / smoke` in_progress'))
    assert.ok(body.endsWith('Comment `/agent ci_check` again when it ends.'))
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('no ci-ok and nothing failed: the reply says that no CI verdict is reported, not that CI still runs', async () => {
  await withContext({ checkRuns: [checkRun('build', 'success')], noCiOk: true }, async (ctx) => {
    assert.deepEqual(await ciCheck(ctx.env, ctx.deps), { ok: true, outcome: 'no-verdict' })
    assert.equal(ctx.runAgent.runs.length, 0)
    assert.deepEqual(writes(ctx.gh), [[
      'createIssueComment',
      123,
      '@carol, no CI verdict (`ci-ok`) is reported for #123 at 3f2a9c1d5b7e, and no check failed. CI may wait for ' +
        'an approval of the workflows of a fork. Comment `/agent ci_check` again when the verdict appears.',
    ]])
  })
})

test('failed checks and no ci-ok: the missing verdict is no running CI, so the command triages the failure', async () => {
  await withContext({ answers: [triage()], noCiOk: true }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result, { ok: true, outcome: 'triaged', verdict: 'change', rerun: [] })
    assert.equal(ctx.runAgent.runs.length, 1)
  })
})

test('a running check still wins over the missing verdict: the reply says that CI still runs', async () => {
  await withContext({ checkRuns: [running('build')], noCiOk: true }, async (ctx) => {
    assert.deepEqual(await ciCheck(ctx.env, ctx.deps), { ok: true, outcome: 'pending' })
    assert.match(writes(ctx.gh)[0][2], /^@carol, CI still runs on #123/)
  })
})

test('CI is green: the reply says so, no model', async () => {
  await withContext({ checkRuns: [checkRun('build', 'success'), checkRun('ci-ok', 'success', { jobId: 13 })] }, async (ctx) => {
    assert.deepEqual(await ciCheck(ctx.env, ctx.deps), { ok: true, outcome: 'green' })
    assert.equal(ctx.runAgent.runs.length, 0)
    assert.deepEqual(writes(ctx.gh), [['createIssueComment', 123, '@carol, CI is green on #123 at 3f2a9c1d5b7e.']])
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('no check at all: the reply says so, no model', async () => {
  await withContext({ checkRuns: [] }, async (ctx) => {
    assert.deepEqual(await ciCheck(ctx.env, ctx.deps), { ok: true, outcome: 'no-checks' })
    assert.equal(ctx.runAgent.runs.length, 0)
    assert.deepEqual(writes(ctx.gh), [['createIssueComment', 123, '@carol, no CI check is reported for #123 at 3f2a9c1d5b7e.']])
  })
})

// ------------------------------------------------------------------------------------------------ red CI

test('red and change: no rerun, the cost and the check are recorded, the reply says what to fix', async () => {
  await withContext({ answers: [triage()] }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result, { ok: true, outcome: 'triaged', verdict: 'change', rerun: [] })
    assert.deepEqual(writes(ctx.gh).map((c) => c[0]), ['createIssueComment', 'createIssueComment'])

    // The state comment of the pull request: created, with the cost record of the call and the check.
    const saved = stateOf(ctx.gh.targets, 123)
    assert.equal(saved.kind, 'pull')
    assert.equal(saved.costs.length, 1)
    assert.deepEqual(
      [saved.costs[0].flow, saved.costs[0].role, saved.costs[0].run, saved.costs[0].usd],
      ['ci-check', 'ci-triager', RUN, 0.25],
    )
    assert.equal(saved.ciChecks.length, 1)
    assert.deepEqual(
      { ...saved.ciChecks[0], at: 'x' },
      { at: 'x', actor: 'carol', sha: SHA, verdict: 'change', confidence: 'high', runs: [] },
    )
    assert.match(saved.ciChecks[0].at, /^\d{4}-\d\d-\d\dT/)

    const [, , reply] = replies(ctx.gh, 123)[0]
    assert.ok(reply.startsWith('@carol, CI check of #123 at 3f2a9c1d5b7e: the failure comes from this change (high confidence).'))
    assert.ok(reply.includes('- `frontend/ui/src/search.test.ts:42`: Read the new field name.'))
    assert.ok(reply.includes('Error: expected 1 to be 2'))
    assert.ok(reply.includes('**What I did.** Nothing: the change causes the failure'))
    assert.ok(!reply.includes('/agent retry'), 'a pull request of a person gets no retry hint')
    assert.ok(reply.includes('this check cost $0.25 · AI cost of this pull request so far: $0.25'))
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])

    // The files of the run.
    for (const name of ['ci-report.md', 'ci-check-input.md', 'ci-triager.jsonl', 'ci-triager.final.md', 'reply.md']) {
      assert.ok(ctx.has(name), name)
    }
    assert.equal(ctx.out('reply.md'), reply)
  })
})

test('the triager gets the diff refs, the signature, the report, and the notes inside untrusted blocks', async () => {
  await withContext({ answers: [triage()] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    assert.equal(ctx.runAgent.runs.length, 1)
    const [call] = ctx.runAgent.runs
    assert.equal(call.agent, 'ci-triager')
    assert.deepEqual(call.model, { id: 'openai/gpt-6.1-sol', variant: 'medium' })
    const text = call.inputText
    assert.equal(text, ctx.out('ci-check-input.md'))
    assert.ok(text.includes('- Base ref: `origin/develop`'))
    assert.ok(text.includes('- Head ref: `refs/remotes/pull/123/head`'))
    assert.ok(text.includes('- Merge base: `b4s3`'))
    assert.match(text, /- Failure signature: `[0-9a-f]{12}`/)
    assert.ok(text.includes('Error: expected 1 to be 2'))
    assert.ok(text.includes('<untrusted>\nThe smoke job failed.\n</untrusted>'))
    assert.ok(text.includes('Title: feat(ui): add search box'))
    assert.ok(text.includes('# CI report for pull request #123'))
    assert.ok(!text.includes(TOKEN))
  })
})

test('red and change on the pull request of the agent adds the retry hint and leaves the issue alone', async () => {
  await withContext({ targets: agentPulls(), number: 70, issue: 200, answers: [triage()] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    const [, , reply] = replies(ctx.gh, 70)[0]
    assert.ok(reply.includes('\nTo let the agent fix it, comment `/agent retry` with this guidance.\n'))
    assert.deepEqual(writes(ctx.gh).filter((c) => c[1] === 200 || c[0] === 'removeLabel'), [])
    assert.deepEqual(stateOf(ctx.gh.targets, 200), issueState())
  })
})

test('red and flaky: the failed jobs are rerun, the check records the run, the reply says so', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [], rootCause: 'The smoke test waits 1 s for a port.' })
  await withContext({ answers: [answer] }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result, { ok: true, outcome: 'triaged', verdict: 'flaky', rerun: [900] })
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs'), [['rerunFailedJobs', 900]])
    const saved = stateOf(ctx.gh.targets, 123)
    assert.deepEqual(saved.ciChecks[0].runs, [900])
    const [, , reply] = replies(ctx.gh, 123)[0]
    assert.ok(reply.includes('a flaky failure, not caused by the change (medium confidence).'))
    assert.ok(reply.includes('**What I did.** I reran the failed jobs (`ci-ok`, `e2e / smoke`).'))
    assert.ok(!reply.includes('CI gate'), 'a pull request of a person has no gate')
    // The rerun comes before the reply.
    const order = writes(ctx.gh).map((c) => c[0])
    assert.ok(order.indexOf('rerunFailedJobs') < order.lastIndexOf('createIssueComment'))
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('red and infra on the agent pull request in needs-human: rerun, then the issue goes back to the gate', async () => {
  const answer = triage({ verdict: 'infra', confidence: 'high', fixes: [], rootCause: 'The registry returned 503.' })
  await withContext({ targets: agentPulls('needs-human'), number: 70, issue: 200, answers: [answer] }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.equal(result.ok, true)
    const order = writes(ctx.gh).map((c) => c[0])
    // The rerun, the cost of the pull request, the issue state, the labels, then the reply.
    assert.deepEqual(order, [
      'rerunFailedJobs', 'createIssueComment', 'updateIssueComment', 'removeLabel', 'removeLabel', 'createIssueComment',
    ])
    const issue = stateOf(ctx.gh.targets, 200)
    assert.equal(issue.phase, 'waiting-ci')
    assert.equal(issue.ciGate, undefined)
    assert.equal(issue.implementing, undefined)
    assert.equal(issue.pr, 70)
    assert.deepEqual(issue.costs, [cost()])
    assert.equal(issue.reruns.length, 1)
    assert.deepEqual(
      { ...issue.reruns[0], at: 'x' },
      { at: 'x', actor: 'carol', sha: SHA, runs: [900], run: RUN },
    )
    assert.match(ctx.gh.targets[200].comments[0].body, /^<!-- ai-autonomous-state -->\n### AI implementation: waiting for CI on pull request #70/)
    assert.deepEqual(
      ctx.gh.calls.filter((c) => c[0] === 'removeLabel'),
      [['removeLabel', 200, 'agent:needs-human'], ['removeLabel', 70, 'agent:needs-human']],
    )
    const [, , reply] = replies(ctx.gh, 70)[0]
    assert.ok(reply.includes('I reran the failed jobs (`ci-ok`, `e2e / smoke`). The CI gate decides again when they end.'))
    assert.ok(!reply.includes('/agent retry') && !reply.includes('/agent rerun'))
  })
})

test('red and flaky on the agent pull request in waiting-ci: the gate decides again; other phases stay as they are', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [] })
  await withContext({ targets: agentPulls('waiting-ci'), number: 70, issue: 200, answers: [answer] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    const issue = stateOf(ctx.gh.targets, 200)
    assert.equal(issue.phase, 'waiting-ci')
    assert.equal(issue.ciGate, undefined)
    assert.equal(issue.reruns.length, 1)
  })
  for (const phase of ['implementing', 'stopped', 'completed']) {
    const targets = agentPulls(phase)
    await withContext({ targets, number: 70, issue: 200, answers: [answer] }, async (ctx) => {
      await ciCheck(ctx.env, ctx.deps)
      assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs'), [['rerunFailedJobs', 900]], phase)
      assert.deepEqual(stateOf(ctx.gh.targets, 200), issueState({ phase }), phase)
      assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'removeLabel'), [], phase)
      const [, , reply] = replies(ctx.gh, 70)[0]
      assert.ok(!reply.includes('CI gate'), phase)
    })
  }
})

test('the issue state is read again: a phase that moved on while the check ran is left alone', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [] })
  await withContext({ targets: agentPulls('needs-human'), number: 70, issue: 200, answers: [answer] }, async (ctx) => {
    // A stop comes in while the rerun happens.
    const rerun = ctx.gh.rerunFailedJobs
    ctx.gh.rerunFailedJobs = async (id) => {
      await rerun(id)
      ctx.gh.targets[200].comments[0] = botComment(5, issueState({ phase: 'stopped' }))
    }
    await ciCheck(ctx.env, ctx.deps)
    assert.equal(stateOf(ctx.gh.targets, 200).phase, 'stopped')
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'removeLabel'), [])
  })
})

test('a marker that the issue state does not confirm is a pull request of a person', async () => {
  const targets = agentPulls('needs-human', { pr: 99 })
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [] })
  await withContext({ targets, number: 70, issue: 200, answers: [answer] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(stateOf(ctx.gh.targets, 200), issueState({ pr: 99 }))
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'removeLabel'), [])
  })
})

test('a rejected rerun: nothing changes, the reply says so, the cost stays, the reaction is confused', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [] })
  await withContext({ targets: agentPulls('needs-human'), number: 70, issue: 200, answers: [answer], rerunFails: true }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result, { ok: false, outcome: 'triaged', verdict: 'flaky', rerun: [] })
    assert.deepEqual(stateOf(ctx.gh.targets, 200), issueState())
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'removeLabel'), [])
    assert.equal(stateOf(ctx.gh.targets, 70).costs.length, 1)
    assert.deepEqual(stateOf(ctx.gh.targets, 70).ciChecks[0].runs, [])
    const [, , reply] = replies(ctx.gh, 70)[0]
    assert.ok(reply.includes('**What I did.** Nothing: GitHub did not rerun the failed jobs: Workflow is still running'))
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
  })
})

test('flaky with low confidence is an unknown cause: no rerun, and the reply says why', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'low', fixes: [] })
  await withContext({ targets: agentPulls('needs-human'), number: 70, issue: 200, answers: [answer] }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result.rerun, [])
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs'), [])
    assert.deepEqual(stateOf(ctx.gh.targets, 200), issueState())
    const [, , reply] = replies(ctx.gh, 70)[0]
    assert.ok(reply.includes('a flaky failure, not caused by the change (low confidence).'))
    assert.ok(reply.includes('**What I did.** Nothing: my confidence is low, so I do not rerun on a guess.'))
    assert.ok(reply.includes('If you think the failure is flaky, comment `/agent rerun`.'))
    // The record keeps what the model said.
    assert.equal(stateOf(ctx.gh.targets, 70).ciChecks[0].verdict, 'flaky')
  })
})

test('unknown: no rerun; on a pull request of a person the hint points to the Actions page', async () => {
  const answer = triage({ verdict: 'unknown', confidence: 'medium', fixes: [] })
  await withContext({ answers: [answer] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs'), [])
    const [, , reply] = replies(ctx.gh, 123)[0]
    assert.ok(reply.includes('I could not establish the cause (medium confidence).'))
    assert.ok(reply.includes('**What I did.** Nothing: I could not establish the cause, so I do not rerun.'))
    assert.ok(reply.includes('rerun the failed jobs from the Actions page.'))
  })
})

test('a failed check that is no Actions job cannot be rerun: nothing is rerun and the reply says so', async () => {
  const statuses = [{ context: 'external/scan', state: 'failure', target_url: 'https://scan.test/1' }]
  const answer = triage({ verdict: 'infra', confidence: 'high', fixes: [] })
  await withContext({ checkRuns: [checkRun('build', 'success')], statuses, answers: [answer] }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(result.rerun, [])
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs'), [])
    const [, , reply] = replies(ctx.gh, 123)[0]
    assert.ok(reply.includes('Nothing: the failed checks are not GitHub Actions jobs, so I cannot rerun them from here.'))
  })
})

// ------------------------------------------------------------------------------------------------ failures

test('a broken contract: the reply says so, the cost stays, the reaction is confused, the job fails', async () => {
  await withContext({ answers: ['No JSON here.'] }, async (ctx) => {
    await assert.rejects(ciCheck(ctx.env, ctx.deps), /holds no JSON|not valid JSON|no JSON/)
    const saved = stateOf(ctx.gh.targets, 123)
    assert.equal(saved.costs.length, 1)
    assert.equal(saved.ciChecks, undefined)
    const [, , reply] = replies(ctx.gh, 123)[0]
    assert.ok(reply.startsWith('@carol, I could not finish the CI check: '))
    assert.ok(reply.includes('this check cost $0.25'))
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs'), [])
  })
})

test('a change verdict without a fix breaks the contract', async () => {
  await withContext({ answers: [triage({ fixes: [] })] }, async (ctx) => {
    await assert.rejects(ciCheck(ctx.env, ctx.deps), /verdict is change, but fixes is empty/)
    const [, , reply] = replies(ctx.gh, 123)[0]
    assert.match(reply, /^@carol, I could not finish the CI check: .*fixes is empty/)
    assert.equal(stateOf(ctx.gh.targets, 123).costs.length, 1)
  })
})

test('a triager that exits at once without an answer still leaves its cost record', async () => {
  await withContext({}, async (ctx) => {
    ctx.deps.runAgent = async () => ({ exitCode: 1, eventsText: '', stderrTail: 'boom' })
    await assert.rejects(ciCheck(ctx.env, ctx.deps), /ci-triager exited with 1: boom/)
    assert.equal(stateOf(ctx.gh.targets, 123).costs.length, 1)
    assert.match(replies(ctx.gh, 123)[0][2], /I could not finish the CI check: ci-triager exited with 1: boom/)
  })
})

test('the cost is added to the state comment that exists, and the human part stays', async () => {
  const targets = { 123: { comments: [botComment(5, { ...state.emptyPullState(123), costs: [cost({ flow: 'review', usd: 2 })] }, 'The review.')] } }
  await withContext({ targets, answers: [triage()] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(writes(ctx.gh).map((c) => c[0]), ['updateIssueComment', 'createIssueComment'])
    assert.match(ctx.gh.targets[123].comments[0].body, /^<!-- ai-autonomous-state -->\nThe review\./)
    const saved = stateOf(ctx.gh.targets, 123)
    assert.deepEqual(saved.costs.map((c) => c.flow), ['review', 'ci-check'])
    assert.ok(replies(ctx.gh, 123)[0][2].includes('AI cost of this pull request so far: $2.25'))
  })
})

// ------------------------------------------------------------------------------------------------ dry run, secrets

test('dry run: the model runs, nothing is written, rerun, or reacted with, and the summary shows the reply', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [] })
  await withContext({
    targets: agentPulls('needs-human'), number: 70, issue: 200, answers: [answer], env: { AGENT_DRY_RUN: 'true' },
  }, async (ctx) => {
    const result = await ciCheck(ctx.env, ctx.deps)
    assert.equal(result.ok, true)
    assert.deepEqual(result.rerun, [900])
    assert.equal(ctx.runAgent.runs.length, 1)
    assert.deepEqual(ctx.gh.calls, [])
    assert.deepEqual(stateOf(ctx.gh.targets, 200), issueState())
    const summary = ctx.summary()
    assert.ok(summary.includes('## Dry run: reply to #70'))
    assert.ok(summary.includes('> **What I did.** I reran the failed jobs (`ci-ok`, `e2e / smoke`). The CI gate decides again'))
    assert.ok(summary.includes('Would rerun the failed jobs of workflow run(s) 900.'))
    assert.ok(summary.includes('Would put #200 back to `waiting-ci`'))
    assert.ok(ctx.out('reply.md').includes('this check cost $0.25'))
  })
})

test('dry run without a model call: the reply is in the summary and nothing is posted', async () => {
  await withContext({ checkRuns: [], env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(ctx.gh.calls, [])
    assert.ok(ctx.summary().includes('> @carol, no CI check is reported for #123'))
  })
})

test('no comment, state, or input file holds the token', async () => {
  const answer = triage({ verdict: 'flaky', confidence: 'medium', fixes: [] })
  await withContext({ targets: agentPulls('needs-human'), number: 70, issue: 200, answers: [answer] }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    for (const call of ctx.gh.calls) assert.ok(!JSON.stringify(call).includes(TOKEN), call[0])
    for (const name of ['ci-report.md', 'ci-check-input.md', 'reply.md']) assert.ok(!ctx.out(name).includes(TOKEN), name)
  })
})

// ------------------------------------------------------------------------------------------------ environment

test('a reaction that GitHub refuses does not fail the check', async () => {
  await withContext({ checkRuns: [] }, async (ctx) => {
    ctx.gh.addReaction = async () => {
      throw new Error('Resource not accessible')
    }
    assert.equal((await ciCheck(ctx.env, ctx.deps)).outcome, 'no-checks')
  })
})

test('main runs the command, and a missing variable is named', async () => {
  await withContext({ checkRuns: [] }, async (ctx) => {
    assert.equal((await main(ctx.env, ctx.deps)).outcome, 'no-checks')
    await assert.rejects(ciCheck({ ...ctx.env, AGENT_ACTOR: '' }, ctx.deps), /AGENT_ACTOR is not set/)
    await assert.rejects(ciCheck({ ...ctx.env, AGENT_COMMAND: '{' }, ctx.deps), /AGENT_COMMAND is not valid JSON/)
  })
})

test('a comment without an id gets no reactions', async () => {
  await withContext({ checkRuns: [], env: { AGENT_COMMENT_ID: '' } }, async (ctx) => {
    await ciCheck(ctx.env, ctx.deps)
    assert.deepEqual(reactions(ctx.gh), [])
  })
})
