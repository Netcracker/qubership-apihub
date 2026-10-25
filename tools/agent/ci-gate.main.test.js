'use strict'
// gate() of ci-gate.js over a fake GitHub client. The pure functions are in ci-gate.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { gate, main, rerunCommand } = require('./ci-gate')

const logged = []
log.setWriter((line) => logged.push(line))

const RUN = 'https://github.com/o/r/actions/runs/7'
const PAT = 'fake-pat-value-0123456789'
const SHA = '3f2a9c1d5b7e8f40a1b2c3d4e5f60718293a4b5c'
const BRANCH = 'bugfix/200-changelog-is-empty-for-a'

const issue = {
  number: 200,
  title: 'Changelog is empty for a package with no operations',
  type: { name: 'Bug' },
  user: { login: 'alice' },
  labels: [],
  updated_at: '2026-10-03T00:00:00Z',
}

const checkRun = (name, conclusion, extra = {}) => ({
  id: 11,
  name,
  status: 'completed',
  conclusion,
  html_url: `https://github.com/o/r/actions/runs/900/job/11`,
  details_url: `https://github.com/o/r/actions/runs/900/job/11`,
  app: { slug: 'github-actions' },
  ...extra,
})
const running = (name) => ({ ...checkRun(name, null), status: 'in_progress' })

/** The state of an issue whose pull request waits for CI after attempt 1. */
function waitingState(extra = {}) {
  return {
    schema: 1,
    kind: 'issue',
    number: 200,
    phase: 'waiting-ci',
    branch: BRANCH,
    pr: 70,
    playbook: 'bug-fix',
    attempts: [
      {
        n: 1, kind: 'initial', actor: 'carol', run: 'r1', result: 'pr-opened', rounds: 1, checks: 'green',
        selfReview: 'approve', notes: 'Tried a guard.', at: 't',
      },
    ],
    costs: [{ run: 'r1', flow: 'implement', role: 'implementer', usd: 1.5 }],
    ...extra,
  }
}

const botComment = (id, st) => ({ id, user: { login: 'github-actions[bot]' }, body: state.render('old', st) })

const failingLog = (test) => [
  '2026-10-23T09:12:01.1000000Z ##[group]Run pnpm exec nx run-many',
  `2026-10-23T09:12:02.2000000Z FAIL packages/x/${test}.test.ts (3.2 s)`,
  '2026-10-23T09:12:03.3000000Z Error: expected 1 to be 2',
  '2026-10-23T09:12:04.4000000Z ##[error]Process completed with exit code 1.',
].join('\n')

/**
 * A GitHub client over canned checks and logs. `logs` maps a job id to text or to an Error. Every write is recorded
 * in `calls`; `store` keeps the comments like GitHub does.
 */
function fakeGh({
  st = waitingState(),
  checkRuns = [checkRun('build', 'success')],
  statuses = [],
  noCiOk = false,
  logs = {},
  pull = {},
  rerunFails = false,
} = {}) {
  const calls = []
  const store = st ? [botComment(5, st)] : []
  let nextId = 1000
  return {
    calls,
    store,
    getIssue: async () => ({ ...issue }),
    listIssueComments: async () => store.map((c) => ({ ...c })),
    createIssueComment: async (n, body) => {
      const comment = { id: nextId++, user: { login: 'github-actions[bot]' }, body }
      store.push(comment)
      calls.push(['createIssueComment', n, body])
      return comment
    },
    updateIssueComment: async (id, body) => {
      store.find((c) => c.id === id).body = body
      calls.push(['updateIssueComment', id, body])
    },
    addLabels: async (n, labels) => calls.push(['addLabels', n, labels]),
    removeLabel: async (n, label) => calls.push(['removeLabel', n, label]),
    getPull: async (n) => ({
      number: n, state: 'open', draft: false, node_id: 'PR_70', head: { sha: SHA }, ...pull,
    }),
    listCheckRuns: async (sha) => {
      assert.equal(sha, SHA)
      // CI's verdict job exists in every real run; the gate waits until it does. A test that lists it decides itself.
      const hasVerdict = checkRuns.some((r) => r.name === 'ci-ok')
      return hasVerdict || noCiOk ? checkRuns : [...checkRuns, checkRun('ci-ok', 'success')]
    },
    getCombinedStatus: async () => ({ state: 'pending', statuses }),
    getJobLog: async (id) => {
      const entry = logs[id]
      if (entry instanceof Error) throw entry
      if (entry === undefined) throw new Error(`no log for job ${id}`)
      return entry
    },
    addReaction: async (id, content) => calls.push(['addReaction', id, content]),
    rerunFailedJobs: async (id) => {
      if (rerunFails) throw new Error('Workflow is still running')
      calls.push(['rerunFailedJobs', id])
    },
  }
}

function fakePatGh({ fails = false } = {}) {
  const calls = []
  return {
    calls,
    markPullReady: async (nodeId) => {
      if (fails) throw new Error('Resource not accessible by personal access token')
      calls.push(['markPullReady', nodeId])
    },
  }
}

function setup({ env = {}, ...options } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-gate-test-'))
  const fullEnv = {
    GITHUB_REPOSITORY: 'o/r',
    AGENT_NUMBER: '200',
    AGENT_PR: '70',
    AGENT_HEAD_SHA: SHA,
    AGENT_WORKFLOW_RUN_ID: '901',
    AGENT_RUN_URL: RUN,
    AGENT_OUT: path.join(dir, 'out'),
    AGENT_DRY_RUN: 'false',
    AGENT_PAT: PAT,
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    GITHUB_OUTPUT: path.join(dir, 'output'),
    ...env,
  }
  const gh = options.gh ?? fakeGh()
  const patGh = options.patGh ?? fakePatGh()
  const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '')
  return {
    env: fullEnv,
    deps: { gh, patGh },
    gh,
    patGh,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    summary: () => read(fullEnv.GITHUB_STEP_SUMMARY),
    outputs: () => read(fullEnv.GITHUB_OUTPUT),
    report: () => read(path.join(fullEnv.AGENT_OUT, 'ci-report.md')),
  }
}

