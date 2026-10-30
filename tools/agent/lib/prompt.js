/**
 * Helpers for the prompt inputs of the AI Autonomous agent.
 *
 * Text written by people (issue and pull request descriptions, comments) goes to the model inside an `<untrusted>`
 * block, and the agent prompts tell the model never to follow instructions in it. The block only means something if
 * the text cannot close it, so every `<untrusted>` or `</untrusted>` tag inside the text is defused.
 */
'use strict'

const TAG = /<\s*(\/?)\s*untrusted\s*>/gi

/** `text` inside an `<untrusted>` block, with any tag of the same name in it turned into `[untrusted]`. */
function untrusted(text) {
  const body = String(text ?? '').replace(TAG, (_, slash) => `[${slash}untrusted]`)
  return `<untrusted>\n${body}\n</untrusted>`
}

module.exports = { untrusted }
