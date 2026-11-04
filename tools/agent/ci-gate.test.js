'use strict'
// Pure functions of ci-gate.js. gate() is in ci-gate.main.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const log = require('./lib/log')
const {
  isOwnCheck,
  relevantChecks,
  actionsIds,
  pendingChecks,
  failedChecks,
  allGreen,
  isE2eOnly,
  isCancelledOnly,
  stillRunning,
  e2eRerunLeft,
  isErrorLine,
  extractErrors,
  capTotalLines,
  normalizeLine,
  failureSignature,
  firstError,
  checkNames,
  failureLines,
  reportFacts,
  rerunRefusal,
  rerunRequestState,
  buildReport,
  lastSignature,
  countedAttempts,
  stopDecision,
  greenState,
  stoppedState,
  nextAttemptState,
  rerunState,
  gateGuard,
  rerunTargets,
  attemptsTable,
  renderGreen,
  renderStopped,
  renderNextAttempt,
  renderRerun,
  greenComment,
  stopComment,
} = require('./ci-gate')

log.setWriter(() => {})

const run = (name, conclusion, extra = {}) => ({
  id: 11,
  name,
  status: 'completed',
  conclusion,
  html_url: `https://github.com/o/r/actions/runs/900/job/11`,
  details_url: `https://github.com/o/r/actions/runs/900/job/11`,
  app: { slug: 'github-actions' },
  ...extra,
})

// ------------------------------------------------------------------------------------------------ the checks

test('isOwnCheck: the job names of the agent workflows, any case, and a workflow name when the API gives one', () => {
  for (const name of ['route', 'review', 'analyze', 'implement', 'ci-gate', 'levels', 'Route', ' publish'.trim()]) {
    assert.equal(isOwnCheck({ name }), name !== 'publish', name)
  }
  assert.equal(isOwnCheck({ name: 'build', workflow_name: 'AI Autonomous: Agent' }), true)
  assert.equal(isOwnCheck({ name: 'build', check_suite: { workflow_name: 'AI Autonomous: Execution levels' } }), true)
  assert.equal(isOwnCheck({ name: 'build', workflow_name: 'CI' }), false)
  assert.equal(isOwnCheck({ name: 'Lint: Code base / lint' }), false)
  assert.equal(isOwnCheck(undefined), false)
})

test('relevantChecks drops only the own checks', () => {
  const runs = [run('route', 'success'), run('build', 'failure'), run('ci-gate', 'success'), run('e2e', 'success')]
  assert.deepEqual(relevantChecks(runs).map((r) => r.name), ['build', 'e2e'])
  assert.deepEqual(relevantChecks(undefined), [])
})

test('actionsIds: run and job from a link, nulls from anything else', () => {
  assert.deepEqual(actionsIds('https://github.com/o/r/actions/runs/900/job/11'), { runId: 900, jobId: 11 })
  assert.deepEqual(actionsIds('https://github.com/o/r/actions/runs/900'), { runId: 900, jobId: null })
  assert.deepEqual(actionsIds('https://example.test/status/1'), { runId: null, jobId: null })
  assert.deepEqual(actionsIds(undefined), { runId: null, jobId: null })
})

test('pendingChecks: unfinished check runs and pending statuses; a cancelled check is finished', () => {
  const runs = [
    run('ci-ok', 'success'),
    run('a', 'success'),
    { ...run('b', null), status: 'in_progress' },
    { ...run('c', null), status: 'queued' },
    run('d', 'cancelled'),
  ]
  const statuses = [{ context: 'cla', state: 'success' }, { context: 'x', state: 'pending' }]
  assert.deepEqual(pendingChecks(runs, statuses), [
    { name: 'b', state: 'in_progress' },
    { name: 'c', state: 'queued' },
    { name: 'x', state: 'pending' },
  ])
  // CI's verdict job has to exist before the gate decides: the first workflow to finish may come before it.
  assert.deepEqual(pendingChecks([], []), [{ name: 'ci-ok', state: 'missing' }])
  // Only cancelled checks are no waiting: the verdict exists, and nothing runs.
  assert.deepEqual(pendingChecks([run('ci-ok', 'failure'), run('run-lint', 'cancelled')], []), [])
})

test('stillRunning: a running check or a pending status, never a cancelled check or a missing verdict', () => {
  const pending = pendingChecks([run('run-lint', 'cancelled'), { ...run('b', null), status: 'queued' }], [])
  assert.deepEqual(stillRunning(pending), [{ name: 'b', state: 'queued' }])
  assert.deepEqual(stillRunning(pendingChecks([run('run-lint', 'cancelled')], [])), [])
})

test('failedChecks: every conclusion but success, neutral, and skipped; failed statuses; by name', () => {
  const runs = [
    run('z-build', 'failure'),
    run('a-lint', 'cancelled'),
    run('timeout', 'timed_out'),
    run('manual', 'action_required'),
    run('ok', 'success'),
    run('n', 'neutral'),
    run('s', 'skipped'),
    { ...run('running', null), status: 'in_progress' },
  ]
  const statuses = [
    { context: 'cla', state: 'failure', target_url: 'https://cla.test/1' },
    { context: 'old', state: 'error' },
    { context: 'fine', state: 'success' },
    { context: 'wait', state: 'pending' },
  ]
  const failed = failedChecks(runs, statuses)
  assert.deepEqual(failed.map((f) => [f.kind, f.name, f.conclusion]), [
    ['check', 'a-lint', 'cancelled'],
    ['status', 'cla', 'failure'],
    ['check', 'manual', 'action_required'],
    ['status', 'old', 'error'],
    ['check', 'timeout', 'timed_out'],
    ['check', 'z-build', 'failure'],
  ])
  assert.deepEqual(failed[1], {
    kind: 'status', name: 'cla', conclusion: 'failure', url: 'https://cla.test/1', jobId: null, runId: null,
  })
})