async function withContext(options, fn) {
  logged.length = 0
  const ctx = setup(options)
  try {
    return await fn(ctx)
  } finally {
    ctx.cleanup()
  }
}

const savedState = (gh) => state.parse(gh.store.find((c) => state.parse(c.body)).body)
const red = (extra = {}) => ({
  checkRuns: [checkRun('build', 'failure'), checkRun('lint', 'success', { id: 12 })],
  logs: { 11: failingLog('a') },
  ...extra,
})

// ------------------------------------------------------------------------------------------------ waiting and guards

test('waiting: a running check run exits without a decision and writes nothing', async () => {
  const gh = fakeGh({ checkRuns: [checkRun('lint', 'success'), running('build')] })
  await withContext({ gh }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'waiting', reason: 'build (in_progress)' })
    assert.deepEqual(gh.calls, [])
    assert.equal(ctx.outputs(), 'outcome=waiting\nnext=\n')
    assert.match(ctx.summary(), /waits: build \(in_progress\)/)
  })
})

test('waiting: a pending status counts, and so does a commit without any check', async () => {
  const gh = fakeGh({ statuses: [{ context: 'license/cla', state: 'pending' }] })
  await withContext({ gh }, async (ctx) => {
    assert.equal(
      (await gate(ctx.env, ctx.deps)).reason,
      'build (success) is done, license/cla (pending)'.replace('build (success) is done, ', ''),
    )
  })
  await withContext({ gh: fakeGh({ checkRuns: [], statuses: [], noCiOk: true }) }, async (ctx) => {
    assert.deepEqual(await gate(ctx.env, ctx.deps), { outcome: 'waiting', reason: 'ci-ok (missing)' })
  })
})

test('the own jobs of the agent do not count: a running ci-gate or implement job is no reason to wait', async () => {
  const gh = fakeGh({ checkRuns: [checkRun('build', 'success'), running('ci-gate'), running('implement')] })
  await withContext({ gh }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
  })
})

test('nothing to decide: not waiting for CI, another pull request, a closed one, or a newer commit', async () => {
  const cases = [
    [fakeGh({ st: waitingState({ phase: 'implementing' }) }), {}, /phase 'implementing', not 'waiting-ci'/],
    [fakeGh({ st: waitingState({ pr: 71 }) }), {}, /names pull request #71, not #70/],
    [fakeGh({ pull: { state: 'closed' } }), {}, /pull request #70 is not open/],
    [fakeGh({ pull: { head: { sha: 'f'.repeat(40) } } }), {}, /a newer commit is on the branch/],
    [fakeGh(), { AGENT_PR: '99' }, /not #99|names pull request #70, not #99/],
  ]
  for (const [gh, env, pattern] of cases) {
    await withContext({ gh, env }, async (ctx) => {
      const result = await gate(ctx.env, ctx.deps)
      assert.equal(result.outcome, 'skipped')
      assert.match(result.reason, pattern)
      assert.deepEqual(gh.calls, [])
      assert.equal(ctx.outputs(), 'outcome=skipped\nnext=\n')
    })
  }
})

test('already decided for this commit: exits without writing, also when the checks are red', async () => {
  const decided = waitingState({ ciGate: { sha: SHA, decided: true, at: 't', run: 'r' } })
  await withContext({ gh: fakeGh({ st: decided, ...red() }) }, async (ctx) => {
    assert.deepEqual(await gate(ctx.env, ctx.deps), { outcome: 'already-decided' })
    assert.deepEqual(ctx.gh.calls, [])
  })
  // A decision for an older commit does not count.
  const older = waitingState({ ciGate: { sha: 'e'.repeat(40), decided: true, at: 't', run: 'r' } })
  await withContext({ gh: fakeGh({ st: older }) }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
  })
})

test('the gate needs a recorded actor; without the router facts it reads the pull request', async () => {
  const noActor = waitingState({ attempts: [{ n: 1, kind: 'initial', result: 'pr-opened' }] })
  await withContext({ gh: fakeGh({ st: noActor }) }, async (ctx) => {
    await assert.rejects(gate(ctx.env, ctx.deps), /Nobody is recorded as the person who asked/)
  })
  await withContext({ env: { AGENT_PR: '', AGENT_HEAD_SHA: '' } }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
  })
  await withContext({ env: { AGENT_NUMBER: '' } }, async (ctx) => {
    await assert.rejects(gate(ctx.env, ctx.deps), /AGENT_NUMBER/)
  })
})

// ------------------------------------------------------------------------------------------------ green

test('green: the pull request leaves draft, labels go to both, the state completes, the person is told', async () => {
  const gh = fakeGh({
    st: waitingState({ lastCiReport: 'old failure' }),
    checkRuns: [
      checkRun('build', 'success'),
      checkRun('Lint', 'skipped', { id: 12 }),
      checkRun('n', 'neutral', { id: 13 }),
    ],
    statuses: [{ context: 'license/cla', state: 'success' }],
    pull: { draft: true },
  })
  await withContext({ gh }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'green' })
    assert.equal(ctx.outputs(), 'outcome=green\nnext=\n')
    assert.deepEqual(ctx.patGh.calls, [['markPullReady', 'PR_70']])
    assert.deepEqual(gh.calls.map((c) => c.slice(0, 3)), [
      ['updateIssueComment', 5, gh.calls[0][2]],
      ['addLabels', 70, ['agent:completed', 'ai:l1-executor']],
      ['removeLabel', 70, 'agent:needs-human'],
      ['addLabels', 200, ['agent:completed']],
      ['removeLabel', 200, 'agent:needs-human'],
      ['createIssueComment', 200, '@carol, CI is green on #70. A person reviews and merges it.'],
    ])
    const saved = savedState(gh)
    assert.equal(saved.phase, 'completed')
    assert.equal(saved.attempts[0].result, 'ci-green')
    assert.equal(saved.lastCiReport, undefined)
    assert.deepEqual([saved.ciGate.sha, saved.ciGate.decided, saved.ciGate.run], [SHA, true, RUN])
    assert.equal(saved.attempts.length, 1)
    assert.match(gh.store[0].body, /### AI implementation: CI is green on pull request #70/)
  })
})

