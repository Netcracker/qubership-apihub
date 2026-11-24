'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { MAIN_ROLE, modelName, tokens, usd, signatureLine, recordsOfRuns, sign } = require('./signature')

test('modelName drops the provider prefix', () => {
  assert.equal(modelName('openai/gpt-6.1-sol'), 'gpt-6.1-sol')
  assert.equal(modelName('gpt-6.1-sol'), 'gpt-6.1-sol')
})

test('tokens: integer, thousands with one decimal, whole thousands from 100k', () => {
  assert.equal(tokens(950), '950')
  assert.equal(tokens(0), '0')
  assert.equal(tokens(12000), '12k')
  assert.equal(tokens(12500), '12.5k')
  assert.equal(tokens(970000), '970k')
  assert.equal(tokens(1234000), '1234k')
})

test('usd: two significant digits, no exponent', () => {
  assert.equal(usd(0.0042), '0.0042')
  assert.equal(usd(0.083), '0.083')
  assert.equal(usd(0.08349), '0.083')
  assert.equal(usd(1.34), '1.3')
  assert.equal(usd(12.4), '12')
  assert.equal(usd(0), '0')
  assert.equal(usd(0.000012), '0.000012')
})

test('signatureLine: null for no records', () => {
  assert.equal(signatureLine([]), null)
  assert.equal(signatureLine(undefined), null)
})

test('signatureLine: sums the records and takes the model of the main role', () => {
  const records = [
    { role: 'analyst', model: 'openai/a', variant: 'low', input: 1000, cached: 0, output: 0, reasoning: 0, usd: 0.01, at: '2' },
    { role: 'implementer', model: 'openai/gpt-6.1-sol', variant: 'high', input: 11000, cached: 40000, output: 2000, reasoning: 1000, usd: 0.073, at: '1' },
  ]
  assert.equal(
    signatureLine(records, { mainRole: 'implementer' }),
    '<sub>🤖 gpt-6.1-sol high in=12k cached=40k out=3k usd=0.083</sub>',
  )
  // Without a matching role the newest record names the model.
  assert.match(signatureLine(records, { mainRole: 'nobody' }), /^<sub>🤖 a low /)
})

test('signatureLine: leaves out fields that no record has', () => {
  const line = signatureLine([{ role: 'x', model: 'p/m', variant: 'high', input: 5, usd: 0.5 }])
  assert.equal(line, '<sub>🤖 m high in=5 usd=0.5</sub>')
  assert.equal(signatureLine([{ role: 'x', usd: 1 }]), '<sub>🤖 usd=1</sub>')
})

test('recordsOfRuns and sign', () => {
  const costs = [{ run: 'r1', usd: 1 }, { run: 'r2', usd: 2 }, { run: 'r3', usd: 4 }]
  assert.deepEqual(recordsOfRuns(costs, ['r1', 'r3']).map((r) => r.run), ['r1', 'r3'])
  assert.equal(sign('Text\n\n', recordsOfRuns(costs, ['r1', 'r2'])), 'Text\n\n<sub>🤖 usd=3</sub>')
  assert.equal(sign('Text', []), 'Text')
})

test('MAIN_ROLE names the model role of each family', () => {
  assert.deepEqual(MAIN_ROLE, {
    analysis: 'analyst',
    implementation: 'implementer',
    review: 'pr-reviewer',
    chat: 'assistant',
    'ci-check': 'ci-triager',
  })
})
