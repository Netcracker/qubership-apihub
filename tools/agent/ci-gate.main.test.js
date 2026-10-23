'use strict'
// gate() of ci-gate.js over a fake GitHub client. The pure functions are in ci-gate.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { gate, main } = require('./ci-gate')

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
    assert.equal(saved.e2eReruns, undefined)
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
    assert.match(body, /I stopped\. The last attempt failed in the same way as the one before it/)
    assert.match(body, /\| 1 \| initial \| ci-red \| `[0-9a-f]{12}` \| Tried a guard\. \|/)
    assert.match(body, /\| 2 \| ci-fix \| ci-red \| `[0-9a-f]{12}` \| Tried a test\. \|/)
    assert.match(body, /<details><summary>CI report<\/summary>/)
    const note = ctx.gh.calls[3][2]
    assert.match(note, /^@dave, I stopped on #70\. The last attempt failed in the same way/)
    assert.match(
      note,
      /Look at `build`: `FAIL packages\/x\/a\.test\.ts \(3\.2 s\)`\. Comment `\/agent retry` with guidance/,
    )
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
    assert.match(ctx.gh.calls.at(-1)[2], /^@carol, I stopped on #70\. I used all 3 attempts, and CI is still red\./)
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
    assert.equal(saved.e2eReruns, 1)
    assert.equal(saved.phase, 'waiting-ci')
    assert.equal(saved.ciGate, undefined)
    assert.equal(saved.attempts[0].signature, undefined)
    assert.match(ctx.gh.store[0].body, /Only E2E jobs failed\. I reran them once/)
  })
})

test('the second red E2E result of the pull request is decided like any red result', async () => {
  const st = waitingState({ e2eReruns: 1 })
  await withContext({ gh: fakeGh(e2eRed({ st })) }, async (ctx) => {
    const result = await gate(ctx.env, ctx.deps)
    assert.equal(result.outcome, 'next-attempt')
    assert.ok(!ctx.gh.calls.some((c) => c[0] === 'rerunFailedJobs'))
    assert.equal(savedState(ctx.gh).e2eReruns, 1)
  })
})

test('an E2E job together with another failed job is no free rerun; a failed rerun call fails the job', async () => {
  const mixed = fakeGh(e2eRed({ checkRuns: [...e2eRed().checkRuns, checkRun('build', 'failure', { id: 33 })] }))
  await withContext({ gh: mixed }, async (ctx) => {
    assert.equal((await gate(ctx.env, ctx.deps)).outcome, 'next-attempt')
  })
  await withContext({ gh: fakeGh(e2eRed({ rerunFails: true })) }, async (ctx) => {
    await assert.rejects(gate(ctx.env, ctx.deps), /Workflow is still running/)
    assert.equal(savedState(ctx.gh).e2eReruns, undefined)
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
    assert.equal((await main(ctx.env, ctx.deps)).outcome, 'green')
  })
})