test('green on a pull request that is not a draft needs no PAT', async () => {
  await withContext({ env: { AGENT_PAT: '' } }, async (ctx) => {
    ctx.deps.patGh = undefined
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
    assert.equal(savedState(ctx.gh).phase, 'completed')
  })
})

test('green on a draft that cannot be taken out of draft: everything else is written, the job fails', async () => {
  const gh = fakeGh({ pull: { draft: true } })
  await withContext({ gh, patGh: fakePatGh({ fails: true }) }, async (ctx) => {
    await assert.rejects(gate(ctx.env, ctx.deps), /Resource not accessible by personal access token/)
    assert.equal(savedState(gh).phase, 'completed')
    assert.match(gh.store[0].body, /I could not mark the pull request ready for review: Resource not accessible/)
    assert.equal(gh.calls.at(-1)[0], 'createIssueComment')
  })
  await withContext({ gh: fakeGh({ pull: { draft: true } }), env: { AGENT_PAT: '' } }, async (ctx) => {
    ctx.deps.patGh = undefined
    await assert.rejects(gate(ctx.env, ctx.deps), /AGENT_PAT is not set/)
  })
})

// ------------------------------------------------------------------------------------------------ red

test('red with attempts left: the next attempt starts with the report in the state and next=implement', async () => {
  await withContext({ gh: fakeGh(red()) }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'next-attempt', next: 'implement' })
    assert.equal(ctx.outputs(), 'outcome=next-attempt\nnext=implement\n')
    assert.deepEqual(ctx.gh.calls.map((c) => c[0]), ['updateIssueComment'])
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'implementing')
    assert.equal(saved.implementing.kind, 'ci-fix')
    assert.deepEqual([saved.implementing.run, saved.implementing.actor], [RUN, 'carol'])
    assert.equal(saved.attempts.length, 1)
    assert.equal(saved.attempts[0].result, 'ci-red')
    assert.match(saved.attempts[0].signature, /^[0-9a-f]{12}$/)
    assert.match(saved.lastCiReport, /^# CI report for pull request #70\n/)
    assert.match(saved.lastCiReport, /FAIL packages\/x\/a\.test\.ts \(3\.2 s\)\nError: expected 1 to be 2/)
    assert.doesNotMatch(saved.lastCiReport, /2026-10-23T09/)
    assert.equal(saved.ciGate.sha, SHA)
    assert.equal(saved.e2eRerun, undefined)
    assert.match(ctx.gh.store[0].body, /Attempt 2 of 3 fixes it\./)
    assert.equal(ctx.report(), saved.lastCiReport)
    assert.deepEqual(saved.costs, [{ run: 'r1', flow: 'implement', role: 'implementer', usd: 1.5 }])
  })
})

test('red with the same failure as the attempt before: needs-human at once, with the hand-off', async () => {
  // Attempt 2 was a CI fix; attempt 1 failed with the signature that the same log gives again.
  let signature
  await withContext({ gh: fakeGh(red()) }, async (ctx) => {
    await gate(ctx.env, ctx.deps)
    signature = savedState(ctx.gh).attempts[0].signature
  })
  const st = waitingState({ attempts: [
    { n: 1, kind: 'initial', actor: 'carol', result: 'ci-red', signature, notes: 'Tried a guard.' },
    { n: 2, kind: 'ci-fix', actor: 'dave', result: 'pr-opened', notes: 'Tried a test.' },
  ] })
  await withContext({ gh: fakeGh(red({ st })) }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'stopped', reason: 'same-failure' })
    assert.equal(ctx.outputs(), 'outcome=stopped\nnext=\n')
    assert.deepEqual(ctx.gh.calls.map((c) => c.slice(0, 2)), [
      ['updateIssueComment', 5],
      ['addLabels', 200],
      ['addLabels', 70],
      ['createIssueComment', 200],
    ])
    assert.deepEqual(ctx.gh.calls[1][2], ['agent:needs-human'])
    const saved = savedState(ctx.gh)
    assert.deepEqual(
      [saved.phase, saved.attempts[1].result, saved.attempts[1].signature],
      ['needs-human', 'ci-red', signature],
    )
    assert.equal(saved.implementing, undefined)
    const body = ctx.gh.store[0].body
    assert.match(body, /\n- Failed checks: `build`\.\n- First error, in `build`: `FAIL packages\/x\/a\.test\.ts \(3\.2 s\)`\.\n/)
    assert.match(body, /- Why I stopped: The last attempt failed in the same way as the one before it/)
    assert.match(body, /What you can do:\n\n- If the failure is not caused by the change .*comment `\/agent rerun`/)
    assert.match(body, /\| 1 \| initial \| ci-red \| `[0-9a-f]{12}` \| Tried a guard\. \|/)
    assert.match(body, /\| 2 \| ci-fix \| ci-red \| `[0-9a-f]{12}` \| Tried a test\. \|/)
    assert.match(body, /<details><summary>CI report<\/summary>/)
    const note = ctx.gh.calls[3][2]
    assert.match(note, /^@dave, I stopped on #70: CI is red\.\n\n- Failed checks: `build`\.\n/)
    assert.match(note, /- First error, in `build`: `FAIL packages\/x\/a\.test\.ts \(3\.2 s\)`\.\n/)
    assert.match(note, /- Why I stopped: The last attempt failed in the same way/)
    assert.match(note, /- To try another fix, comment `\/agent retry` with guidance\.$/)
  })
})

