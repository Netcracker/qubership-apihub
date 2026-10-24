'use strict'
/**
 * The hidden state block of the AI Autonomous agent.
 *
 * The state lives in one comment per issue or pull request, written by `github-actions[bot]`. The comment
 * has a human-readable part and a machine-readable JSON block inside an HTML comment:
 *
 *   <!-- ai-autonomous-state -->
 *   <Markdown for people>
 *
 *   <!-- ai-autonomous-state-json
 *   { ...pretty JSON... }
 *   -->
 *
 * Only a comment from the workflow bot counts as state: anyone can paste the marker into a comment, and the
 * agent must not trust such a copy.
 */

const MARKER = '<!-- ai-autonomous-state -->'
const JSON_OPEN = '<!-- ai-autonomous-state-json'
const STATE_AUTHOR = 'github-actions[bot]'

/**
 * Builds the comment body. `--` is escaped inside the JSON so that `-->` can never appear in it and close the
 * HTML comment early; `-` is a valid JSON escape, so `parse` needs no special handling.
 */
function render(humanMarkdown, state) {
  const json = JSON.stringify(state, null, 2).replace(/--/g, '-\\u002d')
  return `${MARKER}\n${humanMarkdown}\n\n${JSON_OPEN}\n${json}\n-->\n`
}

/**
 * `body` with its state block replaced by `state`; the human part stays as it is. For a writer that only adds data (a
 * cost record) and must not replace what another flow wrote for people, such as the summary of a review.
 */
function replaceState(body, state) {
  const text = typeof body === 'string' ? body : ''
  const open = text.lastIndexOf(JSON_OPEN)
  const head = open === -1 ? text : text.slice(0, open)
  const human = head.startsWith(MARKER) ? head.slice(MARKER.length) : head
  return render(human.replace(/^\n+|\s+$/g, ''), state)
}

/** The state object of `body`, or `null` when the body has no state block. Throws on a damaged block. */
function parse(body) {
  if (typeof body !== 'string') return null
  // The last opener wins: the human part may quote the marker, the JSON block is always at the end.
  const open = body.lastIndexOf(JSON_OPEN)
  if (open === -1) return null
  const start = open + JSON_OPEN.length
  const end = body.indexOf('-->', start)
  if (end === -1) throw new Error('State block is not closed: missing "-->"')
  let state
  try {
    state = JSON.parse(body.slice(start, end))
  } catch (error) {
    throw new Error(`State block holds invalid JSON: ${error.message}`)
  }
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('State block must hold a JSON object')
  }
  return state
}

/** The first comment written by the workflow bot that starts with the marker, or `null`. */
function findStateComment(comments) {
  const found = (comments ?? []).find(
    (comment) =>
      comment?.user?.login === STATE_AUTHOR && typeof comment.body === 'string' && comment.body.startsWith(MARKER),
  )
  return found ?? null
}

function emptyIssueState(number) {
  return { schema: 1, kind: 'issue', number, phase: null, costs: [] }
}

function emptyPullState(number) {
  return { schema: 1, kind: 'pull', number, phase: null, costs: [], reviews: [] }
}

/** A copy of `state` with `record` appended to `costs`; the input is not changed. */
function addCost(state, record) {
  return { ...state, costs: [...(state.costs ?? []), record] }
}

/**
 * The login that asked for the work on an issue: the running attempt's actor, else the actor of the last attempt, else
 * `null`. The CI gate uses it to mention the person and to apply AGENT_ALLOWED_ACTORS.
 */
function actorOf(state) {
  const attempts = state?.attempts ?? []
  return state?.implementing?.actor || attempts[attempts.length - 1]?.actor || null
}

module.exports = {
  MARKER,
  render,
  replaceState,
  parse,
  findStateComment,
  emptyIssueState,
  emptyPullState,
  addCost,
  actorOf,
}
