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
 *      signature. A red result made only of E2E jobs (the verdict check `ci-ok` aside) is rerun once per commit for
 *      free. Otherwise the stop rule decides: the same signature as the attempt before, or the attempts spent, hands
 *      the issue to a person (`agent:needs-human`, the whole history in the state comment, one concrete request);
 *      anything else starts the next attempt (`next=implement` for the `implement` job, which runs with
 *      `AGENT_KIND=ci-fix`).
 *
 * The decision is recorded in the state (`ciGate`), so a second workflow run of the same commit does nothing. Right
 * before the first write the gate reads the pull request and the state comment again: a newer commit ends the run as
 * `superseded`, and a phase other than `waiting-ci` (a `/agent stop` came in) ends it as `state-changed`; neither
 * writes anything. In dry-run nothing is written to GitHub and no attempt starts; the job summary shows the decision.
 * Check logs contain the output of code the model wrote, so they are untrusted: the report reaches a model only inside
 * `untrusted()`.
 *
 * `node tools/agent/ci-gate.js rerun` is the second mode, the command `/agent rerun` (the `rerun` job): it reruns the
 * failed checks of the pull request of the agent, puts the phase back to `waiting-ci` so that the gate decides this
 * commit again, and answers the person. It is no attempt and uses no model; see `rerunCommand`.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, AGENT_PAT (green result of a draft pull request only), AGENT_NUMBER
 * (the issue), AGENT_PR and AGENT_HEAD_SHA (from the router), AGENT_WORKFLOW_RUN_ID, AGENT_RUN_URL, AGENT_OUT (folder
 * for the report), the AGENT_* variables of lib/config.js, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY. The `rerun` mode also
 * reads AGENT_ACTOR (who asked) and AGENT_COMMENT_ID (the comment that gets the reactions).
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
const { react, commentIdOf } = require('./lib/reactions')
const {
  fence, appendSummary, writeOutputs, quoted, costLine, loadIssue, refusalReply, waysOnLines, BUSY_MS,
} = require('./implement')

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
/** Free reruns of failed E2E jobs per head commit. */
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

/**
 * True when every failed check, the verdict check `ci-ok` aside, is an E2E job, which flakes more than the rest. The
 * verdict job fails together with E2E, so it does not count; at least one other failed check must remain.
 */
function isE2eOnly(failed) {
  const rest = failed.filter((f) => !(f.kind === 'check' && REQUIRED_CHECKS.includes(f.name)))
  return rest.length > 0 && rest.every((f) => f.kind === 'check' && /e2e/i.test(f.name))
}

/** True when the free E2E rerun of the head commit `sha` is still unused. */
const e2eRerunLeft = (st, sha) => st.e2eRerun?.sha !== sha || (st.e2eRerun.count ?? 0) < MAX_E2E_RERUNS

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

/** The ANSI sequence (bold cyan) that Actions puts in front of each echoed line of a step script. */
const SCRIPT_ECHO = '\u001b[36;1m'

/** True for a raw log line that echoes a step script: the text after the timestamp starts with `SCRIPT_ECHO`. */
const isScriptEcho = (line) => line.replace(/\r$/, '').replace(TIMESTAMP, '').startsWith(SCRIPT_ECHO)

/** One log line without ANSI sequences, the timestamp Actions puts in front, and the line end. */
const cleanLine = (line) => stripAnsi(line).replace(/\r$/, '').replace(TIMESTAMP, '')

/** True for a line that reports an error or a failure. */
const isErrorLine = (line) => ERROR_LINE.test(line) && !NOT_AN_ERROR.test(line)

/**
 * The lines of a job log that matter: every error line with a little context, the Nx "Failed tasks" block, without
 * ANSI sequences, timestamps, echoed step scripts, and blank lines, at most `maxLines` (the first ones; the cause
 * comes before its consequences). Windows that do not touch are separated by `...`.
 *
 * @param {string} logText
 * @param {{ maxLines?: number }} [options]
 * @returns {string[]}
 */