test('red with the attempts spent: needs-human with the reason budget, also for a new failure', async () => {
  const st = waitingState({ attempts: [
    { n: 1, kind: 'initial', actor: 'carol', result: 'ci-red', signature: 'aaaaaaaaaaaa', notes: 'one' },
    { n: 2, kind: 'ci-fix', actor: 'carol', result: 'ci-red', signature: 'bbbbbbbbbbbb', notes: 'two' },
    { n: 3, kind: 'ci-fix', actor: 'carol', result: 'pr-opened', notes: 'three' },
  ] })
  await withContext({ gh: fakeGh(red({ st })) }, async (ctx) => {
    assert.deepEqual(await gate(ctx.env, ctx.deps), { outcome: 'stopped', reason: 'budget' })
    assert.match(ctx.gh.calls.at(-1)[2], /^@carol, I stopped on #70: CI is red\.\n[\s\S]*- Why I stopped: I used all 3 attempts, and CI is still red\./)
    assert.equal(savedState(ctx.gh).attempts.length, 3)
  })
  // AGENT_MAX_ATTEMPTS counts: with 2, the second attempt was the last.
  const two = waitingState({ attempts: [
    { n: 1, kind: 'initial', actor: 'carol', result: 'ci-red', signature: 'aaaaaaaaaaaa', notes: 'one' },
    { n: 2, kind: 'ci-fix', actor: 'carol', result: 'pr-opened', notes: 'two' },
  ] })
  await withContext({ gh: fakeGh(red({ st: two })), env: { AGENT_MAX_ATTEMPTS: '2' } }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).reason, 'budget')
    assert.match(ctx.gh.store[0].body, /I used all 2 attempts/)
  })
})

test('red: a failed status (the CLA check) has no log, and the log of a job that is gone is noted', async () => {
  const gh = fakeGh({
    checkRuns: [
      checkRun('build', 'failure'),
      checkRun('docs', 'failure', { id: 12, details_url: 'https://github.com/o/r/actions/runs/900/job/12' }),
    ],
    statuses: [{ context: 'license/cla', state: 'failure', target_url: 'https://cla.test/1' }],
    logs: { 11: failingLog('a'), 12: new Error('GitHub GET logs failed with 410: Gone') },
  })
  await withContext({ gh }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'next-attempt')
    const report = savedState(gh).lastCiReport
    assert.match(report, /- Failed checks: 3\n/)
    assert.match(report, /- `license\/cla`: failure \(https:\/\/cla\.test\/1\)/)
    assert.match(
      report,
      /## Errors of `docs`\n\nThe log of this job is not available: GitHub GET logs failed with 410: Gone\n/,
    )
    assert.match(
      report,
      /## Errors of `build`\n\n```text\n##\[group\]Run pnpm exec nx run-many\nFAIL packages\/x\/a\.test\.ts/,
    )
    assert.ok(logged.some((l) => l.startsWith('::warning::The log of \'docs\' could not be read')))
  })
})

test('red: the report of the state is capped at 12,000 characters and the logs at 400 lines', async () => {
  const big = Array.from({ length: 500 }, (_, i) => `Error: problem ${i} ${'z'.repeat(150)}`).join('\n')
  const checkRuns = ['a', 'b', 'c', 'd'].map((name, i) => checkRun(name, 'failure', {
    id: 20 + i, details_url: `https://github.com/o/r/actions/runs/900/job/${20 + i}`,
  }))
  const logs = { 20: big, 21: big, 22: big, 23: big }
  await withContext({ gh: fakeGh({ checkRuns, logs }) }, async (ctx) => {
    await gate(ctx.env, ctx.deps)
    const report = savedState(ctx.gh).lastCiReport
    assert.ok(report.length <= 12000, String(report.length))
    assert.ok(ctx.report().length <= 12000)
  })
})

// ------------------------------------------------------------------------------------------------ E2E rerun

const e2eRed = (extra = {}) => ({
  checkRuns: [
    checkRun('E2E tests (kind)', 'failure', { id: 31, details_url: 'https://github.com/o/r/actions/runs/902/job/31' }),
    checkRun('build', 'success', { id: 32 }),
  ],
  logs: { 31: failingLog('e2e') },
  ...extra,
})

test('only E2E jobs failed: their run is rerun once and the decision is left for the rerun', async () => {
  await withContext({ gh: fakeGh(e2eRed()) }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'rerun' })
    assert.equal(ctx.outputs(), 'outcome=rerun\nnext=\n')
    assert.deepEqual(ctx.gh.calls.map((c) => c.slice(0, 2)), [['rerunFailedJobs', 902], ['updateIssueComment', 5]])
    const saved = savedState(ctx.gh)
    assert.deepEqual(saved.e2eRerun, { sha: SHA, count: 1 })
    assert.equal(saved.phase, 'waiting-ci')
    assert.equal(saved.ciGate, undefined)
    assert.equal(saved.attempts[0].signature, undefined)
    assert.match(ctx.gh.store[0].body, /Only E2E jobs failed\. I reran them once/)
  })
})

test('the verdict check ci-ok fails with E2E: the E2E jobs are still rerun once', async () => {
  const checkRuns = [...e2eRed().checkRuns, checkRun('ci-ok', 'failure', { id: 34 })]
  await withContext({ gh: fakeGh(e2eRed({ checkRuns })) }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'rerun' })
    assert.deepEqual(ctx.gh.calls.map((c) => c.slice(0, 2)), [['rerunFailedJobs', 902], ['rerunFailedJobs', 900],
      ['updateIssueComment', 5]])
    assert.deepEqual(savedState(ctx.gh).e2eRerun, { sha: SHA, count: 1 })
  })
})

test('the second red E2E result of the same commit is decided like any red result', async () => {
  const st = waitingState({ e2eRerun: { sha: SHA, count: 1 } })
  await withContext({ gh: fakeGh(e2eRed({ st })) }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.equal(result.outcome, 'next-attempt')
    assert.ok(!ctx.gh.calls.some((c) => c[0] === 'rerunFailedJobs'))
    assert.deepEqual(savedState(ctx.gh).e2eRerun, { sha: SHA, count: 1 })
  })
})

test('a new commit gets its own free rerun, and the counter of the old state is dropped', async () => {
  const st = waitingState({ e2eRerun: { sha: 'oldsha', count: 1 }, e2eReruns: 1 })
  await withContext({ gh: fakeGh(e2eRed({ st })) }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'rerun')
    const saved = savedState(ctx.gh)
    assert.deepEqual(saved.e2eRerun, { sha: SHA, count: 1 })
    assert.equal(saved.e2eReruns, undefined)
  })
})