test('failedChecks: the job id of an Actions check run is in its link, else its own id; other apps have none', () => {
  const [actions] = failedChecks([run('build', 'failure', { id: 5 })], [])
  assert.deepEqual([actions.jobId, actions.runId], [11, 900])
  const [noLink] = failedChecks([run('build', 'failure', { id: 5, details_url: null, html_url: 'https://x/y' })], [])
  assert.deepEqual([noLink.jobId, noLink.runId, noLink.url], [5, null, 'https://x/y'])
  const codeql = run('CodeQL', 'failure', { id: 6, app: { slug: 'codeql' }, details_url: 'https://c/1' })
  const [other] = failedChecks([codeql], [])
  assert.deepEqual([other.jobId, other.runId], [null, null])
})

test('isCancelledOnly: every failed check is a cancelled check run, the verdict check ci-ok aside', () => {
  const check = (name, conclusion) => ({ kind: 'check', name, conclusion })
  assert.equal(isCancelledOnly([check('run-lint', 'cancelled')]), true)
  assert.equal(isCancelledOnly([check('ci-ok', 'failure'), check('run-lint', 'cancelled')]), true)
  assert.equal(isCancelledOnly([check('ci-ok', 'cancelled'), check('a', 'cancelled'), check('b', 'cancelled')]), true)
  // A cancelled check with a really failed one is a normal red result.
  assert.equal(isCancelledOnly([check('run-lint', 'cancelled'), check('js', 'failure')]), false)
  const status = { kind: 'status', name: 'cla', conclusion: 'failure' }
  assert.equal(isCancelledOnly([check('run-lint', 'cancelled'), status]), false)
  assert.equal(isCancelledOnly([check('ci-ok', 'failure')]), false)
  // The workflow was stopped after its other jobs passed: the cancelled verdict alone counts.
  assert.equal(isCancelledOnly([check('ci-ok', 'cancelled')]), true)
  assert.equal(isCancelledOnly([]), false)
  // A cancelled E2E job is both; the gate reruns it once either way, from the same budget.
  assert.equal(isE2eOnly([check('E2E tests', 'cancelled')]), true)
  assert.equal(isCancelledOnly([check('E2E tests', 'cancelled')]), true)
})

test('allGreen: needs a check, and no pending or failed one', () => {
  const ok = run('ci-ok', 'success')
  assert.equal(allGreen([ok, run('a', 'success'), run('b', 'skipped')], [{ context: 'cla', state: 'success' }]), true)
  assert.equal(allGreen([], []), false)
  assert.equal(allGreen([ok, run('a', 'success')], [{ context: 'cla', state: 'pending' }]), false)
  assert.equal(allGreen([ok, run('a', 'success'), run('b', 'failure')], []), false)
  assert.equal(allGreen([ok], [{ context: 'cla', state: 'success' }]), true)
  // Without CI's verdict job the gate keeps waiting, even when everything else is green.
  assert.equal(allGreen([run('a', 'success')], [{ context: 'cla', state: 'success' }]), false)
  assert.equal(allGreen([ok, run('b', 'cancelled')], []), false)
})

test('isE2eOnly: every failed check is an E2E check run', () => {
  const check = (name) => ({ kind: 'check', name })
  assert.equal(isE2eOnly([check('E2E tests (kind)'), check('e2e-compose')]), true)
  assert.equal(isE2eOnly([check('E2E tests'), check('build')]), false)
  assert.equal(isE2eOnly([{ kind: 'status', name: 'e2e' }]), false)
  assert.equal(isE2eOnly([]), false)
})

test('isE2eOnly: the verdict check ci-ok fails together with E2E and does not count', () => {
  const check = (name) => ({ kind: 'check', name })
  assert.equal(isE2eOnly([check('ci-ok'), check('E2E tests (kind)')]), true)
  assert.equal(isE2eOnly([check('ci-ok'), check('e2e-compose'), check('E2E tests (kind)')]), true)
  // Nothing remains without the verdict check, so the failure is not an E2E one.
  assert.equal(isE2eOnly([check('ci-ok')]), false)
  assert.equal(isE2eOnly([check('ci-ok'), check('build'), check('E2E tests')]), false)
  assert.equal(isE2eOnly([check('ci-ok'), { kind: 'status', name: 'E2E' }]), false)
  // A status that happens to be named like the verdict check is not the verdict check run.
  assert.equal(isE2eOnly([{ kind: 'status', name: 'ci-ok' }, check('E2E tests')]), false)
})

// ------------------------------------------------------------------------------------------------ logs

const stamp = (line, second = 1) => `2026-10-23T09:12:0${second}.1234567Z ${line}`

test('isErrorLine: the markers of a failure, not the lines that count zero of them', () => {
  for (const line of ['##[error]Process completed with exit code 1.', 'FAIL packages/x/a.test.ts', 'Error: boom',
    'main.go:12:5: error: undefined: x',
    '2 tests failed',
    '✖ 1 problem',
    'AssertionError: expected 1',
    'Failed tasks:',
  ]) {
    assert.equal(isErrorLine(line), true, line)
  }
  for (const line of ['Tests: 0 failed, 12 passed', 'failed: 0', 'build ok', 'all errors: none', '']) {
    assert.equal(isErrorLine(line), false, line)
  }
})

test('extractErrors: error lines with context, no ANSI, no timestamps, no blank lines, windows apart', () => {
  const lines = [
    stamp('##[group]Run pnpm test'),
    stamp('start'),
    ...Array.from({ length: 10 }, (_, i) => stamp(`noise ${i}`)),
    stamp('\u001b[31mFAIL\u001b[0m packages/x/a.test.ts'),
    stamp(''),
    stamp('  expected 1 to be 2'),
    ...Array.from({ length: 10 }, (_, i) => stamp(`more noise ${i}`)),
    stamp('##[error]Process completed with exit code 1.'),
  ]
  const result = extractErrors(lines.join('\n'))
  assert.deepEqual(result, [
    'noise 8',
    'noise 9',
    'FAIL packages/x/a.test.ts',
    '  expected 1 to be 2',
    'more noise 0',
    '...',
    'more noise 8',
    'more noise 9',
    '##[error]Process completed with exit code 1.',
  ])
})

