/**
 * Logging of the AI Autonomous agent for the GitHub Actions job log.
 *
 * A run should be readable from the log alone: every stage in a collapsible group with its duration, every decision
 * with its reason, and every model call step by step (see `modelEvent`, which lib/opencode.js calls live for each
 * event opencode emits). Output goes to stdout; `::warning::` and `::error::` lines become annotations of the run.
 */
'use strict'

const PREFIX = '[agent]'

let write = (line) => process.stdout.write(line + '\n')

/** Replaces the writer, for tests. Returns the previous one. */
function setWriter(fn) {
  const previous = write
  write = fn
  return previous
}

function format(value) {
  if (value === null || value === undefined) return String(value)
  if (typeof value === 'string') return /[\s"=]/.test(value) ? JSON.stringify(value) : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

/** `[agent] message key=value ...`; values with spaces are quoted, objects are JSON. */
function info(message, fields = {}) {
  const tail = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${format(v)}`)
    .join(' ')
  write(`${PREFIX} ${message}${tail ? ' ' + tail : ''}`)
}

// Annotation text must stay on one line; GitHub reads the rest of the line as the message.
const oneLine = (s) => String(s).replace(/\r?\n/g, ' ')

function warn(message) {
  write(`::warning::${oneLine(message)}`)
}

function error(message) {
  write(`::error::${oneLine(message)}`)
}

/** Runs `fn` inside a collapsible group and logs its duration and outcome; returns or rethrows what `fn` does. */
async function group(title, fn, now = Date.now) {
  write(`::group::${oneLine(title)}`)
  const start = now()
  try {
    const result = await fn()
    info(`${title}: done`, { seconds: ((now() - start) / 1000).toFixed(1) })
    return result
  } catch (err) {
    info(`${title}: failed`, { seconds: ((now() - start) / 1000).toFixed(1), error: err?.message ?? String(err) })
    throw err
  } finally {
    write('::endgroup::')
  }
}

/** A value as pretty JSON inside its own group. */
function json(title, value) {
  write(`::group::${oneLine(title)}`)
  for (const line of JSON.stringify(value, null, 2).split('\n')) write(line)
  write('::endgroup::')
}

const clip = (s, n) => {
  const text = oneLine(s ?? '').trim()
  return text.length > n ? text.slice(0, n) + '…' : text
}

// The most telling argument of a tool call, so the log shows what the model looked at or ran.
function toolTarget(input = {}) {
  const target = input.command ?? input.filePath ?? input.path ?? input.pattern ?? input.name ?? input.url
  return target ?? JSON.stringify(input)
}

/**
 * One line for one opencode JSON event, or null for events that say nothing new. `role` names the agent.
 * Tool calls show their target and status; a step shows its tokens and cost; text shows the start of the answer.
 */
function modelEventLine(role, event) {
  const part = event?.part ?? {}
  switch (event?.type) {
    case 'tool_use': {
      const st = part.state ?? {}
      const status = st.status === 'error' ? `ERROR ${clip(st.error, 200)}` : st.status
      return `${PREFIX} ${role} tool ${part.tool}: ${clip(toolTarget(st.input), 160)} -> ${status}`
    }
    case 'step_finish': {
      const t = part.tokens ?? {}
      const uncached = (t.input ?? 0) + (t.cache?.write ?? 0)
      return (
        `${PREFIX} ${role} step done reason=${part.reason ?? '?'} uncached=${uncached} cached=${t.cache?.read ?? 0} ` +
        `output=${t.output ?? 0} reasoning=${t.reasoning ?? 0} usd=${(part.cost ?? 0).toFixed(4)}`
      )
    }
    case 'text':
      return `${PREFIX} ${role} says: ${clip(part.text, 400)}`
    case 'error':
      return `::warning::${role} error: ${clip(JSON.stringify(event.error), 400)}`
    default:
      return null
  }
}

/** Logs one opencode event live; lib/opencode.js calls it for every complete line of the stream. */
function modelEvent(role, event) {
  const line = modelEventLine(role, event)
  if (line) write(line)
}

module.exports = { info, warn, error, group, json, modelEvent, modelEventLine, setWriter }