test('an E2E job together with another failed job is no free rerun; a failed rerun call fails the job', async () => {
  const mixed = fakeGh(e2eRed({ checkRuns: [...e2eRed().checkRuns, checkRun('build', 'failure', { id: 33 })] }))
  await withContext({ gh: mixed }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'next-attempt')
  })
  await withContext({ gh: fakeGh(e2eRed({ rerunFails: true })) }, async (ctx) => {
    await assert.rejects(gate(ctx.env, ctx.deps), /Workflow is still running/)
    assert.equal(savedState(ctx.gh).e2eRerun, undefined)
  })
})

test('an E2E job without a run link is rerun through the workflow run that started the gate', async () => {
  const outside = { id: 41, details_url: 'https://elsewhere.test/1', app: { slug: 'other' } }
  const checkRuns = [checkRun('e2e', 'failure', outside)]
  await withContext({ gh: fakeGh({ checkRuns }) }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'rerun')
    assert.deepEqual(ctx.gh.calls[0], ['rerunFailedJobs', 901])
  })
  await withContext({ gh: fakeGh({ checkRuns }), env: { AGENT_WORKFLOW_RUN_ID: '' } }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'next-attempt')
  })
})

// ------------------------------------------------------------------------------------------------ dry run

test('dry run, red: no write to GitHub, no next attempt, and the decision in the job summary', async () => {
  await withContext({ gh: fakeGh(red()), env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.deepEqual(result, { outcome: 'next-attempt' })
    assert.deepEqual(ctx.gh.calls, [])
    assert.equal(ctx.outputs(), 'outcome=next-attempt\nnext=\n')
    assert.match(ctx.summary(), /^## Dry run: CI gate for #200\n/)
    assert.match(ctx.summary(), /a dry run starts none/)
    assert.match(ctx.summary(), /"phase": "implementing"/)
  })
})

test('dry run, green and stop: the labels, the comment, and the state are in the summary only', async () => {
  await withContext({ gh: fakeGh({ pull: { draft: true } }), env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
    assert.deepEqual(ctx.gh.calls, [])
    assert.deepEqual(ctx.patGh.calls, [])
    assert.match(ctx.summary(), /pull request leaves draft/)
    assert.match(ctx.summary(), /labels on #70: add agent:completed, ai:l1-executor; remove agent:needs-human/)
    assert.match(ctx.summary(), /> @carol, CI is green on #70\./)
    assert.match(ctx.summary(), /"phase": "completed"/)
  })
  const spent = waitingState({
    attempts: [
      { n: 1, kind: 'initial', actor: 'carol', result: 'ci-red', signature: 'aaaaaaaaaaaa' },
      { n: 2, kind: 'ci-fix', actor: 'carol', result: 'pr-opened' },
      { n: 3, kind: 'ci-fix', actor: 'carol', result: 'pr-opened' },
    ],
  })
  await withContext({ gh: fakeGh(red({ st: spent })), env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    assert.deepEqual(await gate(ctx.env, ctx.deps), { outcome: 'stopped', reason: 'budget' })
    assert.deepEqual(ctx.gh.calls, [])
    assert.match(ctx.summary(), /labels on #70 and #200: add agent:needs-human/)
  })
  await withContext({ gh: fakeGh(e2eRed()), env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'rerun')
    assert.deepEqual(ctx.gh.calls, [])
    assert.match(ctx.summary(), /Would rerun the failed jobs of workflow run\(s\) 902/)
  })
})

test('no token reaches a comment, the state, the summary, a log line, or the report', async () => {
  await withContext({ gh: fakeGh(red({ pull: { draft: true } })) }, async (ctx) => {
    await gate(ctx.env, ctx.deps)
    assert.ok(!JSON.stringify([ctx.gh.calls, logged, ctx.summary(), ctx.report()]).includes(PAT))
  })
})

test('main runs the gate', async () => {
  await withContext({}, async (ctx) => {
    assert.equal((await main([], ctx.env, ctx.deps)).outcome, 'green')
  })
})

// ------------------------------------------------------------------------------------------------ superseded

/** A client whose pull request gets a newer head after `afterCalls` reads, as if someone pushed during the run. */
function pushedDuringTheRun(gh, afterCalls = 1) {
  const original = gh.getPull
  let reads = 0
  gh.getPull = async (n) => {
    reads += 1
    const pull = await original(n)
    return reads > afterCalls ? { ...pull, head: { sha: 'b'.repeat(40) } } : pull
  }
  return gh
}

test('superseded: a push during a green decision writes nothing and exits', async () => {
  const gh = pushedDuringTheRun(fakeGh())
  await withContext({ gh }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.equal(result.outcome, 'superseded')
    assert.match(result.reason, /a newer commit \(bbbbbbbbbbbb\) is on the branch/)
    assert.deepEqual(gh.calls, [])
    assert.deepEqual(ctx.patGh.calls, [])
    assert.equal(ctx.outputs(), `outcome=superseded\nnext=\n`)
    assert.match(ctx.summary(), /wrote nothing for `3f2a9c1d5b7e`/)
    // The state still waits for CI, so the newer commit gets its own gate run.
    assert.equal(savedState(gh).phase, 'waiting-ci')
  })
})

test('superseded: a push while the logs are read writes nothing: no rerun, no stop, no next attempt', async () => {
  for (const checkRuns of [
    [checkRun('build', 'failure'), checkRun('lint', 'success', { id: 12 })],
    [checkRun('e2e tests', 'failure')],
  ]) {
    const gh = pushedDuringTheRun(fakeGh({ checkRuns, logs: { 11: failingLog('a') } }))
    await withContext({ gh }, async (ctx) => {
      const result = await gate(ctx.env, ctx.deps)
      assert.equal(result.outcome, 'superseded')
      assert.equal(result.next, undefined)
      assert.deepEqual(gh.calls, [])
      assert.equal(ctx.outputs(), `outcome=superseded\nnext=\n`)
      assert.equal(savedState(gh).phase, 'waiting-ci')
    })
  }
})

test('superseded: in dry-run the check reads only, and the decision is the same', async () => {
  const gh = pushedDuringTheRun(fakeGh())
  await withContext({ gh, env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'superseded')
    assert.deepEqual(gh.calls, [])
  })
})

test('an unchanged head is not superseded: the decision is written as before', async () => {
  const gh = fakeGh()
  await withContext({ gh }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
    assert.equal(savedState(gh).phase, 'completed')
  })
})

