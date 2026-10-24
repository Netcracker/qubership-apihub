/**
 * One call of an opencode agent, shared by every flow (review, analyze, implement).
 *
 * It runs the agent, records its cost whatever happens, writes the final answer next to the events, and validates the
 * JSON contract. The cost record is pushed to `costs` before anything can throw, so the caller can write it to the
 * state also when the call fails.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const usage = require('./usage')
const { extractJson, validate } = require('./contract')
const { runAgent } = require('./opencode')
const log = require('./log')

/**
 * Runs `agent` with `inputFile` attached and returns its output, validated against the schema `schema` of
 * lib/contract.js.
 *
 * @param {object} options
 * @param {string} options.flow `review`, `analyze`, or `implement`, for the cost record
 * @param {string} options.role the role in the cost record (the agent name, as a rule)
 * @param {string} options.agent the opencode agent
 * @param {{id: string, variant: string|null}} options.model
 * @param {string} options.message the prompt; the input file is attached next to it
 * @param {string} options.inputFile
 * @param {string} options.out folder for `<agent><suffix>.jsonl` (events) and `<agent><suffix>.final.md` (answer)
 * @param {object[]} options.costs the cost record of this call is appended here
 * @param {string} options.runUrl
 * @param {string} options.schema name in `SCHEMAS`
 * @param {(output: object) => void} [options.check] semantic check; throws `ContractError`
 * @param {string} [options.suffix] tells calls of one agent apart, for example `-r2` for round 2
 * @param {{ runAgent?: Function }} [options.deps] `runAgent` is injectable so that tests never start opencode
 */
async function callAgent({
  flow,
  role,
  agent,
  model,
  message,
  inputFile,
  out,
  costs,
  runUrl,
  schema,
  check,
  suffix = '',
  deps = {},
}) {
  const run = deps.runAgent ?? runAgent
  const eventsFile = path.join(out, `${agent}${suffix}.jsonl`)
  const result = await run({ agent, model, message, files: [inputFile], cwd: process.cwd(), eventsFile })
  const summary = usage.summarize(usage.parseEvents(result.eventsText))
  costs.push(usage.costRecord({ run: runUrl, flow, role, model: model.id, variant: model.variant, summary }))
  log.info(`${agent} usage`, {
    exitCode: result.exitCode,
    steps: summary.steps,
    uncached: summary.input,
    cached: summary.cached,
    output: summary.output,
    reasoning: summary.reasoning,
    usd: usage.formatUsd(summary.usd),
  })
  fs.writeFileSync(path.join(out, `${agent}${suffix}.final.md`), summary.finalText)
  if (result.exitCode !== 0 && !summary.finalText) {
    throw new Error(`${agent} exited with ${result.exitCode}: ${result.stderrTail.slice(-500)}`)
  }
  let output
  try {
    output = validate(schema, extractJson(summary.finalText))
    if (check) check(output)
  } catch (err) {
    log.error(`${agent} broke its output contract: ${err.message}`)
    throw err
  }
  log.json(`${agent} output`, output)
  return output
}

module.exports = { callAgent }
