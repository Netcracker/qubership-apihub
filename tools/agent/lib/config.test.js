'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadConfig, parseModel, isActorAllowed } = require('./config')

test('an empty environment gives the safe defaults', () => {
  assert.deepEqual(loadConfig({}), {
    enabled: false,
    dryRun: true,
    allowedActors: null,
    models: {
      implement: { id: 'openai/gpt-6.1-sol', variant: 'high' },
      review: { id: 'openai/gpt-6-luna', variant: 'max' },
      verify: { id: 'openai/gpt-6.1-sol', variant: 'medium' },
      light: { id: 'openai/gpt-6-luna', variant: 'medium' },
    },
    limits: { maxAttempts: 3, maxReviewRounds: 2, maxAnalyses: 5 },
  })
})

test('enabled needs the exact value true; dry run ends only with the exact value false', () => {
  assert.equal(loadConfig({ AGENT_ENABLED: 'true' }).enabled, true)
  assert.equal(loadConfig({ AGENT_ENABLED: 'TRUE' }).enabled, false)
  assert.equal(loadConfig({ AGENT_ENABLED: '1' }).enabled, false)
  assert.equal(loadConfig({ AGENT_DRY_RUN: 'false' }).dryRun, false)
  assert.equal(loadConfig({ AGENT_DRY_RUN: 'true' }).dryRun, true)
  assert.equal(loadConfig({ AGENT_DRY_RUN: '' }).dryRun, true)
  assert.equal(loadConfig({ AGENT_DRY_RUN: 'no' }).dryRun, true)
})

test('allowed actors are trimmed, lowercased, and stripped of empty items', () => {
  assert.deepEqual(loadConfig({ AGENT_ALLOWED_ACTORS: ' Alice, bob ,,CAROL ' }).allowedActors, [
    'alice',
    'bob',
    'carol',
  ])
  assert.equal(loadConfig({ AGENT_ALLOWED_ACTORS: '' }).allowedActors, null)
  assert.equal(loadConfig({ AGENT_ALLOWED_ACTORS: ' , ,' }).allowedActors, null)
})

test('models and limits come from the environment', () => {
  const config = loadConfig({
    AGENT_MODEL_IMPLEMENT: 'anthropic/claude-x',
    AGENT_MODEL_LIGHT: 'openai/mini:low',
    AGENT_MAX_ATTEMPTS: '7',
    AGENT_MAX_REVIEW_ROUNDS: ' 4 ',
    AGENT_MAX_ANALYSES: '1',
  })
  assert.deepEqual(config.models.implement, { id: 'anthropic/claude-x', variant: null })
  assert.deepEqual(config.models.light, { id: 'openai/mini', variant: 'low' })
  assert.deepEqual(config.limits, { maxAttempts: 7, maxReviewRounds: 4, maxAnalyses: 1 })
})

test('a blank variable falls back to the default', () => {
  const config = loadConfig({ AGENT_MAX_ATTEMPTS: '  ', AGENT_MODEL_VERIFY: '' })
  assert.equal(config.limits.maxAttempts, 3)
  assert.deepEqual(config.models.verify, { id: 'openai/gpt-6.1-sol', variant: 'medium' })
})

test('parseModel splits the variant at the last colon', () => {
  assert.deepEqual(parseModel('openai/gpt-6.1-sol:high'), { id: 'openai/gpt-6.1-sol', variant: 'high' })
  assert.deepEqual(parseModel('openai/gpt-6'), { id: 'openai/gpt-6', variant: null })
  assert.deepEqual(parseModel(' ollama/llama3:8b '), { id: 'ollama/llama3', variant: '8b' })
})

test('parseModel rejects a value without a provider and names the variable', () => {
  assert.throws(() => parseModel('gpt-6:high', 'AGENT_MODEL_REVIEW'), /AGENT_MODEL_REVIEW.*provider\/model/)
  assert.throws(() => parseModel('/gpt-6', 'X'), /X:/)
  assert.throws(() => parseModel('openai/', 'X'), /X:/)
  assert.throws(() => parseModel('', 'X'), /X:/)
  assert.throws(() => parseModel(undefined, 'X'), /X:/)
  assert.throws(() => parseModel('openai/gpt-6:', 'X'), /X:.*variant/)
})

test('loadConfig names the variable of a bad model', () => {
  assert.throws(() => loadConfig({ AGENT_MODEL_VERIFY: 'nomodel' }), /AGENT_MODEL_VERIFY/)
})

test('integer limits must be positive integers', () => {
  for (const bad of ['0', '-1', '1.5', 'abc', '1e3', '3 attempts']) {
    assert.throws(() => loadConfig({ AGENT_MAX_ATTEMPTS: bad }), /AGENT_MAX_ATTEMPTS/, bad)
  }
  assert.throws(() => loadConfig({ AGENT_MAX_REVIEW_ROUNDS: '0' }), /AGENT_MAX_REVIEW_ROUNDS/)
  assert.throws(() => loadConfig({ AGENT_MAX_ANALYSES: '2.5' }), /AGENT_MAX_ANALYSES/)
})

test('the implementer and the reviewer must be different models', () => {
  assert.throws(
    () => loadConfig({ AGENT_MODEL_IMPLEMENT: 'openai/same:high', AGENT_MODEL_REVIEW: 'openai/same:max' }),
    /AGENT_MODEL_IMPLEMENT and AGENT_MODEL_REVIEW must name different models/,
  )
})

test('isActorAllowed allows everyone without a list and matches case-insensitively with one', () => {
  assert.equal(isActorAllowed(loadConfig({}), 'anyone'), true)
  const config = loadConfig({ AGENT_ALLOWED_ACTORS: 'Alice,bob' })
  assert.equal(isActorAllowed(config, 'ALICE'), true)
  assert.equal(isActorAllowed(config, 'bob'), true)
  assert.equal(isActorAllowed(config, 'mallory'), false)
  assert.equal(isActorAllowed(config, undefined), false)
})
