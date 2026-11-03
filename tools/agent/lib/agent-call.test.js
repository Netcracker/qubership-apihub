'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { ContractError } = require('./contract')
const { callAgent } = require('./agent-call')
const log = require('./log')

const lines = []
log.setWriter((line) => lines.push(line))

const FENCE = '```'
const model = { id: 'openai/gpt-6-luna', variant: 'max' }
const verification = { verdicts: [{ id: 'F1', verdict: 'confirmed', reason: 'Seen.' }] }

const eventsFor = (text) =>
  [
    { type: 'step_finish', part: { tokens: { input: 100, output: 20, cache: { read: 50 } }, cost: 0.002 } },
    { type: 'text', part: { text } },
  ]
    .map((e) => JSON.stringify(e))
    .join('\n')
const answer = (value) => `Done.\n${FENCE}json\n${JSON.stringify(value)}\n${FENCE}`

/** Runs `callAgent` with a fake opencode that returns `result`; returns what a caller could look at. */
async function call(result, extra = {}) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-call-test-'))
  const costs = []
  const runs = []
  const runAgent = async (options) => {
    runs.push(options)
    return result
  }
  let value
  let error = null
  try {
    value = await callAgent({
      flow: 'review',
      role: 'verifier',
      agent: 'verifier',
      model,
      message: 'Verify.',
      inputFile: path.join(out, 'in.md'),
      out,
      costs,
      runUrl: 'https://x/runs/1',
      schema: 'verification',
      deps: { runAgent },
      ...extra,
    })
  } catch (err) {
    error = err
  }
  const files = fs.readdirSync(out).sort()
  const final = (name) => fs.readFileSync(path.join(out, name), 'utf8')
  const finals = Object.fromEntries(files.filter((f) => f.endsWith('.final.md')).map((f) => [f, final(f)]))
  fs.rmSync(out, { recursive: true, force: true })
  return { value, error, costs, runs, files, finals }
}

test('callAgent returns the validated output, records the cost, and writes the final answer', async () => {
  const { value, error, costs, runs, finals } = await call({
    exitCode: 0,
    eventsText: eventsFor(answer(verification)),
    stderrTail: '',
  })
  assert.equal(error, null)
  assert.deepEqual(value, verification)
  assert.equal(costs.length, 1)
  assert.deepEqual(
    [costs[0].run, costs[0].flow, costs[0].role, costs[0].model, costs[0].variant, costs[0].usd],
    ['https://x/runs/1', 'review', 'verifier', 'openai/gpt-6-luna', 'max', 0.002],
  )
  assert.equal(runs.length, 1)
  assert.equal(runs[0].agent, 'verifier')
  assert.deepEqual(runs[0].files.length, 1)
  assert.match(runs[0].eventsFile, /verifier\.jsonl$/)
  assert.equal(runs[0].cwd, process.cwd())
  assert.match(finals['verifier.final.md'], /```json/)
})

test('callAgent: the suffix tells calls of one agent apart', async () => {
  const { files, runs } = await call(
    { exitCode: 0, eventsText: eventsFor(answer(verification)), stderrTail: '' },
    { suffix: '-r2' },
  )
  assert.match(runs[0].eventsFile, /verifier-r2\.jsonl$/)
  assert.deepEqual(files, ['verifier-r2.final.md'])
})

test('callAgent: a failed run without an answer records the cost and names the exit code', async () => {
  const { error, costs } = await call({
    exitCode: 3,
    eventsText: JSON.stringify({ type: 'step_finish', part: { tokens: { input: 1 }, cost: 0.5 } }),
    stderrTail: 'out of quota',
  })
  assert.match(error.message, /^verifier exited with 3: out of quota$/)
  assert.equal(costs.length, 1)
  assert.equal(costs[0].usd, 0.5)
})

test('callAgent: a non-zero exit with an answer still uses the answer', async () => {
  const { value, error } = await call({ exitCode: 1, eventsText: eventsFor(answer(verification)), stderrTail: '' })
  assert.equal(error, null)
  assert.deepEqual(value, verification)
})

test('callAgent: a broken contract throws ContractError, is logged, and the cost stays', async () => {
  lines.length = 0
  const { error, costs } = await call({ exitCode: 0, eventsText: eventsFor('No JSON here.'), stderrTail: '' })
  assert.ok(error instanceof ContractError)
  assert.equal(costs.length, 1)
  assert.ok(lines.some((l) => l.startsWith('::error::verifier broke its output contract')))
})

test('callAgent: a schema violation lists the problem', async () => {
  const bad = answer({ verdicts: [{ id: 1 }] })
  const { error } = await call({ exitCode: 0, eventsText: eventsFor(bad), stderrTail: '' })
  assert.ok(error instanceof ContractError)
  assert.match(error.message, /verdicts\[0\]\.id: expected string/)
})

test('callAgent: check runs on the valid output and its ContractError fails the call', async () => {
  const seen = []
  const ok = await call(
    { exitCode: 0, eventsText: eventsFor(answer(verification)), stderrTail: '' },
    { check: (output) => seen.push(output) },
  )
  assert.equal(ok.error, null)
  assert.deepEqual(seen, [verification])

  const bad = await call(
    { exitCode: 0, eventsText: eventsFor(answer(verification)), stderrTail: '' },
    {
      check: () => {
        throw new ContractError('The answer is inconsistent', ['x'])
      },
    },
  )
  assert.match(bad.error.message, /inconsistent/)
  assert.equal(bad.costs.length, 1)

  // The check does not run when the schema already failed.
  let ran = false
  await call(
    { exitCode: 0, eventsText: eventsFor('nothing'), stderrTail: '' },
    { check: () => { ran = true } },
  )
  assert.equal(ran, false)
})
