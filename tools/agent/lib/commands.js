'use strict'
/**
 * Parser of `/agent ...` comments.
 *
 * Only the first non-empty line decides whether a comment is a command. The rest of the comment is free text
 * for the agent and ends up in `notes`. Parsing is pure: who may issue the command is decided by the caller.
 *
 * Input: the comment body. Output: `null` for an ordinary comment, else `{ name, force, notes }`.
 */

const KNOWN = new Set([
  'review', 'analyze', 'implement', 'fix', 'retry', 'rerun', 'ci_check', 'ci-check', 'stop', 'cost', 'help',
])

/** The names `fix`, `ci_check`, and `ci-check` are spellings of `implement` and `ci-check`. */
const ALIASES = { fix: 'implement', ci_check: 'ci-check' }

/** `/agent` must be followed by whitespace or the end of the line, so `/agentx` is not a command. */
const PREFIX = /^\/agent(?=\s|$)/i

/**
 * Returns `{ name, force, notes }` or `null` when the comment is not a command. `fix` is reported as
 * `implement`, and `ci_check` as `ci-check`. An unknown word after `/agent` makes the whole text a `chat` request.
 */
function parseCommand(body) {
  if (typeof body !== 'string') return null
  const lines = body.split(/\r?\n/)
  const first = lines.findIndex((line) => line.trim() !== '')
  if (first === -1) return null

  const head = lines[first].trim()
  if (!PREFIX.test(head)) return null

  const tail = lines.slice(first + 1)
  const afterPrefix = head.slice('/agent'.length).trim()
  if (afterPrefix === '' && tail.every((line) => line.trim() === '')) {
    return { name: 'help', force: false, notes: '' }
  }

  const everything = [afterPrefix, ...tail].join('\n').trim()
  const word = afterPrefix.split(/\s+/)[0].toLowerCase()
  if (!KNOWN.has(word)) {
    // `/agent` followed by text on a later line only: still a chat request, not a help request.
    return { name: 'chat', force: false, notes: everything }
  }

  const name = ALIASES[word] ?? word
  let rest = afterPrefix.slice(word.length).trim()
  let force = false
  if (name === 'implement') {
    const next = rest.split(/\s+/)[0].toLowerCase()
    if (next === 'force') {
      force = true
      rest = rest.slice(next.length).trim()
    }
  }
  return { name, force, notes: [rest, ...tail].join('\n').trim() }
}

module.exports = { parseCommand }
