#!/usr/bin/env node
/**
 * The CI gate of the AI Autonomous agent (Flow C, after the pull request is open).
 *
 * A `workflow_run` of a CI workflow starts the `ci-gate` job when the router (route.js) finds that the branch belongs
 * to an open pull request of the agent whose issue waits for CI at this commit. The gate reads every check of the head
 * commit and decides once. It uses no model.
 *
 *   1. Collect the check runs and the commit statuses of the head commit; the agent's own jobs do not count.
 *   2. Wait: while any check runs or any status is pending, do nothing; the workflow run that finishes last decides.
 *   3. Green: the pull request leaves draft (`AGENT_PAT`), gets `agent:completed` and `ai:l1-executor`, the issue gets
 *      `agent:completed`, and a comment tells the person who asked.
 *   4. Red: read the logs of the failed jobs, cut them to the error blocks, and build the CI report and its failure
 *      signature. A red result made only of E2E jobs is rerun once for free. Otherwise the stop rule decides: the
 *      same signature as the attempt before, or the attempts spent, hands the issue to a person (`agent:needs-human`,
 *      the whole history in the state comment, one concrete request); anything else starts the next attempt
 *      (`next=implement` for the `implement` job, which runs with `AGENT_KIND=ci-fix`).
 *
 * The decision is recorded in the state (`ciGate`), so a second workflow run of the same commit does nothing. In
 * dry-run nothing is written to GitHub and no attempt starts; the job summary shows the decision. Check logs contain
 * the output of code the model wrote, so they are untrusted: the report reaches a model only inside `untrusted()`.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, AGENT_PAT (green result of a draft pull request only), AGENT_NUMBER
 * (the issue), AGENT_PR and AGENT_HEAD_SHA (from the router), AGENT_WORKFLOW_RUN_ID, AGENT_RUN_URL, AGENT_OUT (folder
 * for the report), the AGENT_* variables of lib/config.js, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY.
 */
'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const { inline, clip, stripAnsi } = require('./lib/text')
const log = require('./lib/log')
const { fence, appendSummary, writeOutputs, quoted, costLine, loadIssue } = require('./implement')

const LABEL_NEEDS_HUMAN = 'agent:needs-human'
const LABEL_COMPLETED = 'agent:completed'
const LABEL_L1 = 'ai:l1-executor'

/** Names of the jobs of the agent's own workflows: they run on the default branch, but never count as CI. */
const OWN_JOBS = new Set(['route', 'review', 'analyze', 'implement', 'ci-gate', 'levels'])
const OWN_WORKFLOW_PREFIX = 'AI Autonomous'
const GREEN_CONCLUSIONS = new Set(['success', 'neutral', 'skipped'])

const MAX_JOB_LINES = 120
const MAX_TOTAL_LINES = 400
const MAX_LINE_CHARS = 300
const MAX_REPORT_CHARS = 12000
const MAX_LISTED_CHECKS = 20
const MAX_LOG_JOBS = 10
const SIGNATURE_LINES = 5
const SIGNATURE_LENGTH = 12
/** Free reruns of failed E2E jobs per pull request. */
const MAX_E2E_RERUNS = 1
/** The part of the report that goes into the comment on the issue; the state holds all of it. */
const COMMENT_REPORT_CHARS = 3000