function extractErrors(logText, { maxLines = MAX_JOB_LINES } = {}) {
  // The echo of a step script (`echo "::error::..."`) holds the words of an error without being one.
  const lines = String(logText ?? '').split('\n').filter((line) => !isScriptEcho(line)).map(cleanLine)
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

const MAX_NAMED_CHECKS = 5

/** The names of the failed checks for a person: at most five, then "and N more". `total` counts the unlisted ones. */
function checkNames(failed, total = failed.length) {
  const shown = failed.slice(0, MAX_NAMED_CHECKS)
  const more = total - shown.length
  return `${shown.map((f) => `\`${code(f.name)}\``).join(', ')}${more > 0 ? `, and ${more} more` : ''}`
}

/** What a person reads first on a red CI: the failed checks, then the first error line of the first one that has it. */
function failureLines(failed, errorsByJob, total = failed.length) {
  const first = firstError(failed, errorsByJob)
  return [
    `Failed checks: ${checkNames(failed, total)}.`,
    first.line
      ? `First error, in \`${code(first.check)}\`: \`${code(first.line)}\`.`
      : `\`${code(first.check)}\` has no error line I could read.`,
  ]
}

/**
 * The failed checks and the error lines per check from a CI report written by `buildReport`, as `failureLines` wants
 * them. For a text about a CI report in another module, which has the report but not the logs.
 *
 * @returns {{ failed: Array<{ name: string }>, errorsByJob: Record<string, string[]>, total: number }}
 */
