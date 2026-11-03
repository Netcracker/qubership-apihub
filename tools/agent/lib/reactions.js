/**
 * Reactions of the AI Autonomous agent on the comment that started a job, so a person sees that the agent took it:
 * `eyes` when the work starts, `rocket` when it ends well, `confused` when the agent refuses or fails.
 *
 * A reaction is a courtesy. A failed call is logged as a warning and never fails the job, because the answer to the
 * person matters more than the emoji. A review has no comment to react to, and a CI fix has no comment either: they
 * pass no comment id, and nothing happens.
 */
'use strict'

const log = require('./log')

const REACTIONS = new Set(['eyes', 'rocket', 'confused'])

/** The comment id from an environment value, or `null` when it is empty or not a positive integer. */
function commentIdOf(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * Adds `content` to the comment `commentId`. In dry-run it only logs what it would do.
 *
 * @param {{ gh: { addReaction: Function }, commentId: number|null, content: 'eyes'|'rocket'|'confused',
 *   dryRun?: boolean }} input
 * @returns {Promise<boolean>} true when the reaction was added
 */
async function react({ gh, commentId, content, dryRun = false }) {
  if (!REACTIONS.has(content)) throw new Error(`Unknown reaction '${content}'`)
  if (commentId === null || commentId === undefined) return false
  if (dryRun) {
    log.info('dry run: would add a reaction', { comment: commentId, content })
    return false
  }
  try {
    await gh.addReaction(commentId, content)
    log.info('reaction added', { comment: commentId, content })
    return true
  } catch (err) {
    log.warn(`The reaction '${content}' could not be added to comment ${commentId}: ${err.message}`)
    return false
  }
}

module.exports = { react, commentIdOf }
