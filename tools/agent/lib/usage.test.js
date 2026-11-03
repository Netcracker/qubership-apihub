'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseEvents, summarize, costRecord, formatUsd } = require('./usage')

const step = (tokens, cost) => JSON.stringify({ type: 'step_finish', part: { tokens, cost } })

test('parseEvents skips blank lines, noise, and truncated JSON', () => {
  const text = [
    '',
    'opencode starting...',
    '{"type":"text","part":{"text":"hi"}}',
    '   ',
    '{"type":"step_finish"',
    '[1,2]',
    '{"type":"error","error":{"message":"boom"}}\r',
  ].join('\n')
  assert.deepEqual(parseEvents(text), [
    { type: 'text', part: { text: 'hi' } },
    { type: 'error', error: { message: 'boom' } },
  ])
  assert.deepEqual(parseEvents(''), [])
  assert.deepEqual(parseEvents(undefined), [])
})

test('summarize sums every step_finish', () => {
  const events = parseEvents(
    [
      step({ input: 10, output: 2, reasoning: 1, cache: { read: 5, write: 0 } }, 0.001),
      '{"type":"text","part":{"text":"first"}}',
      step({ input: 20, output: 4, reasoning: 3, cache: { read: 15, write: 2 } }, 0.002),
      '{"type":"text","part":{"text":"last"}}',
    ].join('\n'),
  )
  const summary = summarize(events)
  assert.equal(summary.steps, 2)
  // cache.write is the uncached prompt in opencode 1.19, so it counts as input: 10 + 20 + 2.
  assert.equal(summary.input, 32)
  assert.equal(summary.cached, 20)
  assert.equal(summary.output, 6)
  assert.equal(summary.reasoning, 4)
  assert.ok(Math.abs(summary.usd - 0.003) < 1e-12)
  assert.equal(summary.finalText, 'last')
  assert.deepEqual(summary.errors, [])
})

test('missing fields count as zero and an empty run gives a zero summary', () => {
  const summary = summarize([
    { type: 'step_finish', part: {} },
    { type: 'step_finish', part: { tokens: { input: 'many', cache: {} }, cost: null } },
    { type: 'step_finish' },
  ])
  const zero = { steps: 0, input: 0, cached: 0, output: 0, reasoning: 0, usd: 0, finalText: '', errors: [] }
  assert.deepEqual(summary, { ...zero, steps: 3 })
  assert.deepEqual(summarize([]), zero)
  assert.equal(summarize(undefined).steps, 0)
})

test('summarize collects error payloads and ignores other events', () => {
  const summary = summarize([
    { type: 'error', error: { message: 'rate limit' } },
    { type: 'tool_use', part: { tool: 'bash', state: { status: 'error', error: 'exit 1' } } },
    { type: 'error', error: 'plain' },
    { type: 'error' },
    { type: 'text', part: {} },
  ])
  assert.deepEqual(summary.errors, [{ message: 'rate limit' }, 'plain', { type: 'error' }])
  assert.equal(summary.finalText, '')
  assert.equal(summary.steps, 0)
})

test('costRecord copies the summary and stamps the injected time', () => {
  const summary = { steps: 2, input: 30, cached: 20, output: 6, reasoning: 4, usd: 0.003, finalText: 'x', errors: [] }
  const fixed = new Date('2026-10-23T10:00:00.000Z')
  const expected = {
    run: '123-1',
    flow: 'review',
    role: 'review',
    model: 'openai/gpt-6-luna',
    variant: 'max',
    input: 30,
    cached: 20,
    output: 6,
    reasoning: 4,
    usd: 0.003,
    at: '2026-10-23T10:00:00.000Z',
  }
  const base = { run: '123-1', flow: 'review', role: 'review', model: 'openai/gpt-6-luna', variant: 'max', summary }
  assert.deepEqual(costRecord({ ...base, now: () => fixed }), expected)
  assert.deepEqual(costRecord({ ...base, now: fixed }), expected)
})

test('costRecord uses the real clock by default', () => {
  const before = Date.now()
  const record = costRecord({
    run: 'r',
    flow: 'f',
    role: 'light',
    model: 'm/x',
    variant: null,
    summary: summarize([]),
  })
  const at = Date.parse(record.at)
  assert.ok(at >= before && at <= Date.now())
  assert.equal(record.variant, null)
})

test('formatUsd uses two decimals from one cent and four below', () => {
  assert.equal(formatUsd(1.234), '1.23')
  assert.equal(formatUsd(0.01), '0.01')
  assert.equal(formatUsd(0.0099), '0.0099')
  assert.equal(formatUsd(0.00012), '0.0001')
  assert.equal(formatUsd(0), '0.0000')
  assert.equal(formatUsd(undefined), '0.0000')
  assert.equal(formatUsd(12), '12.00')
})