// ------------------------------------------------------------------------------------------------ state changed

/** Rewrites the state comment, as `/agent stop` or a chat answer does while the gate reads checks and logs. */
function changeState(gh, change) {
  const comment = gh.store.find((c) => state.parse(c.body))
  comment.body = state.render('changed by someone else', { ...state.parse(comment.body), ...change })
}

/** Calls `fn` once when `gh[method]` runs first, before the original does its work. */
function onFirstCall(gh, method, fn) {
  const original = gh[method]
  let done = false
  gh[method] = async (...args) => {
    if (!done) {
      done = true
      fn()
    }
    return original(...args)
  }
  return gh
}

test('state changed: a stop while the checks are collected is not overwritten by a green decision', async () => {
  const gh = onFirstCall(fakeGh(), 'getCombinedStatus', () => changeState(gh, { phase: 'stopped', stoppedBy: 'dave' }))
  await withContext({ gh }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.equal(result.outcome, 'state-changed')
    assert.match(result.reason, /phase 'stopped' now, not 'waiting-ci'/)
    assert.equal(result.next, undefined)
    assert.deepEqual(gh.calls, [])
    assert.deepEqual(ctx.patGh.calls, [])
    assert.equal(ctx.outputs(), 'outcome=state-changed\nnext=\n')
    assert.match(ctx.summary(), /wrote nothing for `3f2a9c1d5b7e`: the issue is in the phase 'stopped'/)
    assert.ok(logged.some((line) => line.includes('exit: state changed') && line.includes('stopped')))
    assert.equal(savedState(gh).phase, 'stopped')
  })
})

test('state changed: a stop while the logs are read never returns next=implement and writes nothing', async () => {
  for (const checkRuns of [
    [checkRun('build', 'failure'), checkRun('lint', 'success', { id: 12 })],
    [checkRun('e2e tests', 'failure')],
  ]) {
    const gh = fakeGh({ checkRuns, logs: { 11: failingLog('a') } })
    onFirstCall(gh, 'getJobLog', () => changeState(gh, { phase: 'stopped' }))
    await withContext({ gh }, async (ctx) => {
      const result = await gate(ctx.env, ctx.deps)
      assert.equal(result.outcome, 'state-changed')
      assert.equal(result.next, undefined)
      assert.deepEqual(gh.calls, [])
      assert.equal(ctx.outputs(), 'outcome=state-changed\nnext=\n')
      assert.equal(savedState(gh).phase, 'stopped')
    })
  }
})

test('state changed: the state comment is gone or holds no phase, and the dry run decides the same', async () => {
  const gh = onFirstCall(fakeGh(), 'getCombinedStatus', () => changeState(gh, { phase: null }))
  await withContext({ gh, env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.equal(result.outcome, 'state-changed')
    assert.match(result.reason, /phase 'none' now/)
    assert.deepEqual(gh.calls, [])
  })
})

test('an unchanged phase is not a change: the decision is written as before', async () => {
  const gh = onFirstCall(fakeGh(), 'getCombinedStatus', () => changeState(gh, { reason: 'same phase' }))
  await withContext({ gh }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'green')
    assert.equal(savedState(gh).phase, 'completed')
  })
})

test('costs: a cost record that chat wrote while the gate ran survives the gate\'s write', async () => {
  const added = { run: 'r2', flow: 'chat', role: 'assistant', at: '2026-10-23T10:00:00Z', usd: 0.2 }
  for (const options of [{}, red()]) {
    const gh = fakeGh(options)
    onFirstCall(gh, 'getCombinedStatus', () => {
      const current = savedState(gh)
      changeState(gh, { costs: [...current.costs, added] })
    })
    await withContext({ gh }, async (ctx) => {
      const result = await gate(ctx.env, ctx.deps)
      assert.ok(['green', 'next-attempt'].includes(result.outcome), result.outcome)
      const saved = savedState(gh)
      assert.deepEqual(saved.costs.map((c) => c.run), ['r1', 'r2'])
      assert.ok(saved.costs.some((c) => c.usd === 0.2))
    })
  }
})

// ------------------------------------------------------------------------------------------------ /agent rerun

const ASKER = 'erin'
const COMMENT = 555
/** The environment of the `rerun` job for a comment on the issue; `AGENT_PR` is set for a comment on the pull request. */
const rerunEnv = (env = {}) => ({
  AGENT_PR: '',
  AGENT_HEAD_SHA: '',
  AGENT_WORKFLOW_RUN_ID: '',
  AGENT_ACTOR: ASKER,
  AGENT_COMMENT_ID: String(COMMENT),
  ...env,
})
const handedOff = (extra = {}) =>
  waitingState({ phase: 'needs-human', ciGate: { sha: SHA, decided: true, at: 't', run: 'r' }, ...extra })
const callNames = (gh) => gh.calls.map((c) => c[0])
const reactions = (gh) => gh.calls.filter((c) => c[0] === 'addReaction').map((c) => c[2])
const replies = (gh) => gh.calls.filter((c) => c[0] === 'createIssueComment')