const sum = (items, field) => items.reduce((total, item) => total + (item[field] ?? 0), 0)
/** Text for a Markdown code span: one line, no mention, no backtick that could end the span. */
const code = (text) => inline(text).replace(/`/g, "'")
/** Text for a table cell. */
const cell = (text, max = 300) => {
  const flat = inline(text ?? '')
  return (flat.length > max ? `${flat.slice(0, max - 3)}...` : flat).replace(/\|/g, '\\|')
}

// ---------------------------------------------------------------------------------------------------------------
// Checks: which count, which are pending, which failed
// ---------------------------------------------------------------------------------------------------------------

/**
 * True for a check run of the agent's own workflows. The API gives the job name; when it also gives the name of the
 * workflow, that decides first.
 */
function isOwnCheck(checkRun) {
  const workflow = checkRun?.workflow_name ?? checkRun?.check_suite?.workflow_name
  if (typeof workflow === 'string' && workflow.startsWith(OWN_WORKFLOW_PREFIX)) return true
  return OWN_JOBS.has(String(checkRun?.name ?? '').trim().toLowerCase())
}

/** The check runs that count as CI: all but the agent's own. */
const relevantChecks = (checkRuns) => (checkRuns ?? []).filter((run) => !isOwnCheck(run))

/** The workflow run id and the job id from a link like `.../actions/runs/<run>/job/<job>`; `null`s when absent. */
function actionsIds(url) {
  const match = /\/actions\/runs\/(\d+)(?:\/job\/(\d+))?/.exec(String(url ?? ''))
  return { runId: match ? Number(match[1]) : null, jobId: match?.[2] ? Number(match[2]) : null }
}

/**
 * What is not finished yet: check runs that are not `completed` and statuses that are `pending`. Judge the single
 * statuses: GitHub reports the combined state `pending` also when a commit has no status at all.
 *
 * @returns {Array<{ name: string, state: string }>}
 */
// The verdict job of ci.yml. The first workflow to finish can trigger the gate before CI has created its check runs,
// so the gate waits until this one exists and has finished.
const REQUIRED_CHECKS = ['ci-ok']

function pendingChecks(checkRuns, statuses) {
  const runs = checkRuns ?? []
  return [
    ...runs.filter((r) => r.status !== 'completed').map((r) => ({ name: r.name, state: r.status })),
    // A cancelled check was stopped by a person or by a newer push: the gate waits instead of fixing it.
    ...runs.filter((r) => r.status === 'completed' && r.conclusion === 'cancelled')
      .map((r) => ({ name: r.name, state: 'cancelled' })),
    ...REQUIRED_CHECKS.filter((name) => !runs.some((r) => r.name === name)).map((name) => ({ name, state: 'missing' })),
    ...(statuses ?? []).filter((s) => s.state === 'pending').map((s) => ({ name: s.context, state: 'pending' })),
  ]
}

/**
 * The checks that did not succeed, sorted by name. A check run fails with any conclusion but success, neutral, and
 * skipped; a status fails as `failure` or `error`. For a GitHub Actions check run `jobId` is the id of the job (the id
 * of the check run), found also in the link, and `runId` the id of its workflow run; both are `null` for other apps.
 *
 * @returns {Array<{ kind: 'check'|'status', name: string, conclusion: string, url: string|null, jobId: number|null,
 *   runId: number|null }>}
 */
function failedChecks(checkRuns, statuses) {
  const failed = []
  for (const run of checkRuns ?? []) {
    if (run.status !== 'completed' || GREEN_CONCLUSIONS.has(run.conclusion) || run.conclusion === 'cancelled') continue
    const ids = actionsIds(run.details_url)
    const isActions = run.app?.slug === 'github-actions'
    failed.push({
      kind: 'check',
      name: run.name,
      conclusion: run.conclusion ?? 'unknown',
      url: run.html_url ?? run.details_url ?? null,
      jobId: ids.jobId ?? (isActions ? run.id : null),
      runId: ids.runId,
    })
  }
  for (const status of statuses ?? []) {
    if (status.state !== 'failure' && status.state !== 'error') continue
    failed.push({
      kind: 'status',
      name: status.context,
      conclusion: status.state,
      url: status.target_url ?? null,
      jobId: null,
      runId: null,
    })
  }
  return failed.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/** True when there is at least one check and none is pending or failed. */
function allGreen(checkRuns, statuses) {
  if ((checkRuns ?? []).length + (statuses ?? []).length === 0) return false
  return pendingChecks(checkRuns, statuses).length === 0 && failedChecks(checkRuns, statuses).length === 0
}

/** True when every failed check is an E2E job, which flakes more than the rest. */
const isE2eOnly = (failed) => failed.length > 0 && failed.every((f) => f.kind === 'check' && /e2e/i.test(f.name))

// ---------------------------------------------------------------------------------------------------------------
// Logs: errors, signature, report
// ---------------------------------------------------------------------------------------------------------------

const TIMESTAMP = /^\ufeff?\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z\s?/
const ERROR_LINE = /##\[error\]|\bFAIL\b|Error:|error:|[Ff]ailed|✖|AssertionError/
const NOT_AN_ERROR = /\b0 (?:failed|errors?)\b|\bfailed: 0\b/i
const FAILED_TASKS = /Failed tasks/i
/** Lines of context kept before a match, after it, and after an Nx "Failed tasks" heading, which lists the tasks. */
const CONTEXT_BEFORE = 2
const CONTEXT_AFTER = 3
const FAILED_TASKS_AFTER = 15

/** One log line without ANSI sequences, the timestamp Actions puts in front, and the line end. */
const cleanLine = (line) => stripAnsi(line).replace(/\r$/, '').replace(TIMESTAMP, '')

/** True for a line that reports an error or a failure. */
const isErrorLine = (line) => ERROR_LINE.test(line) && !NOT_AN_ERROR.test(line)

/**
 * The lines of a job log that matter: every error line with a little context, the Nx "Failed tasks" block, without
 * ANSI sequences, timestamps, and blank lines, at most `maxLines` (the first ones; the cause comes before its
 * consequences). Windows that do not touch are separated by `...`.
 *
 * @param {string} logText
 * @param {{ maxLines?: number }} [options]
 * @returns {string[]}
 */
function extractErrors(logText, { maxLines = MAX_JOB_LINES } = {}) {
  const lines = String(logText ?? '').split('\n').map(cleanLine)
  const keep = new Array(lines.length).fill(false)
  lines.forEach((line, i) => {
    if (!isErrorLine(line) && !FAILED_TASKS.test(line)) return
    const after = FAILED_TASKS.test(line) ? FAILED_TASKS_AFTER : CONTEXT_AFTER
    for (let j = Math.max(0, i - CONTEXT_BEFORE); j <= Math.min(lines.length - 1, i + after); j += 1) keep[j] = true
  })
  const picked = []
  let gap = false
  lines.forEach((line, i) => {
    if (!keep[i]) {
      gap = picked.length > 0
      return
    }
    if (line.trim() === '') return
    if (gap) picked.push('...')
    gap = false
    picked.push(line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS - 3)}...` : line)
  })
  if (picked.length <= maxLines) return picked
  return [...picked.slice(0, maxLines - 1), `[cut: ${picked.length - (maxLines - 1)} more lines]`]
}