test('extractErrors: the echo of a step script is no output; a real failure next to it is kept', () => {
  const echo = '\u001b[36;1m'
  const reset = '\u001b[0m'
  const lines = [
    stamp('##[group]Run set -euo pipefail'),
    stamp(`${echo}set -euo pipefail${reset}`),
    stamp(`${echo}echo "::error::E2E failed, see the newman report"${reset}`),
    stamp(`${echo}if [ -n "$FAILED" ]; then echo "error: failed jobs"; fi${reset}`),
    stamp('shell: /usr/bin/bash -e {0}'),
    stamp('\u001b[36;1m'),
    stamp('##[endgroup]'),
    stamp('┌─────────┬──────────┬──────────┐'),
    stamp('│         │ executed │   failed │'),
    stamp('│ assertions │ 40    │        2 │'),
    stamp('  1. AssertionError  Status code is 200'),
    stamp('                     expected response to have status code 200 but got 401'),
    stamp('##[error]Process completed with exit code 1.'),
  ]
  const result = extractErrors(lines.join('\n'))
  assert.ok(result.every((l) => !l.includes('::error::') && !l.includes('failed jobs')), result.join('\n'))
  assert.ok(result.includes('  1. AssertionError  Status code is 200'))
  assert.ok(result.includes('##[error]Process completed with exit code 1.'))
  // Only the echo is dropped: the same text printed as output stays an error line.
  assert.deepEqual(extractErrors(stamp('::error::E2E failed')), ['::error::E2E failed'])
  assert.deepEqual(extractErrors(stamp(`${echo}echo "::error::E2E failed"${reset}`)), [])
})

test('extractErrors: an Nx "Failed tasks" block is kept whole; a clean log gives nothing', () => {
  const tail = Array.from({ length: 20 }, (_, i) => `l${i}`)
  const block = ['Failed tasks:', '', '- portal-backend:test', '- ui:build', ...tail]
  const result = extractErrors(['ok', 'ok', ...block].join('\n'))
  assert.ok(result.includes('- portal-backend:test') && result.includes('- ui:build'))
  assert.equal(result.filter((l) => l.startsWith('l')).length, 12)
  assert.deepEqual(extractErrors('all good\nstill good\n'), [])
  assert.deepEqual(extractErrors(undefined), [])
})

test('extractErrors: at most maxLines, the first ones, with a note; long lines are cut', () => {
  const log = Array.from({ length: 300 }, (_, i) => `Error: problem ${i}`).join('\n')
  const lines = extractErrors(log)
  assert.equal(lines.length, 120)
  assert.equal(lines[0], 'Error: problem 0')
  assert.match(lines.at(-1), /^\[cut: \d+ more lines\]$/)
  assert.equal(extractErrors(log, { maxLines: 10 }).length, 10)
  const long = extractErrors(`Error: ${'x'.repeat(1000)}`)
  assert.equal(long[0].length, 300)
  assert.ok(long[0].endsWith('...'))
})

test('capTotalLines: the first jobs keep their lines, the last ones get what is left', () => {
  const lines = (n, tag) => Array.from({ length: n }, (_, i) => `${tag}${i}`)
  const result = capTotalLines({ a: lines(100, 'a'), b: lines(100, 'b'), c: lines(100, 'c') }, ['a', 'b', 'c'], 250)
  assert.deepEqual(Object.values(result).map((l) => l.length), [100, 100, 50])
  assert.match(result.c.at(-1), /^\[cut: 51 more lines\]$/)
  const spent = capTotalLines({ a: lines(10, 'a'), b: lines(10, 'b') }, ['a', 'b'], 10)
  assert.deepEqual(spent.b, ['[cut: the total limit of log lines is spent]'])
  assert.deepEqual(capTotalLines({ a: ['x'] }, ['a', 'missing'], 5), { a: ['x'] })
})

// ------------------------------------------------------------------------------------------------ the signature

test('normalizeLine: timestamps, temporary paths, durations, positions, hex ids, and numbers are placeholders', () => {
  const same = (a, b) => assert.equal(normalizeLine(a), normalizeLine(b), `${a} == ${b}`)
  same(stamp('Error: boom at step 3'), '2027-01-02T10:00:00Z Error: boom at step 9')
  same('FAIL a.test.ts (12.3 s)', 'FAIL a.test.ts (4 ms)')
  same('Error: cannot open /tmp/tmp.abc123/out.txt', 'Error: cannot open /tmp/tmp.zzz999/out.txt')
  same('Error: cannot open /home/runner/work/_temp/a1b2/x', 'Error: cannot open /home/runner/work/_temp/q9/x')
  same(
    'Error: cannot open C:\\Users\\me\\AppData\\Local\\Temp\\t1\\x',
    'Error: cannot open C:\\Users\\you\\Temp\\t2\\x',
  )
  same('main.go:12:5: undefined: x', 'main.go:344:17: undefined: x')
  same('src/a.ts(10,4): error TS2304', 'src/a.ts(99,1): error TS2304')
  same('commit 3f2a9c1d5b7e is bad', 'commit 0a1b2c3d4e5f is bad')
  same('run 123456789 failed after 2m 3s', 'run 987654321 failed after 10m 59s')
  same('\u001b[31mError:\u001b[0m   boom', 'Error: boom')
  assert.notEqual(normalizeLine('FAIL a.test.ts'), normalizeLine('FAIL b.test.ts'))
  assert.notEqual(normalizeLine('Error: boom'), normalizeLine('Error: bang'))
  assert.equal(normalizeLine('main.go:12:5: error'), 'main.go:<pos>: error')
})

