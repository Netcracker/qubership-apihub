'use strict'

/**
 * Which lines of a pull request file accept a review comment.
 *
 * The GitHub review API rejects a whole review when one comment targets a line that is not part of the diff.
 * `commentableLines` reads the `patch` field of the pull request files API (a unified diff without the file
 * headers) and returns the new-file line numbers that a comment with `side: 'RIGHT'` may target: the added
 * lines and the context lines inside the hunks.
 *
 * Input: the `patch` string, or `undefined` for a binary or too large file. Output: `Set<number>`.
 */

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

/** @param {string | undefined} patch */
function commentableLines(patch) {
  const lines = new Set()
  if (typeof patch !== 'string' || patch === '') {
    return lines
  }

  // The header counts say where a hunk ends. Without them a blank line (a context line whose single space was
  // stripped) or the empty string after the final newline would be mistaken for a context line.
  let oldLeft = 0
  let newLeft = 0
  let newLine = 0
  for (const line of patch.split(/\r?\n/)) {
    // A line that starts with `@@` is always a header: hunk body lines start with ` `, `+`, `-`, or `\`.
    const header = HUNK_HEADER.exec(line)
    if (header) {
      oldLeft = header[2] === undefined ? 1 : Number(header[2])
      newLeft = header[4] === undefined ? 1 : Number(header[4])
      newLine = Number(header[3])
      continue
    }
    if (oldLeft <= 0 && newLeft <= 0) {
      continue
    }
    if (line.startsWith('+')) {
      lines.add(newLine)
      newLine += 1
      newLeft -= 1
    } else if (line.startsWith('-')) {
      oldLeft -= 1
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" belongs to the previous line and has no line number of its own.
    } else {
      lines.add(newLine)
      newLine += 1
      newLeft -= 1
      oldLeft -= 1
    }
  }
  return lines
}

module.exports = { commentableLines }