test('rerun: the failed checks run again, the state waits for CI, the label goes, the person gets one reply', async () => {
  const labelled = handedOff({
    implementing: { run: 'old', actor: 'carol', at: '2020-01-01T00:00:00Z', kind: 'ci-fix' },
  })
  await withContext({ gh: fakeGh(e2eRed({ st: labelled })), env: rerunEnv() }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [true, 'rerun'])
    // The rerun comes first: a rejected rerun must leave the state and the label as they are.
    assert.deepEqual(ctx.gh.calls.map((c) => c.slice(0, 2)), [
      ['addReaction', COMMENT],
      ['rerunFailedJobs', 902],
      ['updateIssueComment', 5],
      ['removeLabel', 200],
      ['removeLabel', 70],
      ['createIssueComment', 200],
      ['addReaction', COMMENT],
    ])
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
    assert.deepEqual(
      ctx.gh.calls.filter((c) => c[0] === 'removeLabel').map((c) => c[2]),
      ['agent:needs-human', 'agent:needs-human'],
    )
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'waiting-ci')
    assert.equal(saved.ciGate, undefined)
    assert.equal(saved.implementing, undefined)
    assert.equal(saved.attempts.length, 1)
    assert.deepEqual(saved.reruns, [{ at: saved.reruns[0].at, actor: ASKER, sha: SHA, runs: [902], run: RUN }])
    assert.match(saved.reruns[0].at, /^\d{4}-\d\d-\d\dT/)
    assert.deepEqual(saved.costs, labelled.costs)
    assert.match(ctx.gh.store[0].body, /^<!-- ai-autonomous-state -->\n### AI implementation: waiting for CI on pull request #70/)
    assert.equal(
      replies(ctx.gh)[0][2],
      '@erin, I reran the failed checks of #70 (`E2E tests (kind)`) on 3f2a9c1d5b7e. ' +
        'No new attempt and no model call: the CI gate decides when they end.',
    )
    assert.equal(ctx.outputs(), '')
  })
})

test('rerun on the pull request of the agent: the reply goes to the pull request, the state to the issue', async () => {
  await withContext({ gh: fakeGh(e2eRed({ st: handedOff() })), env: rerunEnv({ AGENT_PR: '70' }) }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'rerun')
    assert.equal(replies(ctx.gh)[0][1], 70)
    assert.equal(savedState(ctx.gh).phase, 'waiting-ci')
  })
})

test('rerun appends to the earlier reruns and keeps the attempts', async () => {
  const earlier = [{ at: 'a', actor: 'bob', sha: 'x', runs: [1], run: 'u' }]
  await withContext({ gh: fakeGh(e2eRed({ st: handedOff({ reruns: earlier }) })), env: rerunEnv() }, async (ctx) => {
    await rerunCommand(ctx.env, ctx.deps)
    const saved = savedState(ctx.gh)
    assert.equal(saved.reruns.length, 2)
    assert.deepEqual(saved.reruns[0], earlier[0])
    assert.equal(saved.attempts.length, 1)
  })
})

test('rerun: a failed verdict check is rerun with the others, and a status that cannot be rerun is named', async () => {
  const checkRuns = [...e2eRed().checkRuns, checkRun('ci-ok', 'failure', { id: 34 })]
  const statuses = [{ context: 'license/cla', state: 'failure' }]
  await withContext({ gh: fakeGh(e2eRed({ st: handedOff(), checkRuns, statuses })), env: rerunEnv() }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'rerun')
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'rerunFailedJobs').map((c) => c[1]), [902, 900])
    assert.match(replies(ctx.gh)[0][2], /I cannot rerun `license\/cla` from here\.$/)
  })
})

test('rerun refuses without a pull request of the agent: no state, no branch, or another pull request', async () => {
  const cases = [
    { st: null, env: {} },
    { st: waitingState({ pr: undefined }), env: {} },
    { st: waitingState({ branch: undefined }), env: {} },
    { st: waitingState({ pr: 71 }), env: { AGENT_PR: '70' } },
  ]
  for (const { st, env } of cases) {
    await withContext({ gh: fakeGh({ st }), env: rerunEnv(env) }, async (ctx) => {
      const result = await rerunCommand(ctx.env, ctx.deps)
      assert.deepEqual([result.ok, result.outcome], [false, 'refused'])
      assert.deepEqual(callNames(ctx.gh), ['addReaction', 'createIssueComment', 'addReaction'])
      assert.equal(replies(ctx.gh)[0][2], '@erin, there is no pull request of the agent to rerun CI for.')
      assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
    })
  }
})

test('rerun refuses while an attempt runs, but not when its record is older than 120 minutes', async () => {
  const young = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const old = new Date(Date.now() - 130 * 60 * 1000).toISOString()
  const running = (at) =>
    waitingState({ phase: 'implementing', implementing: { run: 'https://x/run/9', actor: 'carol', at } })
  await withContext({ gh: fakeGh(e2eRed({ st: running(young) })), env: rerunEnv() }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'refused')
    assert.equal(replies(ctx.gh)[0][2], '@erin, an implementation is already running: https://x/run/9.')
    assert.ok(!callNames(ctx.gh).includes('updateIssueComment'))
    assert.ok(!callNames(ctx.gh).includes('rerunFailedJobs'))
  })
  await withContext({ gh: fakeGh(e2eRed({ st: running(old) })), env: rerunEnv() }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'rerun')
    assert.equal(savedState(ctx.gh).phase, 'waiting-ci')
  })
})

test('rerun refuses a stopped piece of work and a pull request that is not open', async () => {
  await withContext({ gh: fakeGh({ st: waitingState({ phase: 'stopped' }) }), env: rerunEnv() }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'refused')
    assert.equal(replies(ctx.gh)[0][2], '@erin, the work is stopped; comment `/agent retry` to start again.')
  })
  await withContext({ gh: fakeGh({ st: handedOff(), pull: { state: 'closed' } }), env: rerunEnv() }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'refused')
    assert.match(
      replies(ctx.gh)[0][2],
      /^@erin, pull request #70 is not open, so there is nothing to rerun\. Comment `\/agent retry`/,
    )
    assert.ok(!callNames(ctx.gh).includes('updateIssueComment'))
    assert.equal(savedState(ctx.gh).phase, 'needs-human')
  })
})

test('rerun refuses when only statuses failed: the state stays as it is', async () => {
  const statuses = [{ context: 'license/cla', state: 'failure' }]
  await withContext({ gh: fakeGh({ st: handedOff(), statuses }), env: rerunEnv() }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [false, 'refused'])
    assert.deepEqual(callNames(ctx.gh), ['addReaction', 'createIssueComment', 'addReaction'])
    assert.match(
      replies(ctx.gh)[0][2],
      /^@erin, the failed checks of #70 on 3f2a9c1d5b7e \(`license\/cla`\) cannot be rerun from here/,
    )
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
    assert.equal(savedState(ctx.gh).phase, 'needs-human')
  })
})