/** Limits the lines of all jobs together: the first job in `order` keeps its lines, the later ones get what is left. */
function capTotalLines(errorsByJob, order, total = MAX_TOTAL_LINES) {
  const result = {}
  let left = total
  for (const name of order) {
    const lines = errorsByJob[name]
    if (!lines) continue
    if (left <= 0) {
      result[name] = ['[cut: the total limit of log lines is spent]']
      continue
    }
    result[name] = lines.length <= left
      ? lines
      : [...lines.slice(0, left - 1), `[cut: ${lines.length - left + 1} more lines]`]
    left -= result[name].length
  }
  return result
}

const TEMP_PATH = /(?:\/tmp|\/var\/folders|\/home\/runner\/work\/_temp|[A-Za-z]:\\(?:[^\s\\]+\\)*Temp)[^\s'"():,;]*/g
const DURATION = /\b\d+(?:\.\d+)?\s?(?:ms|µs|ns|seconds|secs|sec|minutes|mins|min|hours|s|m|h)\b/gi

/**
 * A log line with what changes from run to run replaced by placeholders: timestamps, temporary paths, durations,
 * line and column numbers, hex ids of 7 or more characters, and all other numbers. Two runs of the same failure give
 * the same text.
 */
function normalizeLine(line) {
  return cleanLine(String(line))
    .replace(TEMP_PATH, '<tmp>')
    .replace(DURATION, '<dur>')
    .replace(/(\.[A-Za-z0-9]+):\d+(?::\d+)?/g, '$1:<pos>')
    .replace(/\(\d+,\d+\)/g, '(<pos>)')
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{7,}\b/gi, '<hex>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The first error lines of a job for the signature: the lines that report errors; when the log has none, its first
 * non-blank lines.
 */
function signatureLines(lines) {
  const errors = (lines ?? []).filter(isErrorLine)
  const chosen = errors.length > 0 ? errors : (lines ?? []).filter((l) => l.trim() !== '' && l !== '...')
  return chosen.slice(0, SIGNATURE_LINES).map(normalizeLine)
}

/**
 * The signature of a failure: the first 12 hex characters of the SHA-1 of the sorted names of the failed checks and
 * the first 5 normalized error lines of each. The same failure gives the same signature in every run.
 *
 * @param {Array<{ name: string }>} failed
 * @param {Record<string, string[]>} errorsByJob the extracted error lines per check name
 */
function failureSignature(failed, errorsByJob) {
  const names = failed.map((f) => f.name).sort()
  const parts = [names.join('\n')]
  for (const name of names) parts.push(`${name}\n${signatureLines(errorsByJob?.[name]).join('\n')}`)
  return crypto.createHash('sha1').update(parts.join('\n--\n')).digest('hex').slice(0, SIGNATURE_LENGTH)
}

/** The first error line of the first failed check that has one, for the request to a person. */
function firstError(failed, errorsByJob) {
  for (const f of failed) {
    const line = (errorsByJob?.[f.name] ?? []).find(isErrorLine)
    if (line) return { check: f.name, line: line.length > 200 ? `${line.slice(0, 197)}...` : line }
  }
  return { check: failed[0]?.name ?? 'the failed check', line: null }
}

/**
 * The CI report in Markdown, at most `max` characters: the commit, the signature, the failed checks, and the error
 * lines of each job in a code fence. It goes to the state and to the artifacts, and, inside `untrusted()`, to the
 * implementer.
 *
 * @param {{ pr: number, headSha: string, failed: object[], errorsByJob: Record<string, string[]>,
 *   notes?: Record<string, string>, signature: string, max?: number }} input `notes` says why a log is missing
 */
function buildReport({ pr, headSha, failed, errorsByJob, notes = {}, signature, max = MAX_REPORT_CHARS }) {
  const listed = failed.slice(0, MAX_LISTED_CHECKS)
  const head = [
    `# CI report for pull request #${pr}`,
    '',
    `- Commit: \`${String(headSha).slice(0, 12)}\``,
    `- Failure signature: \`${signature}\``,
    `- Failed checks: ${failed.length}`,
    '',
    '## Failed checks',
    '',
    ...listed.map((f) => `- \`${code(f.name)}\`: ${f.conclusion}${f.url ? ` (${f.url})` : ''}`),
    ...(failed.length > listed.length ? [`- and ${failed.length - listed.length} more`] : []),
    '',
  ]
  const headText = head.join('\n')
  const withLogs = listed.filter((f) => errorsByJob[f.name] || notes[f.name])
  const budget = Math.max(300, Math.floor((max - headText.length) / Math.max(1, withLogs.length)) - 160)
  const sections = []
  for (const f of withLogs) {
    const body = errorsByJob[f.name]
      ? clip(errorsByJob[f.name].join('\n'), budget)
      : notes[f.name]
    sections.push(`## Errors of \`${code(f.name)}\`\n\n${errorsByJob[f.name] ? fence(body, 'text') : inline(body)}\n`)
  }
  const text = `${headText}\n${sections.join('\n')}`.replace(/\n+$/, '\n')
  return text.length <= max ? text : `${text.slice(0, max - 40)}\n[cut: the report is too long]\n`
}

// ---------------------------------------------------------------------------------------------------------------
// The stop rule
// ---------------------------------------------------------------------------------------------------------------

/** The most recent signature recorded on an attempt, or `null`. */
function lastSignature(attempts) {
  for (let i = (attempts ?? []).length - 1; i >= 0; i -= 1) if (attempts[i].signature) return attempts[i].signature
  return null
}

/**
 * The attempts that count against `AGENT_MAX_ATTEMPTS`: the first one and the CI fixes, not a person's attempts. Only
 * the attempts from index `from` on count: a person who steers the agent (`/agent retry`, an answer, a change request)
 * gives the loop a fresh budget, and the preflight records the index as `budgetFrom` in the state.
 */
const countedAttempts = (attempts, from = 0) =>
  (attempts ?? []).slice(from).filter((a) => a.kind === 'initial' || a.kind === 'ci-fix').length

/**
 * What to do with a red result, in this order: the same signature as the latest recorded one means no progress, and
 * the agent stops whatever the budget; attempts spent stop it too; else it tries again.
 *
 * @param {{ state: object, signature: string, config: { limits: { maxAttempts: number } } }} input
 * @returns {{ action: 'stop', reason: 'same-failure'|'budget' } | { action: 'next-attempt', reason: 'new-failure' }}
 */
function stopDecision({ state: st, signature, config }) {
  if (lastSignature(st.attempts) === signature) return { action: 'stop', reason: 'same-failure' }
  if (countedAttempts(st.attempts, st.budgetFrom) >= config.limits.maxAttempts) {
    return { action: 'stop', reason: 'budget' }
  }
  return { action: 'next-attempt', reason: 'new-failure' }
}

// ---------------------------------------------------------------------------------------------------------------
// The state after a decision
// ---------------------------------------------------------------------------------------------------------------

/** The latest attempt gets the result, and, for a red one, the signature. The input is not changed. */
function withLastAttempt(st, patch) {
  const attempts = [...(st.attempts ?? [])]
  if (attempts.length > 0) attempts[attempts.length - 1] = { ...attempts[attempts.length - 1], ...patch }
  return { ...st, attempts }
}

const decided = (sha, at, run) => ({ sha, decided: true, at, run })

/** Green: the work is done. The report of an earlier failure goes; the attempts keep their history. */
function greenState(st, { sha, at, run }) {
  const { lastCiReport: _report, ...rest } = withLastAttempt(st, { result: 'ci-green' })
  return { ...rest, phase: 'completed', ciGate: decided(sha, at, run) }
}

/** Red and stopped: a person takes over. */
function stoppedState(st, { signature, report, sha, at, run }) {
  return {
    ...withLastAttempt(st, { result: 'ci-red', signature }),
    phase: 'needs-human',
    lastCiReport: report,
    ciGate: decided(sha, at, run),
  }
}

/** Red and another attempt: the same phase and shape as the preflight of `implement.js` writes. */
function nextAttemptState(st, { signature, report, sha, at, run, actor }) {
  return {
    ...withLastAttempt(st, { result: 'ci-red', signature }),
    phase: 'implementing',
    implementing: { run, actor, at, kind: 'ci-fix' },
    lastCiReport: report,
    ciGate: decided(sha, at, run),
  }
}

/** Red, only E2E jobs, the free rerun is used: the decision is left for the run that ends. */
const rerunState = (st) => ({ ...st, e2eReruns: (st.e2eReruns ?? 0) + 1 })

/** Why the gate does nothing for this pull request, or `null` when it may go on. */
function gateGuard({ st, pull, expectedPr, expectedSha }) {
  if (st.phase !== 'waiting-ci') return `the issue is in the phase '${st.phase}', not 'waiting-ci'`
  if (st.pr !== pull.number || (expectedPr && Number(expectedPr) !== pull.number)) {
    return `the state names pull request #${st.pr ?? 'none'}, not #${pull.number}`
  }
  if (pull.state !== 'open') return `pull request #${pull.number} is not open`
  if (expectedSha && expectedSha !== pull.head?.sha) return 'a newer commit is on the branch; its checks decide'
  return null
}

// ---------------------------------------------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------------------------------------------

const reasonSentence = (reason, max) =>
  reason === 'same-failure'
    ? 'The last attempt failed in the same way as the one before it, so another try would repeat it.'
    : `I used all ${max} attempts, and CI is still red.`

/** The table of every attempt for the hand-off. */
function attemptsTable(attempts) {
  const rows = (attempts ?? []).map(
    (a) => {
      const signature = a.signature ? `\`${a.signature}\`` : ''
      return `| ${a.n ?? ''} | ${cell(a.kind, 20)} | ${cell(a.result, 20)} | ${signature} | ${cell(a.notes)} |`
    },
  )
  return ['| # | Kind | Result | Signature | Notes |', '|---|---|---|---|---|', ...rows]
}

const failedList = (failed) =>
  failed.slice(0, MAX_LISTED_CHECKS).map((f) => {
    const link = f.url ? ` ([log](${f.url}))` : ''
    return `- \`${code(f.name)}\`: ${f.conclusion}${link}`
  })

/** The state comment after a green result. */
function renderGreen({ pr, headSha, attempts, readyError, runUrl, totalUsd }) {
  return [
    `### AI implementation: CI is green on pull request #${pr}`,
    '',
    `Every check of commit \`${String(headSha).slice(0, 12)}\` passed after ${attempts} attempt(s). A person reviews ` +
      'and merges the pull request.',
    ...(readyError
      ? ['', `I could not mark the pull request ready for review: ${inline(readyError)} Mark it ready yourself.`]
      : []),
    '',
    costLine(runUrl, totalUsd, 'the issue closes when the pull request is merged'),
  ].join('\n')
}

/** The state comment of the hand-off: every attempt and the current failure. */
function renderStopped({ pr, reason, max, attempts, failed, report, runUrl, totalUsd }) {
  return [
    `### AI implementation needs a person: CI is red on pull request #${pr}`,
    '',
    `I stopped. ${reasonSentence(reason, max)}`,
    '',
    '**Attempts**',
    '',
    ...attemptsTable(attempts),
    '',
    '**Current failure**',
    '',
    ...failedList(failed),
    '',
    '<details><summary>CI report</summary>',
    '',
    clip(report, COMMENT_REPORT_CHARS),
    '',
    '</details>',
    '',
    '**What I need from you:** look at the failure, push a fix to the branch, or comment `/agent retry` with ' +
      'guidance to let me try again.',
    '',
    costLine(runUrl, totalUsd, 'comment `/agent retry` with guidance to try again'),
  ].join('\n')
}

/** The state comment while the next attempt runs. */
function renderNextAttempt({ pr, n, max, failed, runUrl, totalUsd }) {
  return [
    `### AI implementation: CI is red on pull request #${pr}`,
    '',
    `Attempt ${n} of ${max} fixes it. The failed checks:`,
    '',
    ...failedList(failed),
    '',
    costLine(runUrl, totalUsd, `the run of attempt ${n} follows`),
  ].join('\n')
}

/** The state comment while the free rerun of the E2E jobs runs. */
function renderRerun({ pr, failed, runUrl, totalUsd }) {
  return [
    `### AI implementation: waiting for CI on pull request #${pr}`,
    '',
    'Only E2E jobs failed. I reran them once, because they flake. The failed jobs:',
    '',
    ...failedList(failed),
    '',
    costLine(runUrl, totalUsd, 'the result of the rerun decides'),
  ].join('\n')
}

/** The comment that notifies the person when CI is green. */
const greenComment = ({ actor, pr }) => `@${actor}, CI is green on #${pr}. A person reviews and merges it.`

/** The comment that notifies the person on a stop: why, and one concrete request. */
function stopComment({ actor, pr, reason, max, failed, errorsByJob }) {
  const first = firstError(failed, errorsByJob)
  const look = first.line
    ? `Look at \`${code(first.check)}\`: \`${code(first.line)}\`.`
    : `Look at \`${code(first.check)}\`; its log has no error line I could read.`
  return [
    `@${actor}, I stopped on #${pr}. ${reasonSentence(reason, max)}`,
    '',
    `${look} Comment \`/agent retry\` with guidance to let me try again.`,
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------------------------------------------

function requireEnv(env, name) {
  if (!env[name]) throw new Error(`${name} is not set`)
  return env[name]
}

/** Reads the log of every failed Actions job (the first ones) and extracts its errors. A missing log is reported. */
async function collectLogs(gh, failed) {
  const errorsByJob = {}
  const notes = {}
  const readable = failed.filter((f) => f.jobId !== null)
  for (const f of readable.slice(0, MAX_LOG_JOBS)) {
    try {
      const text = await gh.getJobLog(f.jobId)
      errorsByJob[f.name] = extractErrors(text)
      log.info('job log read', { job: f.name, lines: errorsByJob[f.name].length })
    } catch (err) {
      notes[f.name] = `The log of this job is not available: ${err.message}`
      log.warn(`The log of '${f.name}' could not be read: ${err.message}`)
    }
  }
  for (const f of readable.slice(MAX_LOG_JOBS)) notes[f.name] = 'The log of this job is not read: too many failed jobs.'
  return { errorsByJob: capTotalLines(errorsByJob, failed.map((f) => f.name)), notes }
}

/** The workflow runs to rerun: the runs of the failed E2E jobs, or the run that triggered the gate. */
function rerunTargets(failed, fallbackRunId) {
  const ids = [...new Set(failed.map((f) => f.runId).filter((id) => id !== null))]
  if (ids.length > 0) return ids
  return fallbackRunId && Number(fallbackRunId) ? [Number(fallbackRunId)] : []
}

/**
 * Decides once for the head commit of the pull request. `deps.gh` is the client of GITHUB_TOKEN, `deps.patGh` the
 * client of AGENT_PAT (only a green result of a draft pull request uses it).
 *
 * @returns {Promise<{ outcome: 'skipped'|'waiting'|'already-decided'|'superseded'|'green'|'rerun'|'stopped'
 *   |'next-attempt', reason?: string, next?: string }>}
 */
async function gate(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const repo = env.GITHUB_REPOSITORY
  fs.mkdirSync(out, { recursive: true })
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo })
  log.info('ci gate starts', {
    issue: number,
    pr: env.AGENT_PR || 'from the state',
    sha: env.AGENT_HEAD_SHA || 'from the pull request',
    workflowRun: env.AGENT_WORKFLOW_RUN_ID || 'none',
    dryRun: config.dryRun,
    maxAttempts: config.limits.maxAttempts,
  })
  const finishWith = (result) => {
    writeOutputs(env, { outcome: result.outcome, next: result.next ?? '' })
    return result
  }
  const skipped = (reason) => {
    log.info('decision', { action: 'exit: nothing to decide', reason })
    appendSummary(env, `- CI gate for #${number} did nothing: ${reason}\n`)
    return finishWith({ outcome: 'skipped', reason })
  }

  const loaded = await log.group('Load the issue and its state', () => loadIssue(gh, number))
  let st = loaded.st
  const prNumber = Number(env.AGENT_PR || st.pr)
  if (!prNumber) return skipped('the state names no pull request')
  const pull = await log.group('Load the pull request', () => gh.getPull(prNumber))
  const headSha = env.AGENT_HEAD_SHA || pull.head.sha

  const guard = gateGuard({ st, pull, expectedPr: env.AGENT_PR, expectedSha: env.AGENT_HEAD_SHA })
  if (guard) return skipped(guard)
  const actor = state.actorOf(st)
  if (!actor) throw new Error('Nobody is recorded as the person who asked for this implementation')

  const checks = await log.group('Collect the checks', async () => {
    const checkRuns = relevantChecks(await gh.listCheckRuns(headSha))
    const combined = await gh.getCombinedStatus(headSha)
    log.info('checks', { sha: headSha, checkRuns: checkRuns.length, statuses: combined.statuses.length })
    return { checkRuns, statuses: combined.statuses }
  })
  const { checkRuns, statuses } = checks

  const pending = pendingChecks(checkRuns, statuses)
  if (pending.length > 0 || checkRuns.length + statuses.length === 0) {
    const what = pending.length > 0 ? pending.map((p) => `${p.name} (${p.state})`).join(', ') : 'no check reported yet'
    log.info('decision', { action: 'wait', pending: what })
    appendSummary(env, `- CI gate for #${prNumber} waits: ${what}\n`)
    return finishWith({ outcome: 'waiting', reason: what })
  }
  if (st.ciGate?.sha === headSha && st.ciGate.decided) {
    log.info('decision', { action: 'exit: already decided', sha: headSha, at: st.ciGate.at })
    appendSummary(env, `- CI gate for #${prNumber}: already decided for \`${headSha.slice(0, 12)}\`\n`)
    return finishWith({ outcome: 'already-decided' })
  }

  const at = new Date().toISOString()
  const ctx = { config, env, deps, gh, out, number, prNumber, pull, headSha, actor, runUrl, repo, at, loaded, checkRuns,
    statuses }
  if (allGreen(checkRuns, statuses)) return finishWith(await handleGreen({ ...ctx, st }))
  return finishWith(await handleRed({ ...ctx, st }))

}

/**
 * True when a newer commit is on the branch than the one the checks were collected for. The gate reads the checks and
 * the logs for minutes, and a push in between makes its verdict about an old commit: it writes nothing then, and the
 * checks of the newer commit start their own gate run.
 */
async function supersededBy({ gh, prNumber, headSha }) {
  const fresh = await gh.getPull(prNumber)
  if (fresh.head?.sha === headSha) return null
  log.info('decision', { action: 'exit: superseded', collectedFor: headSha, head: fresh.head?.sha })
  return fresh.head?.sha ?? 'unknown'
}

/** The result of a gate run that stops because of a newer commit; the summary says so. */
function supersededResult(ctx, newSha) {
  const reason = `a newer commit (${String(newSha).slice(0, 12)}) is on the branch; its checks decide`
  const sha = ctx.headSha.slice(0, 12)
  appendSummary(ctx.env, `- CI gate for #${ctx.prNumber} wrote nothing for \`${sha}\`: ${reason}\n`)
  return { outcome: 'superseded', reason }
}

/** Writes the state comment: edits the one that exists, else creates it. */
async function writeState({ gh, number, loaded, human, st }) {
  const body = state.render(human, st)
  if (loaded.existing) {
    await gh.updateIssueComment(loaded.existing.id, body)
    log.info('state comment written', { id: loaded.existing.id, phase: st.phase })
  } else {
    const created = await gh.createIssueComment(number, body)
    log.info('state comment written', { id: created?.id ?? 'new', phase: st.phase })
  }
}

async function handleGreen(ctx) {
  const { config, env, deps, gh, number, prNumber, pull, headSha, actor, runUrl, repo, at, out } = ctx
  const labelChanges = {
    pull: { add: [LABEL_COMPLETED, LABEL_L1], remove: [LABEL_NEEDS_HUMAN] },
    issue: { add: [LABEL_COMPLETED], remove: [LABEL_NEEDS_HUMAN] },
  }
  log.info('decision', { action: 'green', sha: headSha, draft: pull.draft })
  const newer = await supersededBy({ gh, prNumber, headSha })
  if (newer) return supersededResult(ctx, newer)

  let readyError = null
  if (pull.draft && !config.dryRun) {
    await log.group('Mark the pull request ready for review', async () => {
      try {
        if (!env.AGENT_PAT && !deps.patGh) throw new Error('AGENT_PAT is not set')
        const patGh = deps.patGh ?? createClient({ token: env.AGENT_PAT, repo })
        await patGh.markPullReady(pull.node_id)
        log.info('pull request is ready for review', { pr: prNumber })
      } catch (err) {
        readyError = err
        log.error(`The pull request could not leave draft: ${err.message}`)
      }
    })
  }

  const st = greenState(ctx.st, { sha: headSha, at, run: runUrl })
  const totalUsd = sum(st.costs ?? [], 'usd')
  const human = renderGreen({
    pr: prNumber,
    headSha,
    attempts: (st.attempts ?? []).length,
    readyError: readyError?.message,
    runUrl,
    totalUsd,
  })
  const note = greenComment({ actor, pr: prNumber })
  fs.writeFileSync(path.join(out, 'summary.md'), human)

  if (config.dryRun) {
    const report = [`## Dry run: CI gate for #${number}`, '', human, '']
    report.push(`- pull request ${pull.draft ? 'leaves draft' : 'is already ready for review'}`)
    report.push(`- labels on #${prNumber}: add ${labelChanges.pull.add.join(', ')}; remove ${labelChanges.pull.remove}`)
    report.push(`- labels on #${number}: add ${labelChanges.issue.add.join(', ')}; remove ${labelChanges.issue.remove}`)
    report.push('')
    report.push(quoted('### Comment that would notify the person who asked', note))
    report.push('### State', '', fence(JSON.stringify(st, null, 2), 'json'), '')
    appendSummary(env, report.join('\n'))
    log.info('dry run: nothing written to GitHub')
    return { outcome: 'green' }
  }

  await log.group('Write the state comment', () => writeState({ gh, number, loaded: ctx.loaded, human, st }))
  await log.group('Apply the labels', async () => {
    await gh.addLabels(prNumber, labelChanges.pull.add)
    for (const label of labelChanges.pull.remove) await gh.removeLabel(prNumber, label)
    await gh.addLabels(number, labelChanges.issue.add)
    for (const label of labelChanges.issue.remove) await gh.removeLabel(number, label)
    log.info('labels applied', { pr: prNumber, issue: number })
  })
  await log.group('Tell the person who asked', async () => {
    await gh.createIssueComment(number, note)
    log.info('comment posted', { mention: actor, result: 'green' })
  })
  if (readyError) throw readyError
  return { outcome: 'green' }
}

async function handleRed(ctx) {
  const { config, env, gh, number, prNumber, headSha, actor, runUrl, at, out, checkRuns, statuses } = ctx
  const failed = failedChecks(checkRuns, statuses)
  log.info('decision', { action: 'red', failed: failed.map((f) => `${f.name}:${f.conclusion}`).join(', ') })

  const { errorsByJob, notes } = await log.group('Read the logs of the failed jobs', () => collectLogs(gh, failed))
  const signature = failureSignature(failed, errorsByJob)
  const report = buildReport({ pr: prNumber, headSha, failed, errorsByJob, notes, signature })
  fs.writeFileSync(path.join(out, 'ci-report.md'), report)
  log.info('ci report', { signature, characters: report.length, failed: failed.length })
  const newer = await supersededBy({ gh, prNumber, headSha })
  if (newer) return supersededResult(ctx, newer)
  let st = ctx.st
  const totalUsd = sum(st.costs ?? [], 'usd')

  // 1. The free rerun of a red result that only E2E jobs caused.
  const reruns = st.e2eReruns ?? 0
  const targets = rerunTargets(failed, ctx.env.AGENT_WORKFLOW_RUN_ID)
  if (isE2eOnly(failed) && reruns < MAX_E2E_RERUNS && targets.length > 0) {
    log.info('decision', { action: 'rerun the failed E2E jobs once', runs: targets.join(','), reruns })
    st = rerunState(st)
    const human = renderRerun({ pr: prNumber, failed, runUrl, totalUsd })
    if (config.dryRun) {
      appendSummary(env, [`## Dry run: CI gate for #${number}`, '', human, '',
        `Would rerun the failed jobs of workflow run(s) ${targets.join(', ')}.`, ''].join('\n'))
      return { outcome: 'rerun' }
    }
    await log.group('Rerun the failed E2E jobs', async () => {
      for (const id of targets) await gh.rerunFailedJobs(id)
      log.info('rerun requested', { runs: targets.join(',') })
    })
    await log.group('Write the state comment', () => writeState({ gh, number, loaded: ctx.loaded, human, st }))
    return { outcome: 'rerun' }
  }
  if (isE2eOnly(failed)) {
    log.info('rerun skipped', { reruns, targets: targets.length, why: reruns >= MAX_E2E_RERUNS ? 'used' : 'no run id' })
  }

  // 2. The stop rule.
  const decision = stopDecision({ state: st, signature, config })
  log.info('decision', {
    stage: 'stop rule',
    action: decision.action,
    reason: decision.reason,
    signature,
    previous: lastSignature(st.attempts) ?? 'none',
    attempts: countedAttempts(st.attempts, st.budgetFrom),
    max: config.limits.maxAttempts,
  })
  const max = config.limits.maxAttempts

  if (decision.action === 'stop') {
    const next = stoppedState(st, { signature, report, sha: headSha, at, run: runUrl })
    const human = renderStopped({
      pr: prNumber, reason: decision.reason, max, attempts: next.attempts, failed, report, runUrl, totalUsd,
    })
    const note = stopComment({ actor, pr: prNumber, reason: decision.reason, max, failed, errorsByJob })
    if (config.dryRun) {
      const lines = [`## Dry run: CI gate for #${number}`, '', human, '',
        `- labels on #${prNumber} and #${number}: add ${LABEL_NEEDS_HUMAN}`, '',
        quoted('### Comment that would notify the person who asked', note),
        '### State', '', fence(JSON.stringify(next, null, 2), 'json'), '']
      appendSummary(env, lines.join('\n'))
      return { outcome: 'stopped', reason: decision.reason }
    }
    await log.group('Write the state comment', () => writeState({ gh, number, loaded: ctx.loaded, human, st: next }))
    await log.group('Apply the labels', async () => {
      await gh.addLabels(number, [LABEL_NEEDS_HUMAN])
      await gh.addLabels(prNumber, [LABEL_NEEDS_HUMAN])
      log.info('labels applied', { add: LABEL_NEEDS_HUMAN, on: `#${number} and #${prNumber}` })
    })
    await log.group('Tell the person who asked', async () => {
      await gh.createIssueComment(number, note)
      log.info('comment posted', { mention: actor, result: 'stopped', reason: decision.reason })
    })
    return { outcome: 'stopped', reason: decision.reason }
  }

  const next = nextAttemptState(st, { signature, report, sha: headSha, at, run: runUrl, actor })
  const attemptNo = countedAttempts(st.attempts, st.budgetFrom) + 1
  const human = renderNextAttempt({ pr: prNumber, n: attemptNo, max, failed, runUrl, totalUsd })
  if (config.dryRun) {
    appendSummary(env, [`## Dry run: CI gate for #${number}`, '', human, '',
      'The next attempt would start (`next=implement`); a dry run starts none.', '',
      '### State', '', fence(JSON.stringify(next, null, 2), 'json'), ''].join('\n'))
    return { outcome: 'next-attempt' }
  }
  await log.group('Write the state comment', () => writeState({ gh, number, loaded: ctx.loaded, human, st: next }))
  log.info('next attempt', { attempt: attemptNo, of: max })
  return { outcome: 'next-attempt', next: 'implement' }
}

// ---------------------------------------------------------------------------------------------------------------

async function main(env = process.env, deps = {}) {
  return gate(env, deps)
}

if (require.main === module) {
  main().catch((err) => {
    log.error(err?.message ?? String(err))
    console.error(err)
    process.exit(1)
  })
}

module.exports = {
  main,
  gate,
  isOwnCheck,
  relevantChecks,
  actionsIds,
  pendingChecks,
  failedChecks,
  allGreen,
  isE2eOnly,
  isErrorLine,
  extractErrors,
  capTotalLines,
  normalizeLine,
  failureSignature,
  firstError,
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
}