function reportFacts(report) {
  const text = String(report ?? '')
  const section = /## Failed checks\n\n([\s\S]*?)(?:\n## |$)/.exec(text)?.[1] ?? ''
  const failed = [...section.matchAll(/^- `(.+?)`: /gm)].map((m) => ({ name: m[1] }))
  const more = Number(/^- and (\d+) more$/m.exec(section)?.[1] ?? 0)
  const errorsByJob = {}
  for (const m of text.matchAll(/## Errors of `(.+?)`\n\n(`{3,})text\n([\s\S]*?)\n\2/g)) {
    errorsByJob[m[1]] = m[3].split('\n')
  }
  return { failed, errorsByJob, total: failed.length + more }
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

/**
 * Red, only E2E jobs, the free rerun of the commit `sha` is used: the decision is left for the run that ends. The
 * budget belongs to the commit, so a new commit starts from zero. An `e2eReruns` field of an older state is dropped.
 */
function rerunState(st, sha) {
  const { e2eReruns: _old, ...rest } = st
  return { ...rest, e2eRerun: { sha, count: (st.e2eRerun?.sha === sha ? st.e2eRerun.count ?? 0 : 0) + 1 } }
}

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

/**
 * The state comment of the hand-off: the failed checks, the first error, why the agent stopped, the two ways on, then
 * every attempt and the current failure.
 */
function renderStopped({ pr, reason, max, attempts, failed, errorsByJob = {}, report, runUrl, totalUsd }) {
  return [
    `### AI implementation needs a person: CI is red on pull request #${pr}`,
    '',
    ...failureLines(failed, errorsByJob).map((line) => `- ${line}`),
    `- Why I stopped: ${reasonSentence(reason, max)}`,
    '',
    ...waysOnLines(),
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
    costLine(runUrl, totalUsd, 'comment `/agent rerun` to rerun the checks, or `/agent retry` with guidance'),
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
    'Only E2E jobs failed. I reran them once for this commit, because they flake. The failed jobs:',
    '',
    ...failedList(failed),
    '',
    costLine(runUrl, totalUsd, 'the result of the rerun decides'),
  ].join('\n')
}

/** The comment that notifies the person when CI is green. */
const greenComment = ({ actor, pr }) => `@${actor}, CI is green on #${pr}. A person reviews and merges it.`

/** The comment that notifies the person on a stop: the failure, why the agent stopped, and the two ways on. */
function stopComment({ actor, pr, reason, max, failed, errorsByJob }) {
  return [
    `@${actor}, I stopped on #${pr}: CI is red.`,
    '',
    ...failureLines(failed, errorsByJob).map((line) => `- ${line}`),
    `- Why I stopped: ${reasonSentence(reason, max)}`,
    '',
    ...waysOnLines(),
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

/**
 * The phase the state comment holds now when it is not `waiting-ci` any more, else `null`. The gate loaded the state
 * before it collected the checks and the logs; a person may have stopped the work (`/agent stop`) or started another
 * attempt in the meantime, and the gate must not write over that.
 */
async function phaseMovedOn({ gh, number }) {
  const existing = state.findStateComment(await gh.listIssueComments(number))
  const phase = (existing && state.parse(existing.body))?.phase ?? null
  if (phase === 'waiting-ci') return null
  log.info('decision', { action: 'exit: state changed', phase: phase ?? 'none' })
  return phase ?? 'none'
}

/** The result of a gate run that stops because the state is not `waiting-ci` any more; the summary says so. */
function stateChangedResult(ctx, phase) {
  const reason = `the issue is in the phase '${phase}' now, not 'waiting-ci'; the gate leaves it alone`
  const sha = ctx.headSha.slice(0, 12)
  appendSummary(ctx.env, `- CI gate for #${ctx.prNumber} wrote nothing for \`${sha}\`: ${reason}\n`)
  return { outcome: 'state-changed', reason }
}

/**
 * The result that ends the run when the decision is stale, else `null`. Called right before the first write: a newer
 * commit makes the verdict about an old commit, and a changed phase means someone else owns the state now.
 */
async function staleResult(ctx) {
  // `/agent rerun` in dry-run did not write the state, so there is nothing to compare with.
  if (ctx.skipStale) return null
  const newer = await supersededBy(ctx)
  if (newer) return supersededResult(ctx, newer)
  const phase = await phaseMovedOn(ctx)
  return phase ? stateChangedResult(ctx, phase) : null
}

/**
 * Writes the state comment: edits the one that exists, else creates it. The cost records of the comment as it is now
 * are merged in, because chat and publish may have added one since the gate loaded the state.
 */
async function writeState({ gh, number, loaded, human, st: mine }) {
  const st = await state.withFreshCosts(gh, number, mine)
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
  const stale = await staleResult(ctx)
  if (stale) return stale

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
  const stale = await staleResult(ctx)
  if (stale) return stale
  let st = ctx.st
  const totalUsd = sum(st.costs ?? [], 'usd')

  // 1. The free rerun of a red result that only E2E jobs caused.
  const reruns = st.e2eRerun?.sha === headSha ? st.e2eRerun.count ?? 0 : 0
  const targets = rerunTargets(failed, ctx.env.AGENT_WORKFLOW_RUN_ID)
  if (isE2eOnly(failed) && e2eRerunLeft(st, headSha) && targets.length > 0) {
    log.info('decision', { action: 'rerun the failed E2E jobs once per commit', runs: targets.join(','), reruns })
    st = rerunState(st, headSha)
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
    const why = e2eRerunLeft(st, headSha) ? 'no run id' : 'used'
    log.info('rerun skipped', { reruns, targets: targets.length, why })
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
      pr: prNumber, reason: decision.reason, max, attempts: next.attempts, failed, errorsByJob, report, runUrl,
      totalUsd,
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
// /agent rerun
// ---------------------------------------------------------------------------------------------------------------

/**
 * Why `/agent rerun` cannot work on this state, as the reply to the person, or `null`. A run of an attempt that is
 * younger than `BUSY_MS` owns the state; `prHint` is the pull request of the comment, when it was written on one.
 */
function rerunRefusal({ st, actor, issue, prHint, now = Date.now() }) {
  if (!st.pr || !st.branch || (prHint && st.pr !== prHint)) {
    return `@${actor}, there is no pull request of the agent to rerun CI for.`
  }
  const startedAt = Date.parse(st.implementing?.at ?? '')
  if (st.phase === 'implementing' && !(now - startedAt > BUSY_MS)) {
    return refusalReply({ outcome: 'refuse-busy', actor, issue, state: st })
  }
  if (st.phase === 'stopped') return `@${actor}, the work is stopped; comment \`/agent retry\` to start again.`
  return null
}

/**
 * The state after `/agent rerun`: the gate decides this commit again (`ciGate` goes), the phase is `waiting-ci`, and
 * the request is recorded in `reruns`. A stale `implementing` record goes too. The input is not changed.
 */
function rerunRequestState(st, { sha, runs, actor, at, run }) {
  const { ciGate: _gate, implementing: _running, ...rest } = st
  return { ...rest, phase: 'waiting-ci', reruns: [...(st.reruns ?? []), { at, actor, sha, runs, run }] }
}

/** The state comment after `/agent rerun`; `failed` is empty when CI still runs. */
function renderRerunRequest({ pr, sha, actor, failed, pending, runUrl, totalUsd }) {
  const lead = failed.length > 0
    ? [`I reran the failed checks at \`${sha}\` on request of \`${code(actor)}\`. No new attempt and no model call. ` +
      'The failed checks:', '', ...failedList(failed)]
    : [`CI still runs at \`${sha}\` (${pending.map((p) => `\`${code(p.name)}\` ${p.state}`).join(', ')}). ` +
      `\`${code(actor)}\` asked for a rerun; there is nothing to rerun yet.`]
  return [
    `### AI implementation: waiting for CI on pull request #${pr}`,
    '',
    ...lead,
    '',
    costLine(runUrl, totalUsd, 'the CI gate decides when the checks end'),
  ].join('\n')
}

const rerunReply = ({ actor, pr, sha, failed, notRerun }) =>
  `@${actor}, I reran the failed checks of #${pr} (${checkNames(failed)}) on ${sha}. ` +
  'No new attempt and no model call: the CI gate decides when they end.' +
  (notRerun.length > 0 ? ` I cannot rerun ${checkNames(notRerun)} from here.` : '')

const noRerunReply = ({ actor, pr, sha, failed }) =>
  `@${actor}, the failed checks of #${pr} on ${sha} (${checkNames(failed)}) cannot be rerun from here: they are ` +
  'commit statuses or checks of another app, not GitHub Actions jobs. Rerun them where they run, or push a fix.'

const pendingReply = ({ actor, pr, sha, pending }) =>
  `@${actor}, CI still runs on #${pr} at ${sha} (${pending.slice(0, MAX_NAMED_CHECKS)
    .map((p) => `\`${code(p.name)}\` ${p.state}`).join(', ')}). There is nothing to rerun yet; the CI gate decides ` +
  'when it ends.'

/** Posts a reply on the issue or pull request of the comment, or, in dry-run, puts it in the job summary. */
async function replyTo(ctx, body) {
  const { config, env, gh, out, replyNumber } = ctx
  fs.writeFileSync(path.join(out, 'reply.md'), body)
  if (config.dryRun) {
    appendSummary(env, quoted(`## Dry run: reply to #${replyNumber}`, body))
    log.info('dry run: the reply is in the job summary')
    return
  }
  await gh.createIssueComment(replyNumber, body)
  log.info('reply posted', { mention: ctx.actor, on: `#${replyNumber}` })
}

