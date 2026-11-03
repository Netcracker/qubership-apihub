const { test } = require('node:test')
const assert = require('node:assert/strict')
const log = require('./log')

function capture(fn) {
  const lines = []
  const previous = log.setWriter((l) => lines.push(l))
  return Promise.resolve(fn())
    .finally(() => log.setWriter(previous))
    .then(
      () => lines,
      (err) => {
        err.lines = lines
        throw err
      },
    )
}

test('info prints fields, quoting values with spaces and skipping undefined', async () => {
  const fields = { action: 'review', reason: 'pull request opened', x: undefined }
  const lines = await capture(() => log.info('decision', fields))
  assert.deepEqual(lines, ['[agent] decision action=review reason="pull request opened"'])
})

test('group wraps the step and logs its duration, also when it fails', async () => {
  let t = 0
  const now = () => (t += 1500)
  const ok = await capture(() => log.group('load', async () => 42, now))
  assert.equal(ok[0], '::group::load')
  assert.equal(ok[1], '[agent] load: done seconds=1.5')
  assert.equal(ok.at(-1), '::endgroup::')

  await assert.rejects(
    capture(() => log.group('publish', async () => { throw new Error('boom') }, now)),
    (err) => err.lines.some((l) => l.includes('publish: failed') && l.includes('error=boom')) &&
      err.lines.at(-1) === '::endgroup::',
  )
})

test('annotations stay on one line', async () => {
  const lines = await capture(() => log.warn('first\nsecond'))
  assert.deepEqual(lines, ['::warning::first second'])
})

test('model events become one readable line each', () => {
  assert.equal(
    log.modelEventLine('pr-reviewer', {
      type: 'tool_use',
      part: { tool: 'bash', state: { status: 'error', input: { command: 'curl x' }, error: 'rejected by rule' } },
    }),
    '[agent] pr-reviewer tool bash: curl x -> ERROR rejected by rule',
  )
  assert.equal(
    log.modelEventLine('verifier', {
      type: 'step_finish',
      part: {
        reason: 'stop',
        cost: 0.0123,
        tokens: { input: 3, output: 10, reasoning: 2, cache: { write: 97, read: 400 } },
      },
    }),
    '[agent] verifier step done reason=stop uncached=100 cached=400 output=10 reasoning=2 usd=0.0123',
  )
  assert.equal(
    log.modelEventLine('a', { type: 'text', part: { text: 'line one\nline two' } }),
    '[agent] a says: line one line two',
  )
  assert.equal(log.modelEventLine('a', { type: 'step_start', part: {} }), null)
})
