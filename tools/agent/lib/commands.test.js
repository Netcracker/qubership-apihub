'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseCommand } = require('./commands')

test('ordinary comments are not commands', () => {
  assert.equal(parseCommand('looks good to me'), null)
  assert.equal(parseCommand(''), null)
  assert.equal(parseCommand('   \n\n  '), null)
  assert.equal(parseCommand(undefined), null)
  assert.equal(parseCommand('thanks\n/agent review'), null)
  assert.equal(parseCommand('please run /agent review'), null)
})

test('/agentx and other longer words are not commands', () => {
  assert.equal(parseCommand('/agentx review'), null)
  assert.equal(parseCommand('/agents'), null)
  assert.equal(parseCommand('/agent-review'), null)
})

test('/agent alone is help', () => {
  assert.deepEqual(parseCommand('/agent'), { name: 'help', force: false, notes: '' })
  assert.deepEqual(parseCommand('  /AGENT  \n\n'), { name: 'help', force: false, notes: '' })
})

test('known names are recognized in any case', () => {
  for (const name of ['review', 'analyze', 'implement', 'retry', 'rerun', 'stop', 'cost', 'help']) {
    assert.deepEqual(parseCommand(`/agent ${name}`), { name, force: false, notes: '' })
    assert.deepEqual(parseCommand(`/Agent ${name.toUpperCase()}`), { name, force: false, notes: '' })
  }
})

test('rerun takes notes like the other commands', () => {
  assert.deepEqual(parseCommand('/agent rerun'), { name: 'rerun', force: false, notes: '' })
  assert.deepEqual(parseCommand('/agent rerun the E2E job flaked\nsecond line'), {
    name: 'rerun',
    force: false,
    notes: 'the E2E job flaked\nsecond line',
  })
})

test('fix is normalized to implement', () => {
  assert.deepEqual(parseCommand('/agent fix'), { name: 'implement', force: false, notes: '' })
})

test('leading blank lines are ignored and the first line is trimmed', () => {
  assert.deepEqual(parseCommand('\n\n   /agent   review   \n'), { name: 'review', force: false, notes: '' })
})

test('force counts only after implement or fix', () => {
  assert.deepEqual(parseCommand('/agent implement force'), { name: 'implement', force: true, notes: '' })
  assert.deepEqual(parseCommand('/agent fix FORCE use the v2 API'), {
    name: 'implement',
    force: true,
    notes: 'use the v2 API',
  })
  assert.deepEqual(parseCommand('/agent implement forceful change'), {
    name: 'implement',
    force: false,
    notes: 'forceful change',
  })
  assert.deepEqual(parseCommand('/agent review force'), { name: 'review', force: false, notes: 'force' })
})

test('notes hold the rest of the first line and all following lines', () => {
  assert.deepEqual(parseCommand('/agent implement keep the API stable\n\nSecond paragraph.\r\nThird line.\n'), {
    name: 'implement',
    force: false,
    notes: 'keep the API stable\n\nSecond paragraph.\nThird line.',
  })
  assert.deepEqual(parseCommand('/agent review\nfocus on the SQL migration'), {
    name: 'review',
    force: false,
    notes: 'focus on the SQL migration',
  })
})

test('an unknown word makes the whole text a chat request', () => {
  assert.deepEqual(parseCommand('/agent why is the build red?\nIt passed yesterday.'), {
    name: 'chat',
    force: false,
    notes: 'why is the build red?\nIt passed yesterday.',
  })
  assert.deepEqual(parseCommand('/agent reviewing now'), { name: 'chat', force: false, notes: 'reviewing now' })
})

test('text on a later line only, after a bare /agent, is a chat request', () => {
  assert.deepEqual(parseCommand('/agent\nwhat does this do?'), {
    name: 'chat',
    force: false,
    notes: 'what does this do?',
  })
})
