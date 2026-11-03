'use strict'
/**
 * Tokens and cost of one opencode run.
 *
 * `opencode run --format json` writes one JSON object per line. This module turns that stream into numbers
 * for the cost table in the state comment. Lines that are blank or not JSON (progress noise, a truncated last
 * line) are skipped; a missing field counts as 0.
 *
 * Events used:
 *   step_finish  part.tokens { input, output, reasoning, cache: { read, write } } and part.cost (USD)
 *   text         part.text
 *   error        error
 */

/** The JSON objects found in `text`, one per line, in order. */
function parseEvents(text) {
  const events = []
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    try {
      const event = JSON.parse(trimmed)
      if (event !== null && typeof event === 'object') events.push(event)
    } catch {
      // Not a complete JSON line; opencode may print plain text between events.
    }
  }
  return events
}

/** A finite number, else 0. */
function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Sums the `step_finish` events and picks the last text and all errors. */
function summarize(events) {
  const summary = { steps: 0, input: 0, cached: 0, output: 0, reasoning: 0, usd: 0, finalText: '', errors: [] }
  for (const event of events ?? []) {
    if (event?.type === 'step_finish') {
      const tokens = event.part?.tokens ?? {}
      summary.steps += 1
      // opencode 1.19 reports the uncached prompt of an OpenAI call as `cache.write` and leaves `input` at a few
      // tokens (seen in the phase 0 spike), so both count as uncached input here.
      summary.input += num(tokens.input) + num(tokens.cache?.write)
      summary.cached += num(tokens.cache?.read)
      summary.output += num(tokens.output)
      summary.reasoning += num(tokens.reasoning)
      summary.usd += num(event.part?.cost)
    } else if (event?.type === 'text') {
      summary.finalText = typeof event.part?.text === 'string' ? event.part.text : ''
    } else if (event?.type === 'error') {
      summary.errors.push(event.error ?? event)
    }
  }
  return summary
}

/**
 * One row of the `costs` list in the state. `now` is a function returning a Date (or a Date), so tests can
 * fix the clock.
 */
function costRecord({ run, flow, role, model, variant, summary, now = () => new Date() }) {
  const moment = typeof now === 'function' ? now() : now
  return {
    run,
    flow,
    role,
    model,
    variant,
    input: summary.input,
    cached: summary.cached,
    output: summary.output,
    reasoning: summary.reasoning,
    usd: summary.usd,
    at: moment.toISOString(),
  }
}

/** Two decimals from one cent up, four decimals below, because cheap runs would all show as 0.00. */
function formatUsd(n) {
  const value = num(n)
  return value >= 0.01 ? value.toFixed(2) : value.toFixed(4)
}

module.exports = { parseEvents, summarize, costRecord, formatUsd }