/** The state comment as it is now, parsed, or `null`: read again right before the write of `/agent rerun`. */
async function rereadState(gh, number) {
  const existing = state.findStateComment(await gh.listIssueComments(number))
  return { existing, st: existing ? state.parse(existing.body) : null }
}

/**
 * The body of `/agent rerun`. It decides nothing about the code: it reruns the failed Actions jobs of the head commit
 * and hands the decision back to the CI gate by putting the phase back to `waiting-ci`. It uses no model.
 *
 * @returns {Promise<{ ok: boolean, outcome: 'refused'|'rerun'|'pending'|'green'|'superseded'|'state-changed',
 *   reason?: string }>}
 */
async function rerunRequest(ctx) {
  const { config, env, deps, gh, number, prHint, actor, runUrl, out, repo } = ctx
  const refuse = async (text, reason) => {
    log.info('decision', { action: 'refuse', reason })
    await replyTo(ctx, text)
    return { ok: false, outcome: 'refused', reason }
  }

  const loaded = await log.group('Load the issue and its state', () => loadIssue(gh, number))
  const refusal = rerunRefusal({ st: loaded.st, actor, issue: loaded.issue, prHint })
  if (refusal) return refuse(refusal, `the state of #${number} does not allow a rerun (phase '${loaded.st.phase}')`)
  const prNumber = loaded.st.pr
  const pull = await log.group('Load the pull request', () => gh.getPull(prNumber))
  if (pull.state !== 'open') {
    return refuse(
      `@${actor}, pull request #${prNumber} is not open, so there is nothing to rerun. Comment \`/agent retry\` ` +
        'with guidance to start a new pull request.',
      `pull request #${prNumber} is not open`,
    )
  }
  const headSha = pull.head.sha
  const sha = headSha.slice(0, 12)
  const { checkRuns, statuses } = await log.group('Collect the checks', async () => {
    const runs = relevantChecks(await gh.listCheckRuns(headSha))
    const combined = await gh.getCombinedStatus(headSha)
    log.info('checks', { sha: headSha, checkRuns: runs.length, statuses: combined.statuses.length })
    return { checkRuns: runs, statuses: combined.statuses }
  })
  const failed = failedChecks(checkRuns, statuses)
  const pending = pendingChecks(checkRuns, statuses)
  const rerunnable = failed.filter((f) => f.runId !== null)
  const notRerun = failed.filter((f) => f.runId === null)
  const targets = rerunTargets(rerunnable, null)
  log.info('decision', {
    stage: 'rerun',
    failed: failed.map((f) => `${f.name}:${f.conclusion}`).join(', ') || 'none',
    pending: pending.map((p) => p.name).join(', ') || 'none',
    runs: targets.join(',') || 'none',
  })
  if (failed.length > 0 && targets.length === 0) {
    return refuse(noRerunReply({ actor, pr: prNumber, sha, failed }), 'the failed checks have no workflow run')
  }

  // The state is read again right before the write: a stop or a new attempt since the first read ends the rerun.
  const fresh = config.dryRun ? { existing: loaded.existing, st: loaded.st } : await rereadState(gh, number)
  if (!fresh.st) return refuse(`@${actor}, there is no pull request of the agent to rerun CI for.`, 'the state is gone')
  const again = rerunRefusal({ st: fresh.st, actor, issue: loaded.issue, prHint })
  if (again) return refuse(again, `the state of #${number} changed (phase '${fresh.st.phase}')`)

  const at = new Date().toISOString()
  const st = rerunRequestState(fresh.st, { sha: headSha, runs: targets, actor, at, run: runUrl })
  const human = renderRerunRequest({
    pr: prNumber, sha, actor, failed: rerunnable, pending, runUrl, totalUsd: sum(st.costs ?? [], 'usd'),
  })
  const plan = failed.length > 0 ? 'rerun' : pending.length > 0 ? 'pending' : 'green'
  const labelPlan = `remove ${LABEL_NEEDS_HUMAN} from #${prNumber} and #${number}`
  const reply = plan === 'rerun'
    ? rerunReply({ actor, pr: prNumber, sha, failed: rerunnable, notRerun })
    : pendingReply({ actor, pr: prNumber, sha, pending })

  if (config.dryRun) {
    const lines = [`## Dry run: rerun CI for #${number}`, '', human, '']
    if (plan === 'rerun') lines.push(`Would rerun the failed jobs of workflow run(s) ${targets.join(', ')}.`, '')
    if (plan === 'green') lines.push('CI is green: the green path of the CI gate would run.', '')
    lines.push(`- labels: ${labelPlan}`, '', '### State', '', fence(JSON.stringify(st, null, 2), 'json'), '')
    appendSummary(env, lines.join('\n'))
    log.info('dry run: nothing written to GitHub')
  } else {
    const loadedNow = { ...loaded, existing: fresh.existing ?? loaded.existing }
    await log.group('Write the state comment', () => writeState({ gh, number, loaded: loadedNow, human, st }))
    await log.group('Remove the hand-off label', async () => {
      await gh.removeLabel(number, LABEL_NEEDS_HUMAN)
      await gh.removeLabel(prNumber, LABEL_NEEDS_HUMAN)
      log.info('label removed', { label: LABEL_NEEDS_HUMAN, on: `#${number} and #${prNumber}` })
    })
  }

  if (plan === 'green') {
    // The same path as the gate: the pull request leaves draft, the labels, the state `completed`, and the comment.
    log.info('decision', { action: 'green: run the green path of the gate', sha: headSha })
    const result = await handleGreen({
      config, env, deps, gh, out, number, prNumber, pull, headSha, actor, runUrl, repo, at, loaded: {
        ...loaded, existing: fresh.existing ?? loaded.existing,
      }, st, checkRuns, statuses, skipStale: config.dryRun,
    })
    return { ok: result.outcome === 'green', ...result }
  }
  if (plan === 'rerun' && !config.dryRun) {
    await log.group('Rerun the failed jobs', async () => {
      for (const id of targets) await gh.rerunFailedJobs(id)
      log.info('rerun requested', { runs: targets.join(',') })
    })
  }
  await replyTo(ctx, reply)
  return { ok: true, outcome: plan }
}