const failedSet = (...names) => names.map((name) => ({ name }))

test('failureSignature: 12 hex characters; the same failure gives the same signature despite log noise', () => {
  const failed = failedSet('build', 'e2e')
  const first = {
    build: [stamp('FAIL packages/x/a.test.ts (3.1 s)'), stamp('Error: expected 1 to be 2', 2), stamp('run 100200300')],
    e2e: [stamp('##[error]Process completed with exit code 1.')],
  }
  const second = {
    build: [
      '2027-05-05T01:02:03.9999999Z FAIL packages/x/a.test.ts (7.9 s)',
      '2027-05-05T01:02:04.0000000Z Error: expected 1 to be 2',
      '2027-05-05T01:02:05.0000000Z run 555666777',
    ],
    e2e: ['2027-05-05T01:02:06.0000000Z ##[error]Process completed with exit code 1.'],
  }
  const a = failureSignature(failed, first)
  assert.match(a, /^[0-9a-f]{12}$/)
  assert.equal(failureSignature(failed, second), a)
  assert.equal(failureSignature(failedSet('e2e', 'build'), second), a, 'the order of the checks does not matter')
})

test('failureSignature: cancelled checks are left out when a real failure exists, and make it when alone', () => {
  const real = { name: 'js', conclusion: 'failure' }
  const lint = { name: 'run-lint', conclusion: 'cancelled' }
  const other = { name: 'storybooks', conclusion: 'cancelled' }
  const errors = { js: ['FAIL a.test.ts', 'Error: boom'], 'run-lint': ['stopped'], storybooks: ['also stopped'] }
  const plain = failureSignature([real], errors)
  assert.equal(failureSignature([real, lint], errors), plain)
  assert.equal(failureSignature([lint, real, other], errors), plain, 'a changing set of cancelled checks')
  assert.equal(failureSignature([real, { ...lint, conclusion: 'timed_out' }], errors) === plain, false)
  // Alone, the cancelled checks are the failure.
  const alone = failureSignature([lint], errors)
  assert.notEqual(alone, plain)
  assert.notEqual(failureSignature([lint, other], errors), alone)
  assert.equal(failureSignature([other, lint], errors), failureSignature([lint, other], errors))
})

test('failureSignature: another failing test, another failing check, or another message changes it', () => {
  const failed = failedSet('build')
  const base = failureSignature(failed, { build: ['FAIL packages/x/a.test.ts', 'Error: expected 1 to be 2'] })
  assert.notEqual(failureSignature(failed, { build: ['FAIL packages/x/b.test.ts', 'Error: expected 1 to be 2'] }), base)
  assert.notEqual(failureSignature(failed, { build: ['FAIL packages/x/a.test.ts', 'Error: boom'] }), base)
  assert.notEqual(
    failureSignature(failedSet('build', 'lint'), { build: ['FAIL packages/x/a.test.ts', 'Error: expected 1 to be 2'] }),
    base,
  )
})

test('failureSignature: only the first five error lines count; a log without errors uses its first lines', () => {
  const failed = failedSet('build')
  const five = Array.from({ length: 5 }, (_, i) => `Error: problem ${String.fromCharCode(97 + i)}`)
  const base = failureSignature(failed, { build: five })
  assert.equal(failureSignature(failed, { build: [...five, 'Error: a sixth one'] }), base)
  assert.equal(failureSignature(failed, { build: ['context', ...five, '...', 'more context'] }), base)
  assert.notEqual(failureSignature(failed, { build: [...five.slice(0, 4), 'Error: other'] }), base)
  const quiet = failureSignature(failed, { build: ['something odd', ''] })
  assert.match(quiet, /^[0-9a-f]{12}$/)
  assert.notEqual(quiet, failureSignature(failed, { build: ['something else'] }))
  assert.equal(failureSignature(failed, {}), failureSignature(failed, undefined))
})

test('firstError: the first error line of the first failed check that has one', () => {
  const failed = failedSet('a', 'b')
  assert.deepEqual(
    firstError(failed, { a: ['noise'], b: ['noise', 'Error: boom'] }),
    { check: 'b', line: 'Error: boom' },
  )
  assert.deepEqual(firstError(failed, { a: ['ok'] }), { check: 'a', line: null })
  assert.deepEqual(firstError([], {}), { check: 'the failed check', line: null })
  assert.equal(firstError(failedSet('a'), { a: [`Error: ${'x'.repeat(300)}`] }).line.length, 200)
})

// ------------------------------------------------------------------------------------------------ the report

