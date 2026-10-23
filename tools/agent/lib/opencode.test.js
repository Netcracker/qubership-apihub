const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { CONFIG_DIR, runEnv, runArgs } = require('./opencode')

test('the run environment drops every token and runner secret but keeps the OpenAI key', () => {
  const env = runEnv({
    PATH: '/bin',
    OPENAI_API_KEY: 'sk',
    GITHUB_TOKEN: 'ghs',
    GH_TOKEN: 'ghs',
    AGENT_PAT: 'pat',
    ACTIONS_RUNTIME_TOKEN: 'rt',
    INPUT_TOKEN: 'x',
  })
  assert.equal(env.PATH, '/bin')
  assert.equal(env.OPENAI_API_KEY, 'sk')
  for (const k of ['GITHUB_TOKEN', 'GH_TOKEN', 'AGENT_PAT', 'ACTIONS_RUNTIME_TOKEN', 'INPUT_TOKEN']) {
    assert.equal(env[k], undefined, k)
  }
  assert.equal(env.OPENCODE_CONFIG, path.join(CONFIG_DIR, 'opencode.json'))
  assert.equal(env.OPENCODE_CONFIG_DIR, CONFIG_DIR)
  assert.equal(env.OPENCODE_DISABLE_AUTOUPDATE, '1')
})

test('the arguments name the agent, the model, the variant, and the files, with the message last', () => {
  assert.deepEqual(
    runArgs({
      agent: 'pr-reviewer',
      model: { id: 'openai/gpt-6-luna', variant: 'max' },
      message: 'Review it.',
      files: ['/tmp/in.md'],
      title: 'PR 1',
    }),
    [
      'run', '--format', 'json', '--agent', 'pr-reviewer', '--model', 'openai/gpt-6-luna', '--variant', 'max',
      '--title', 'PR 1', '--file', '/tmp/in.md', 'Review it.',
    ],
  )
})

test('a model without a variant passes no --variant', () => {
  const args = runArgs({ agent: 'a', model: { id: 'openai/m', variant: null }, message: 'm' })
  assert.equal(args.includes('--variant'), false)
})