/**
 * `/agent rerun`: the failed checks of the pull request of the agent run again, and the CI gate decides when they end.
 * It is no attempt and uses no model. The comment that asked gets `eyes` first, then `rocket` when the checks were
 * rerun, CI still runs, or CI is green, and `confused` for a refusal or an error. In dry-run nothing is written, rerun,
 * or reacted with; the job summary says what would happen.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, AGENT_PAT (green result of a draft pull request only), AGENT_NUMBER
 * (the issue), AGENT_PR (the pull request the comment is on, when it is on one), AGENT_ACTOR (who asked),
 * AGENT_COMMENT_ID, AGENT_RUN_URL, AGENT_OUT, the AGENT_* variables of lib/config.js, GITHUB_STEP_SUMMARY.
 */
async function rerunCommand(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const prHint = Number(env.AGENT_PR) > 0 ? Number(env.AGENT_PR) : null
  const actor = requireEnv(env, 'AGENT_ACTOR')
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const repo = env.GITHUB_REPOSITORY
  fs.mkdirSync(out, { recursive: true })
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo })
  const commentId = commentIdOf(env.AGENT_COMMENT_ID)
  log.info('rerun starts', { issue: number, pr: prHint ?? 'from the state', actor, dryRun: config.dryRun })
  await react({ gh, commentId, content: 'eyes', dryRun: config.dryRun })

  const ctx = { config, env, deps, gh, number, prHint, actor, runUrl, out, repo, replyNumber: prHint ?? number }
  let content = 'confused'
  try {
    const result = await rerunRequest(ctx)
    if (result.ok) content = 'rocket'
    return result
  } finally {
    await react({ gh, commentId, content, dryRun: config.dryRun })
  }
}

// ---------------------------------------------------------------------------------------------------------------

/** `argv` is empty (the gate, after a CI workflow) or `['rerun']` (the command `/agent rerun`). */
async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const [mode] = argv
  if (mode === undefined) return gate(env, deps)
  if (mode === 'rerun') return rerunCommand(env, deps)
  throw new Error(`Usage: node tools/agent/ci-gate.js [rerun] (got '${mode}')`)
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
  rerunCommand,
  rerunRefusal,
  rerunRequestState,
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
  checkNames,
  failureLines,
  reportFacts,
  buildReport,
  lastSignature,
  countedAttempts,
  stopDecision,
  greenState,
  stoppedState,
  nextAttemptState,
  rerunState,
  e2eRerunLeft,
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
