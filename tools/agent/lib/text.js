/**
 * Small text helpers shared by the scripts of the AI Autonomous agent, for model and people text that ends up in a
 * comment, a pull request description, or a prompt input.
 */
'use strict'

/**
 * Text in a list item or a paragraph: one line. A mention in it would notify a person or a team on behalf of the
 * bot, so the `@` is separated from the name by a zero-width space.
 */
const inline = (s) => defuseMentions(String(s).replace(/\s*\n\s*/g, ' ').trim())

/**
 * `text` with every `@name` defused and the line breaks kept: for a multi-line answer of the model that goes into a
 * comment. A mention in it would notify a person or a team on behalf of the bot.
 */
function defuseMentions(text) {
  return String(text ?? '').replace(/@(?=[\w-])/g, '@​')
}

/** `text` cut to `max` characters, with a note that says so; a pasted log cannot fill the model's context. */
function clip(text, max) {
  const s = String(text ?? '')
  return s.length > max ? `${s.slice(0, max)}\n[cut: the text is longer than ${max} characters]` : s
}

/** The last `n` lines of `text`, without trailing blank lines. */
function tailLines(text, n) {
  const lines = String(text ?? '').replace(/\s+$/, '').split('\n')
  return lines.slice(-n).join('\n')
}

/** `text` without ANSI color and cursor sequences. */
const stripAnsi = (text) => String(text ?? '').replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')

module.exports = { inline, defuseMentions, clip, tailLines, stripAnsi }