test('rerun while CI still runs: the state waits for the gate, nothing is rerun', async () => {
  const checkRuns = [checkRun('lint', 'success'), running('build')]
  await withContext({ gh: fakeGh({ st: handedOff(), checkRuns }), env: rerunEnv() }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [true, 'pending'])
    assert.ok(!callNames(ctx.gh).includes('rerunFailedJobs'))
    const saved = savedState(ctx.gh)
    assert.deepEqual([saved.phase, saved.ciGate, saved.reruns[0].runs], ['waiting-ci', undefined, []])
    assert.equal(
      replies(ctx.gh)[0][2],
      '@erin, CI still runs on #70 at 3f2a9c1d5b7e (`build` in_progress). ' +
        'There is nothing to rerun yet; the CI gate decides when it ends.',
    )
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('rerun when CI is green: the green path of the gate runs, and there is one comment', async () => {
  await withContext({ gh: fakeGh({ st: handedOff(), pull: { draft: true } }), env: rerunEnv() }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [true, 'green'])
    assert.deepEqual(ctx.patGh.calls, [['markPullReady', 'PR_70']])
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'completed')
    assert.equal(saved.reruns.length, 1)
    assert.equal(saved.attempts[0].result, 'ci-green')
    assert.deepEqual(
      ctx.gh.calls.filter((c) => c[0] === 'addLabels').map((c) => [c[1], c[2]]),
      [[70, ['agent:completed', 'ai:l1-executor']], [200, ['agent:completed']]],
    )
    assert.equal(replies(ctx.gh).length, 1)
    assert.equal(replies(ctx.gh)[0][2], '@erin, CI is green on #70. A person reviews and merges it.')
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('rerun: a stop that came in after the first read ends the rerun without a write', async () => {
  const gh = fakeGh(e2eRed({ st: handedOff() }))
  const original = gh.listIssueComments
  let reads = 0
  gh.listIssueComments = async (n) => {
    reads += 1
    const comments = await original(n)
    if (reads === 1) return comments
    return comments.map((c) => ({ ...c, body: state.render('stopped', { ...handedOff(), phase: 'stopped' }) }))
  }
  await withContext({ gh, env: rerunEnv() }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [false, 'refused'])
    assert.ok(!callNames(gh).includes('updateIssueComment'))
    assert.ok(!callNames(gh).includes('rerunFailedJobs'))
    assert.match(replies(gh)[0][2], /the work is stopped/)
  })
})

test('rerun: a rejected rerun changes nothing, keeps the hand-off label, and says why', async () => {
  await withContext({ gh: fakeGh(e2eRed({ st: handedOff(), rerunFails: true })), env: rerunEnv() }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [false, 'refused'])
    assert.ok(!callNames(ctx.gh).includes('updateIssueComment'))
    assert.ok(!callNames(ctx.gh).includes('removeLabel'))
    assert.equal(savedState(ctx.gh).phase, 'needs-human')
    assert.match(
      replies(ctx.gh)[0][2],
      /^@erin, GitHub did not rerun the failed checks of #70: .*Workflow is still running.* Nothing changed\./,
    )
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
  })
})

test('rerun when CI is green, asked on the pull request: the green comment goes to the pull request', async () => {
  const env = rerunEnv({ AGENT_PR: '70' })
  await withContext({ gh: fakeGh({ st: handedOff(), pull: { draft: true } }), env }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'green')
    assert.deepEqual(replies(ctx.gh).map((c) => c[1]), [70])
    assert.equal(savedState(ctx.gh).phase, 'completed')
  })
})

test('rerun in dry-run: no write, no rerun, no reaction; the summary says what would happen', async () => {
  const dry = rerunEnv({ AGENT_DRY_RUN: 'true' })
  await withContext({ gh: fakeGh(e2eRed({ st: handedOff() })), env: dry }, async (ctx) => {
    const result = await rerunCommand(ctx.env, ctx.deps)
    assert.deepEqual([result.ok, result.outcome], [true, 'rerun'])
    assert.deepEqual(ctx.gh.calls, [])
    assert.match(ctx.summary(), /^## Dry run: rerun CI for #200\n/)
    assert.match(ctx.summary(), /Would rerun the failed jobs of workflow run\(s\) 902\./)
    assert.match(ctx.summary(), /"phase": "waiting-ci"/)
    assert.match(ctx.summary(), /> @erin, I reran the failed checks of #70/)
  })
  await withContext({ gh: fakeGh({ st: handedOff() }), env: dry }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'green')
    assert.deepEqual(ctx.gh.calls, [])
    assert.deepEqual(ctx.patGh.calls, [])
    assert.match(ctx.summary(), /CI is green: the green path of the CI gate would run\./)
    assert.match(ctx.summary(), /> @erin, CI is green on #70\./)
  })
  await withContext({ gh: fakeGh({ st: null }), env: dry }, async (ctx) => {
    assert.equal((await rerunCommand(ctx.env, ctx.deps)).outcome, 'refused')
    assert.deepEqual(ctx.gh.calls, [])
    assert.match(ctx.summary(), /> @erin, there is no pull request of the agent to rerun CI for\./)
  })
})

test('main dispatches the rerun mode and refuses an unknown one; no token reaches a comment', async () => {
  await withContext({ gh: fakeGh(e2eRed({ st: handedOff() })), env: rerunEnv() }, async (ctx) => {
    assert.equal((await main(['rerun'], ctx.env, ctx.deps)).outcome, 'rerun')
    assert.ok(!JSON.stringify([ctx.gh.calls, logged, ctx.summary()]).includes(PAT))
    await assert.rejects(main(['bogus'], ctx.env, ctx.deps), /Usage: node tools\/agent\/ci-gate\.js \[rerun\]/)
  })
})
