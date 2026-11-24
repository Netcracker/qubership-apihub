'use strict'
/**
 * Stop labels of the AI Autonomous agent: `needs-human:<reason>` says why the agent stopped and waits for a person.
 * An issue or pull request carries at most one of them.
 */
const log = require('./log')

const REASONS = [
  'approval-required',
  'risk-found',
  'decision-required',
  'context-missing',
  'access-missing',
  'verification-blocked',
  'environment-blocked',
  'external-dependency',
  'conflict-unresolved',
  'scope-review-required',
  'invalid',
  'stuck',
  'disagreement',
  'budget-exhausted',
]
const PREFIX = 'needs-human:'
const LABEL_COMPLETED = 'agent:completed'

/** The label of `reason`. Throws on an unknown reason. */
function labelOf(reason) {
  if (!REASONS.includes(reason)) throw new Error(`Unknown stop reason: ${JSON.stringify(reason)}`)
  return PREFIX + reason
}

/** True when `name` is one of the stop labels. */
function isStopLabel(name) {
  return typeof name === 'string' && name.startsWith(PREFIX) && REASONS.includes(name.slice(PREFIX.length))
}

/** The names of the stop labels among `labels` (label objects or strings). */
function stopLabels(labels) {
  return (labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name)).filter(isStopLabel)
}

/** The stop labels an issue or pull request carries now. */
async function currentStops(gh, number) {
  const issue = await gh.getIssue(number)
  return stopLabels(issue?.labels)
}

/**
 * Adds `needs-human:<reason>` to each of `numbers` and removes every other stop label they carry. Falsy numbers are
 * skipped. Goes on after an error; returns the first error (logged) or `null`.
 */
async function setStop(gh, numbers, reason) {
  const label = labelOf(reason)
  let first = null
  for (const number of numbers ?? []) {
    if (!number) continue
    try {
      const issue = await gh.getIssue(number)
      const present = stopLabels(issue?.labels)
      if (reason !== 'approval-required' &&
        (issue?.labels ?? []).some((l) => (typeof l === 'string' ? l : l?.name) === LABEL_COMPLETED)) {
        await gh.removeLabel(number, LABEL_COMPLETED)
      }
      for (const other of present) {
        if (other !== label) await gh.removeLabel(number, other)
      }
      if (!present.includes(label)) await gh.addLabels(number, [label])
    } catch (error) {
      log.warn(`Could not set ${label} on #${number}: ${error?.message ?? error}`)
      first ??= error
    }
  }
  return first
}

/** Removes completion labels when work resumes or stops before completion; preserves execution-level labels. */
async function clearCompleted(gh, numbers) {
  let first = null
  for (const number of new Set((numbers ?? []).filter(Boolean))) {
    try {
      const issue = await gh.getIssue(number)
      const labels = (issue.labels ?? []).map((label) => typeof label === 'string' ? label : label?.name)
      if (labels.includes(LABEL_COMPLETED)) await gh.removeLabel(number, LABEL_COMPLETED)
    } catch (error) {
      log.warn(`Could not clear ${LABEL_COMPLETED} from #${number}: ${error?.message ?? error}`)
      first ??= error
    }
  }
  return first
}

/**
 * Removes every stop label from each of `numbers`, except the labels of the reasons in `keep`. Same error handling
 * as `setStop`.
 */
async function clearStops(gh, numbers, { keep = [] } = {}) {
  const kept = new Set(keep.map(labelOf))
  let first = null
  for (const number of numbers ?? []) {
    if (!number) continue
    try {
      for (const name of await currentStops(gh, number)) {
        if (!kept.has(name)) await gh.removeLabel(number, name)
      }
    } catch (error) {
      log.warn(`Could not clear the stop labels of #${number}: ${error?.message ?? error}`)
      first ??= error
    }
  }
  return first
}

/** A copy of `st` whose open stop entry, if any, is closed at `at` (and by `run`, when given). */
function closeOpen(st, at, run) {
  const stops = [...(st.stops ?? [])]
  const index = stops.findIndex((s) => !s.resumedAt)
  if (index === -1) return st
  stops[index] = { ...stops[index], resumedAt: at, ...(run ? { resumedRun: run } : {}) }
  return { ...st, stops }
}

/**
 * Records a stop in the history `st.stops`: a list of `{ reason, at, run, on, resumedAt?, resumedRun? }`. An open
 * entry is closed first (`resumedAt` = `at`). `approval-required` is not a stop of the agent and is not recorded.
 * Returns a new state; the input is not changed.
 */
function recordStop(st, { reason, at, run, on }) {
  if (reason === 'approval-required') return st
  labelOf(reason)
  const closed = closeOpen(st, at)
  return { ...closed, stops: [...(closed.stops ?? []), { reason, at, run, on: (on ?? []).filter(Boolean) }] }
}

/** Closes the open stop entry with the resume time and run. Returns `st` itself when no entry is open. */
function recordResume(st, { at, run }) {
  return closeOpen(st, at, run)
}

/**
 * The lines of a structured stop record: the reason, then the blocker, the work completed, the required action, and
 * the resume condition. A field that is empty is left out.
 */
function renderStop({ reason, blocker, done, action, resume }) {
  const lines = [`**Reason:** \`${labelOf(reason)}\``]
  const fields = [
    ['Blocker', blocker],
    ['Work completed', done],
    ['Required action', action],
    ['Resume condition', resume],
  ]
  for (const [title, text] of fields) {
    const value = typeof text === 'string' ? text.trim() : ''
    if (value) lines.push('', `**${title}.** ${value}`)
  }
  return lines
}

module.exports = {
  REASONS,
  PREFIX,
  labelOf,
  isStopLabel,
  stopLabels,
  setStop,
  clearStops,
  clearCompleted,
  recordStop,
  recordResume,
  renderStop,
}
