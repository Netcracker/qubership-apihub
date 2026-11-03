'use strict'
/**
 * The daily caps on the automatic work of the agent: how many automatic analyses and reviews the last 24 hours (a
 * rolling window) hold, counted from the state comments. Commands from people are not counted and not capped. The
 * functions here are pure; `route.js` reads the state comments and calls them.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000
/** The most issues or pull requests whose state comments are read for one count; the search returns the rest unread. */
const MAX_STATES_READ = 100
/**
 * The analysis triggers that count: the automatic ones. `edited` and `author-reply` are answers of the author, and
 * `command` is a person.
 */
const AUTOMATIC_ANALYSIS_TRIGGERS = ['opened', 'typed', 'sweep']

/** The start of the window that ends at `now`. */
const windowStart = (now) => new Date(now.getTime() - WINDOW_MS)

/** A date as UTC ISO without milliseconds, the form of a search qualifier (`2026-10-25T12:00:00Z`). */
const toSearchTime = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z')

/** True when the time `at` is at or after `since`; a missing or malformed time is outside every window. */
function isInWindow(at, since) {
  const time = typeof at === 'string' ? Date.parse(at) : NaN
  return Number.isFinite(time) && time >= since.getTime()
}

/**
 * The automatic analyses in the window.
 *
 * @param {object[]} states the states of the issues updated in the window
 * @param {Date} since the start of the window
 */
function countAnalyses(states, since) {
  let count = 0
  for (const st of states) {
    for (const entry of st?.analyses ?? []) {
      if (AUTOMATIC_ANALYSIS_TRIGGERS.includes(entry?.trigger) && isInWindow(entry.at, since)) count += 1
    }
  }
  return count
}

/**
 * The automatic reviews in the window. A review is automatic when it has no `trigger` (an entry written before the
 * trigger existed) or `trigger: 'auto'`; `command` is a person. A review skipped for its size cost nothing, so it does
 * not count.
 */
function countReviews(states, since) {
  let count = 0
  for (const st of states) {
    for (const entry of st?.reviews ?? []) {
      if (entry?.skipped === 'size') continue
      if (entry?.trigger !== undefined && entry.trigger !== 'auto') continue
      if (isInWindow(entry?.at, since)) count += 1
    }
  }
  return count
}

module.exports = {
  WINDOW_MS,
  MAX_STATES_READ,
  AUTOMATIC_ANALYSIS_TRIGGERS,
  windowStart,
  toSearchTime,
  isInWindow,
  countAnalyses,
  countReviews,
}