test('buildReport: commit, signature, failed checks, and the errors of each job in a fence', () => {
  const failed = [
    { name: 'build', conclusion: 'failure', url: 'https://github.com/o/r/actions/runs/900/job/11' },
    { name: 'Lint: Code base', conclusion: 'cancelled', url: null },
  ]
  const text = buildReport({
    pr: 70,
    headSha: '3f2a9c1d5b7e8f40a1b2c3d4e5f60718293a4b5c',
    failed,
    errorsByJob: { build: ['FAIL a', 'Error: boom'] },
    notes: { 'Lint: Code base': 'The log of this job is not available: 410' },
    signature: 'abc123def456',
  })
  assert.match(
    text,
    /^# CI report for pull request #70\n\n- Commit: `3f2a9c1d5b7e`\n- Failure signature: `abc123def456`\n/,
  )
  assert.match(text, /- Failed checks: 2\n/)
  assert.match(text, /- `build`: failure \(https:\/\/github\.com\/o\/r\/actions\/runs\/900\/job\/11\)\n/)
  assert.match(text, /- `Lint: Code base`: cancelled\n/)
  assert.match(text, /## Errors of `build`\n\n```text\nFAIL a\nError: boom\n```\n/)
  assert.match(text, /## Errors of `Lint: Code base`\n\nThe log of this job is not available: 410\n/)
})

test('buildReport: never longer than 12,000 characters, however many jobs and lines fail', () => {
  const failed = Array.from({ length: 30 }, (_, i) => ({
    name: `job ${i}`,
    conclusion: 'failure',
    url: `https://x/${i}`,
  }))
  const longLines = Array.from({ length: 120 }, (_, i) => `Error: line ${i} ${'y'.repeat(200)}`)
  const errorsByJob = Object.fromEntries(failed.map((f) => [f.name, longLines]))
  const text = buildReport({ pr: 1, headSha: 'abc', failed, errorsByJob, signature: 's' })
  assert.ok(text.length <= 12000, `${text.length}`)
  assert.match(text, /- and 10 more\n/)
  const one = buildReport({ pr: 1, headSha: 'abc', failed: failed.slice(0, 1), errorsByJob, signature: 's' })
  assert.ok(one.length <= 12000)
  assert.match(one, /\[cut: the text is longer than/)
  assert.ok((one.match(/```/g) ?? []).length % 2 === 0, 'the fence is closed')
})

test('buildReport: a log with backticks cannot close its fence, and a mention in a name is defused', () => {
  const text = buildReport({
    pr: 1,
    headSha: 'abc',
    failed: [{ name: 'job @alice `x`', conclusion: 'failure', url: null }],
    errorsByJob: { 'job @alice `x`': ['Error: ```` and ``` here'] },
    signature: 's',
  })
  assert.match(text, /- `job @​alice 'x'`: failure/)
  assert.match(text, /`{5}text\nError: `{4} and `{3} here\n`{5}/)
})

// ------------------------------------------------------------------------------------------------ the stop rule

const attempt = (n, kind, extra = {}) => ({ n, kind, result: 'ci-red', ...extra })
const config = (maxAttempts = 3) => ({ limits: { maxAttempts } })

test('lastSignature and countedAttempts: the latest recorded signature; initial and ci-fix attempts only', () => {
  assert.equal(lastSignature(undefined), null)
  assert.equal(lastSignature([attempt(1, 'initial')]), null)
  assert.equal(lastSignature([attempt(1, 'initial', { signature: 'a' }), attempt(2, 'ci-fix')]), 'a')
  assert.equal(
    lastSignature([attempt(1, 'initial', { signature: 'a' }), attempt(2, 'ci-fix', { signature: 'b' })]),
    'b',
  )
  assert.equal(countedAttempts([attempt(1, 'initial'), attempt(2, 'human'), attempt(3, 'ci-fix')]), 2)
  assert.equal(countedAttempts(undefined), 0)
})

test('stopDecision: the same signature as the attempt before stops at once, whatever the budget', () => {
  const st = { attempts: [attempt(1, 'initial', { signature: 'aaa' }), attempt(2, 'ci-fix')] }
  assert.deepEqual(stopDecision({ state: st, signature: 'aaa', config: config(10) }), {
    action: 'stop',
    reason: 'same-failure',
  })
  // The attempt just recorded counts too: a signature on the last attempt is compared as well.
  const recorded = { attempts: [attempt(1, 'initial', { signature: 'aaa' })] }
  assert.equal(stopDecision({ state: recorded, signature: 'aaa', config: config() }).reason, 'same-failure')
})

test('stopDecision: a new failure goes on while attempts are left, and stops with the reason budget', () => {
  const one = { attempts: [attempt(1, 'initial')] }
  assert.deepEqual(stopDecision({ state: one, signature: 'aaa', config: config() }), {
    action: 'next-attempt',
    reason: 'new-failure',
  })
  const two = { attempts: [attempt(1, 'initial', { signature: 'a' }), attempt(2, 'ci-fix')] }
  assert.equal(stopDecision({ state: two, signature: 'b', config: config() }).action, 'next-attempt')
  assert.equal(stopDecision({ state: two, signature: 'b', config: config(2) }).reason, 'budget')
  const three = {
    attempts: [
      attempt(1, 'initial', { signature: 'a' }),
      attempt(2, 'ci-fix', { signature: 'b' }),
      attempt(3, 'ci-fix'),
    ],
  }
  assert.deepEqual(
    stopDecision({ state: three, signature: 'c', config: config() }),
    { action: 'stop', reason: 'budget' },
  )
  // The same failure is the better reason when both hold.
  assert.equal(stopDecision({ state: three, signature: 'b', config: config() }).reason, 'same-failure')
})

test('stopDecision: a retry of a person does not use the budget; no attempts, no problem', () => {
  const st = {
    attempts: [
      attempt(1, 'initial', { signature: 'a' }),
      attempt(2, 'human', { signature: 'b' }),
      attempt(3, 'ci-fix'),
    ],
  }
  assert.equal(stopDecision({ state: st, signature: 'c', config: config() }).action, 'next-attempt')
  assert.equal(stopDecision({ state: {}, signature: 'c', config: config() }).action, 'next-attempt')
})

// ------------------------------------------------------------------------------------------------ the state

const waiting = () => ({
  phase: 'waiting-ci',
  pr: 70,
  costs: [{ usd: 1.5 }],
  lastCiReport: 'old',
  attempts: [attempt(1, 'initial', { result: 'pr-opened' })],
})
const at = '2026-10-23T09:00:00Z'

test('greenState: completed, the attempt is ci-green, the old report goes, the decision is recorded', () => {
  const before = waiting()
  const after = greenState(before, { sha: 'abc', at, run: 'r' })
  assert.equal(after.phase, 'completed')
  assert.equal(after.attempts[0].result, 'ci-green')
  assert.equal(after.lastCiReport, undefined)
  assert.deepEqual(after.ciGate, { sha: 'abc', decided: true, at, run: 'r' })
  assert.equal(before.phase, 'waiting-ci', 'the input is not changed')
  assert.equal(before.attempts[0].result, 'pr-opened')
})

test('stoppedState and nextAttemptState: the signature on the last attempt, the report, and the new phase', () => {
  const stopped = stoppedState(waiting(), { signature: 's1', report: 'R', sha: 'abc', at, run: 'r' })
  assert.deepEqual([stopped.phase, stopped.lastCiReport, stopped.attempts[0].signature, stopped.attempts[0].result], [
    'needs-human', 'R', 's1', 'ci-red',
  ])
  assert.equal(stopped.implementing, undefined)
  const next = nextAttemptState(waiting(), { signature: 's1', report: 'R', sha: 'abc', at, run: 'r', actor: 'carol' })
  assert.equal(next.phase, 'implementing')
  assert.deepEqual(next.implementing, { run: 'r', actor: 'carol', at, kind: 'ci-fix' })
  assert.equal(next.ciGate.decided, true)
  assert.deepEqual(next.costs, [{ usd: 1.5 }])
  assert.equal(
    stoppedState({ phase: 'waiting-ci' }, { signature: 's', report: 'R', sha: 'a', at, run: 'r' }).attempts.length,
    0,
  )
})

test('an unrelated attempt keeps unrelated: true when the CI verdict replaces its result', () => {
  const unrelated = () => ({ ...waiting(), attempts: [attempt(1, 'ci-fix', { result: 'unrelated' })] })
  const green = greenState(unrelated(), { sha: 'abc', at, run: 'r' })
  assert.deepEqual([green.attempts[0].result, green.attempts[0].unrelated], ['ci-green', true])
  const stopped = stoppedState(unrelated(), { signature: 's1', report: 'R', sha: 'abc', at, run: 'r' })
  assert.deepEqual([stopped.attempts[0].result, stopped.attempts[0].unrelated], ['ci-red', true])
  const next = nextAttemptState(unrelated(), { signature: 's1', report: 'R', sha: 'abc', at, run: 'r', actor: 'carol' })
  assert.deepEqual([next.attempts[0].result, next.attempts[0].unrelated], ['ci-red', true])
  // The flag stays on a later patch, and another attempt never gets it.
  const again = greenState(stoppedState(unrelated(), { signature: 's', report: 'R', sha: 'a', at, run: 'r' }), { sha: 'b', at, run: 'r' })
  assert.equal(again.attempts[0].unrelated, true)
  assert.equal(greenState(waiting(), { sha: 'abc', at, run: 'r' }).attempts[0].unrelated, undefined)
})

test('rerunState counts the free rerun per commit and decides nothing', () => {
  assert.deepEqual(rerunState({}, 'aaa').e2eRerun, { sha: 'aaa', count: 1 })
  assert.deepEqual(rerunState({ e2eRerun: { sha: 'aaa', count: 1 } }, 'aaa').e2eRerun, { sha: 'aaa', count: 2 })
  // A new commit starts from zero.
  assert.deepEqual(rerunState({ e2eRerun: { sha: 'aaa', count: 1 } }, 'bbb').e2eRerun, { sha: 'bbb', count: 1 })
  assert.equal(rerunState({}, 'aaa').ciGate, undefined)
  // The old per-pull-request counter is dropped; the input is not changed.
  const old = { e2eReruns: 1 }
  assert.equal(rerunState(old, 'aaa').e2eReruns, undefined)
  assert.equal(old.e2eReruns, 1)
})

test('e2eRerunLeft: one free rerun for each head commit', () => {
  assert.equal(e2eRerunLeft({}, 'aaa'), true)
  assert.equal(e2eRerunLeft({ e2eReruns: 1 }, 'aaa'), true)
  assert.equal(e2eRerunLeft({ e2eRerun: { sha: 'aaa', count: 1 } }, 'aaa'), false)
  assert.equal(e2eRerunLeft({ e2eRerun: { sha: 'aaa', count: 1 } }, 'bbb'), true)
})

test('gateGuard: the phase, the pull request, and the commit must be the ones the router saw', () => {
  const st = { phase: 'waiting-ci', pr: 70 }
  const pull = { number: 70, state: 'open', head: { sha: 'abc' } }
  assert.equal(gateGuard({ st, pull, expectedPr: '70', expectedSha: 'abc' }), null)
  assert.equal(gateGuard({ st, pull }), null)
  assert.match(gateGuard({ st: { ...st, phase: 'implementing' }, pull }), /phase 'implementing', not 'waiting-ci'/)
  assert.match(gateGuard({ st: { ...st, pr: 71 }, pull }), /names pull request #71, not #70/)
  assert.match(gateGuard({ st, pull, expectedPr: '71' }), /not #70/)
  assert.match(gateGuard({ st, pull: { ...pull, state: 'closed' } }), /pull request #70 is not open/)
  assert.match(gateGuard({ st, pull, expectedSha: 'def' }), /a newer commit is on the branch/)
})

test('rerunTargets: the runs of the failed jobs, else the run that started the gate', () => {
  assert.deepEqual(rerunTargets([{ runId: 900 }, { runId: 900 }, { runId: 901 }], '5'), [900, 901])
  assert.deepEqual(rerunTargets([{ runId: null }], '5'), [5])
  assert.deepEqual(rerunTargets([{ runId: null }], undefined), [])
  assert.deepEqual(rerunTargets([], 'abc'), [])
})

// ------------------------------------------------------------------------------------------------ texts

test('attemptsTable: one row per attempt; a pipe or a mention in the notes cannot break the table', () => {
  const lines = attemptsTable([
    { n: 1, kind: 'initial', result: 'ci-red', signature: 'abc', notes: 'Tried | a guard.\n@bob knows.' },
    { n: 2, kind: 'ci-fix', result: 'ci-red', notes: 'x'.repeat(500) },
  ])
  assert.equal(lines[0], '| # | Kind | Result | Signature | Notes |')
  assert.equal(lines.length, 4)
  assert.equal(lines[2], '| 1 | initial | ci-red | `abc` | Tried \\| a guard. @​bob knows. |')
  assert.match(lines[3], /^\| 2 \| ci-fix \| ci-red \|  \| x{297}\.\.\. \|$/)
})

test('renderGreen, renderNextAttempt, and renderRerun say what happened and what follows', () => {
  const green = renderGreen({
    pr: 70, headSha: '3f2a9c1d5b7e8f40', attempts: 2, runUrl: 'https://x/runs/1', totalUsd: 1.5,
  })
  assert.match(
    green,
    /^### AI implementation: CI is green on pull request #70\n\nEvery check of commit `3f2a9c1d5b7e` passed after 2/,
  )
  assert.match(green, /A person reviews and merges the pull request\./)
  assert.match(green, /\$1\.50 · the issue closes when the pull request is merged<\/sub>$/)
  assert.doesNotMatch(green, /could not mark/)
  assert.match(
    renderGreen({ pr: 70, headSha: 'abc', attempts: 1, readyError: 'AGENT_PAT is not set', runUrl: 'u', totalUsd: 0 }),
    /I could not mark the pull request ready for review: AGENT_PAT is not set Mark it ready yourself\./,
  )
  const failed = [{ name: 'build', conclusion: 'failure', url: 'https://x/job/1' }]
  const next = renderNextAttempt({ pr: 70, n: 2, max: 3, failed, runUrl: 'u', totalUsd: 0 })
  assert.match(
    next,
    /^### AI implementation: CI is red on pull request #70\n\nAttempt 2 of 3 fixes it\. The failed checks:/,
  )
  assert.match(next, /- `build`: failure \(\[log\]\(https:\/\/x\/job\/1\)\)/)
  assert.match(renderRerun({ pr: 70, failed, runUrl: 'u', totalUsd: 0 }), /Only E2E jobs failed\. I reran them once/)
  const cancelled = [{ kind: 'check', name: 'run-lint', conclusion: 'cancelled', url: null }]
  const rerunText = renderRerun({ pr: 70, failed: cancelled, runUrl: 'u', totalUsd: 0, kind: 'cancelled' })
  assert.match(rerunText, /The failed checks were cancelled, so nothing really failed\. I reran them once/)
  assert.match(rerunText, /- `run-lint`: cancelled/)
})

test('renderStopped: the reason, every attempt, the current failure, and one request', () => {
  const attempts = [
    { n: 1, kind: 'initial', result: 'ci-red', signature: 'aaa', notes: 'Tried a guard.' },
    { n: 2, kind: 'ci-fix', result: 'ci-red', signature: 'aaa', notes: 'Tried a test.' },
  ]
  const failed = [{ name: 'build', conclusion: 'failure', url: null }]
  const text = renderStopped({
    pr: 70, reason: 'same-failure', max: 3, attempts, failed, report: 'R'.repeat(5000), runUrl: 'u', totalUsd: 2,
  })
  assert.match(
    text,
    /^### AI implementation needs a person: CI is red on pull request #70\n\n- Failed checks: `build`\.\n/,
  )
  assert.match(text, /\n- `build` has no error line I could read\.\n- Why I stopped: The last attempt failed/)
  assert.match(text, /\| 2 \| ci-fix \| ci-red \| `aaa` \| Tried a test\. \|/)
  assert.match(
    text,
    /<details><summary>CI report<\/summary>\n\nR+\n\[cut: the text is longer than 3000 characters\]\n\n<\/details>/,
  )
  assert.match(text, /\nWhat you can do:\n\n- If the failure is not caused by the change \(a flaky test, an outage\), /)
  assert.match(text, /comment `\/agent rerun`: it reruns the failed checks, with no new attempt and no model cost\.\n/)
  assert.match(text, /\n- To try another fix, comment `\/agent retry` with guidance\.\n/)
  assert.match(
    renderStopped({ pr: 70, reason: 'budget', max: 3, attempts, failed, report: 'R', runUrl: 'u', totalUsd: 0 }),
    /I used all 3 attempts, and CI is still red\./,
  )
})

test('greenComment and stopComment mention the person, name the check and its error, and ask for a retry', () => {
  assert.equal(greenComment({ actor: 'carol', pr: 70 }), '@carol, CI is green on #70. A person reviews and merges it.')
  const failed = [{ name: 'build `x`', conclusion: 'failure' }]
  const text = stopComment({
    actor: 'carol',
    pr: 70,
    reason: 'budget',
    max: 3,
    failed,
    errorsByJob: { 'build `x`': ['noise', 'Error: boom `now` @bob'] },
  })
  assert.match(text, /^@carol, I stopped on #70: CI is red\.\n\n- Failed checks: `build 'x'`\.\n/)
  assert.match(text, /\n- First error, in `build 'x'`: `Error: boom 'now' @​bob`\.\n/)
  assert.match(text, /\n- Why I stopped: I used all 3 attempts, and CI is still red\.\n\nWhat you can do:\n\n/)
  assert.match(text, /\n- If the failure is not caused by the change .*`\/agent rerun`.*\n- To try another fix, comment `\/agent retry` with guidance\.$/)
  const quiet = stopComment({ actor: 'carol', pr: 70, reason: 'same-failure', max: 3, failed, errorsByJob: {} })
  assert.match(quiet, /\n- `build 'x'` has no error line I could read\.\n/)
})

test('countedAttempts counts only from the budget index: a person who steers the agent gives a fresh budget', () => {
  const attempts = [attempt(1, 'initial'), attempt(2, 'ci-fix'), attempt(3, 'human'), attempt(4, 'ci-fix')]
  assert.equal(countedAttempts(attempts), 3)
  assert.equal(countedAttempts(attempts, 0), 3)
  assert.equal(countedAttempts(attempts, 2), 1)
  assert.equal(countedAttempts(attempts, 4), 0)
  assert.equal(countedAttempts(attempts, 99), 0)
})

test('stopDecision: attempts before budgetFrom do not count against the budget; the signature still does', () => {
  const spent = [attempt(1, 'initial', { signature: 'a' }), attempt(2, 'ci-fix', { signature: 'b' })]
  const before = { attempts: [...spent, attempt(3, 'ci-fix', { signature: 'c' })] }
  assert.equal(stopDecision({ state: before, signature: 'd', config: config() }).reason, 'budget')
  // A retry after the stop: attempt 4 is the person's attempt, budgetFrom is 3.
  const retried = { attempts: [...before.attempts, attempt(4, 'human')], budgetFrom: 3 }
  assert.deepEqual(stopDecision({ state: retried, signature: 'd', config: config() }), {
    action: 'next-attempt',
    reason: 'new-failure',
  })
  const again = {
    attempts: [...retried.attempts, attempt(5, 'ci-fix'), attempt(6, 'ci-fix'), attempt(7, 'ci-fix')],
    budgetFrom: 3,
  }
  assert.equal(stopDecision({ state: again, signature: 'e', config: config() }).reason, 'budget')
  // The same failure as the last recorded one still stops at once, across the boundary.
  const same = { attempts: [...before.attempts, attempt(4, 'human', { signature: 'c' })], budgetFrom: 3 }
  assert.equal(stopDecision({ state: same, signature: 'c', config: config() }).reason, 'same-failure')
})

test('checkNames lists at most five checks, then says how many more; the names are safe in a code span', () => {
  const failed = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => ({ name }))
  assert.equal(checkNames(failed), '`a`, `b`, `c`, `d`, `e`, and 2 more')
  assert.equal(checkNames(failed.slice(0, 2)), '`a`, `b`')
  assert.equal(checkNames(failed.slice(0, 5)), '`a`, `b`, `c`, `d`, `e`')
  assert.equal(checkNames(failed.slice(0, 5), 8), '`a`, `b`, `c`, `d`, `e`, and 3 more')
  assert.equal(checkNames([{ name: 'build `x` @bob' }]), "`build 'x' @​bob`")
  // A cancelled check keeps its conclusion in the text.
  assert.equal(
    checkNames([{ name: 'js', conclusion: 'failure' }, { name: 'run-lint', conclusion: 'cancelled' }]),
    '`js`, `run-lint` (cancelled)',
  )
})

test('failureLines: the failed checks, then the first error line of the first check that has one', () => {
  const failed = failedSet('build', 'lint')
  assert.deepEqual(failureLines(failed, { build: ['noise'], lint: ['x', 'Error: boom'] }), [
    'Failed checks: `build`, `lint`.',
    "First error, in `lint`: `Error: boom`.",
  ])
  assert.deepEqual(failureLines(failed, {}), [
    'Failed checks: `build`, `lint`.',
    '`build` has no error line I could read.',
  ])
})

test('reportFacts reads the failed checks and their error lines back from a report', () => {
  const failed = Array.from({ length: 22 }, (_, i) => ({ name: `job ${String(i).padStart(2, '0')}`, conclusion: 'failure' }))
  const errorsByJob = { 'job 00': ['FAIL a', 'Error: boom'], 'job 01': ['```', 'Error: in a fence'] }
  const report = buildReport({ pr: 70, headSha: 'a'.repeat(40), failed, errorsByJob, signature: 'abc', max: 100000 })
  const facts = reportFacts(report)
  assert.equal(facts.failed.length, 20)
  assert.equal(facts.total, 22)
  assert.deepEqual(facts.errorsByJob['job 00'], ['FAIL a', 'Error: boom'])
  assert.deepEqual(facts.errorsByJob['job 01'], ['```', 'Error: in a fence'])
  assert.deepEqual(failureLines(facts.failed, facts.errorsByJob, facts.total), [
    'Failed checks: `job 00`, `job 01`, `job 02`, `job 03`, `job 04`, and 17 more.',
    'First error, in `job 00`: `FAIL a`.',
  ])
  assert.deepEqual(reportFacts(''), { failed: [], errorsByJob: {}, total: 0 })
  assert.deepEqual(reportFacts(undefined), { failed: [], errorsByJob: {}, total: 0 })
})

test('rerunRefusal and rerunRequestState', () => {
  const st = { phase: 'needs-human', pr: 70, branch: 'b', ciGate: { sha: 'a' }, implementing: { run: 'r' } }
  assert.equal(rerunRefusal({ st, actor: 'erin', issue: {}, prHint: null }), null)
  assert.equal(rerunRefusal({ st, actor: 'erin', issue: {}, prHint: 70 }), null)
  assert.match(rerunRefusal({ st: {}, actor: 'erin', issue: {} }), /^@erin, there is no pull request of the agent/)
  assert.match(rerunRefusal({ st, actor: 'erin', issue: {}, prHint: 71 }), /no pull request of the agent/)
  const now = Date.parse('2026-10-24T12:00:00Z')
  const busy = { ...st, phase: 'implementing', implementing: { run: 'u', at: '2026-10-24T11:00:00Z' } }
  assert.equal(rerunRefusal({ st: busy, actor: 'erin', issue: {}, now }), '@erin, an implementation is already running: u.')
  const stale = { ...busy, implementing: { run: 'u', at: '2026-10-24T09:00:00Z' } }
  assert.equal(rerunRefusal({ st: stale, actor: 'erin', issue: {}, now }), null)
  assert.match(rerunRefusal({ st: { ...st, phase: 'stopped' }, actor: 'erin', issue: {} }), /the work is stopped/)

  const next = rerunRequestState(st, { sha: 'abc', runs: [1], actor: 'erin', at: 't', run: 'u' })
  assert.deepEqual(next, {
    phase: 'waiting-ci', pr: 70, branch: 'b', reruns: [{ at: 't', actor: 'erin', sha: 'abc', runs: [1], run: 'u' }],
  })
  assert.equal(st.ciGate.sha, 'a')
})
