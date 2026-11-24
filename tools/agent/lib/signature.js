'use strict'
/**
 * The signature line of a comment that reports the result of an AI run:
 *
 *   <sub>🤖 gpt-6.1-sol high in=12k cached=40k out=3k usd=0.083</sub>
 *
 * The numbers come from the cost records of the state (`state.costs`). A comment that shows the results of several
 * runs signs the sum of all of them.
 */

/** The main role of each result family; its model and effort name the run in the signature. */
const MAIN_ROLE = {
  analysis: 'analyst',
  implementation: 'implementer',
  review: 'pr-reviewer',
  chat: 'assistant',
  'ci-check': 'ci-triager',
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** `openai/gpt-6.1-sol` -> `gpt-6.1-sol`; anything without a slash unchanged. */
function modelName(id) {
  const text = String(id ?? '')
  const slash = text.indexOf('/')
  return slash === -1 ? text : text.slice(slash + 1)
}

/**
 * Token count: under 1000 as an integer (`950`); else thousands with one decimal below 100k, stripped of `.0`
 * (`12k`, `12.5k`), and rounded to a whole number from 100k up (`970k`, `1234k`).
 */
function tokens(n) {
  const value = isNum(n) ? n : 0
  if (value < 1000) return String(Math.round(value))
  if (value < 100000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${Math.round(value / 1000)}k`
}

/** USD rounded to two significant digits, printed without exponent notation; 0 -> `0`. */
function usd(n) {
  if (!isNum(n) || n <= 0) return '0'
  const value = Number(n.toPrecision(2))
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(value)))
  const text = value.toFixed(decimals)
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

/** The newest record: the greatest `at`, and the later row on a tie. */
function newest(records) {
  let best = null
  for (const r of records) {
    if (best === null || String(r?.at ?? '') >= String(best?.at ?? '')) best = r
  }
  return best
}

/** The sum of `fields` over `records`, or `null` when no record has a finite number in any of them. */
function sumOf(records, fields) {
  let found = false
  let total = 0
  for (const r of records) {
    for (const f of fields) {
      if (isNum(r?.[f])) {
        found = true
        total += r[f]
      }
    }
  }
  return found ? total : null
}

/**
 * The signature line for the cost records `records` (rows of `state.costs`), or `null` when `records` is empty.
 * Model and effort come from the newest record whose role is `mainRole`, else the newest record. A field whose source
 * is missing on every record is left out; it is never reported as 0.
 */
function signatureLine(records, { mainRole } = {}) {
  const list = (records ?? []).filter((r) => r !== null && typeof r === 'object')
  if (list.length === 0) return null
  const main = newest(list.filter((r) => r.role === mainRole)) ?? newest(list)
  const parts = ['🤖']
  if (main.model) parts.push(modelName(main.model))
  if (main.variant) parts.push(String(main.variant))
  const input = sumOf(list, ['input'])
  const cached = sumOf(list, ['cached'])
  const output = sumOf(list, ['output', 'reasoning'])
  const cost = sumOf(list, ['usd'])
  if (input !== null) parts.push(`in=${tokens(input)}`)
  if (cached !== null) parts.push(`cached=${tokens(cached)}`)
  if (output !== null) parts.push(`out=${tokens(output)}`)
  if (cost !== null) parts.push(`usd=${usd(cost)}`)
  return `<sub>${parts.join(' ')}</sub>`
}

/** The records of `costs` whose `run` is one of `runs`. */
function recordsOfRuns(costs, runs) {
  const wanted = new Set(runs ?? [])
  return (costs ?? []).filter((r) => wanted.has(r?.run))
}

/** `text` (trailing whitespace trimmed) plus a blank line and the signature, or `text` alone without a signature. */
function sign(text, records, opts) {
  const signature = signatureLine(records, opts)
  return signature === null ? text : `${String(text ?? '').replace(/\s+$/, '')}\n\n${signature}`
}

module.exports = { MAIN_ROLE, modelName, tokens, usd, signatureLine, recordsOfRuns, sign }
