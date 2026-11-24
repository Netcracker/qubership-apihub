'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const log = require('./log')
const stops = require('./stops')

const logged = []
log.setWriter((line) => logged.push(line))

/** A fake client over `labels` (number -> label names) that records the calls. */
function fakeGh(labels, { failOn } = {}) {
  const calls = []
  return {
    calls,
    getIssue: async (n) => {
      if (n === failOn) throw new Error('boom')
      return { labels: (labels[n] ?? []).map((name) => ({ name })) }
    },
    removeLabel: async (n, name) => calls.push(['remove', n, name]),
    addLabels: async (n, names) => calls.push(['add', n, ...names]),
  }
}

test('labelOf, isStopLabel, stopLabels', () => {
  assert.equal(stops.REASONS.length, 14)
  assert.equal(stops.labelOf('stuck'), 'needs-human:stuck')
  assert.throws(() => stops.labelOf('nope'), /Unknown stop reason/)
  assert.equal(stops.isStopLabel('needs-human:invalid'), true)
  assert.equal(stops.isStopLabel('needs-human:nope'), false)
  assert.equal(stops.isStopLabel('agent:needs-human'), false)
  assert.deepEqual(stops.stopLabels([{ name: 'ai:suitable' }, { name: 'needs-human:stuck' }, 'needs-human:invalid']), [
    'needs-human:stuck',
    'needs-human:invalid',
  ])
})

test('setStop adds the label and removes the other stop labels', async () => {
  const gh = fakeGh({ 1: ['needs-human:stuck', 'ai:suitable'], 2: [] })
  assert.equal(await stops.setStop(gh, [1, null, 2], 'invalid'), null)
  assert.deepEqual(gh.calls, [
    ['remove', 1, 'needs-human:stuck'],
    ['add', 1, 'needs-human:invalid'],
    ['add', 2, 'needs-human:invalid'],
  ])
})

test('setStop does not add a label that is present, and goes on after an error', async () => {
  const gh = fakeGh({ 1: ['needs-human:invalid'], 3: [] }, { failOn: 2 })
  logged.length = 0
  const error = await stops.setStop(gh, [1, 2, 3], 'invalid')
  assert.equal(error.message, 'boom')
  assert.deepEqual(gh.calls, [['add', 3, 'needs-human:invalid']])
  assert.ok(logged.some((l) => l.startsWith('::warning::') && l.includes('#2')))
})

test('clearStops removes every stop label except the kept reasons', async () => {
  const gh = fakeGh({ 1: ['needs-human:stuck', 'needs-human:approval-required', 'agent:completed'] })
  assert.equal(await stops.clearStops(gh, [1, 0], { keep: ['approval-required'] }), null)
  assert.deepEqual(gh.calls, [['remove', 1, 'needs-human:stuck']])
  const all = fakeGh({ 1: ['needs-human:stuck', 'needs-human:approval-required'] })
  await stops.clearStops(all, [1])
  assert.equal(all.calls.length, 2)
})

test('clearStops returns the first error', async () => {
  const gh = fakeGh({}, { failOn: 1 })
  assert.equal((await stops.clearStops(gh, [1, 2])).message, 'boom')
})

test('blocking stops remove stale completion; waiting for approval preserves completion', async () => {
  const gh = fakeGh({ 1: ['agent:completed', 'ai:l1-executor'], 2: ['agent:completed'] })
  await stops.setStop(gh, [1], 'verification-blocked')
  await stops.setStop(gh, [2], 'approval-required')
  assert.deepEqual(gh.calls, [
    ['remove', 1, 'agent:completed'],
    ['add', 1, 'needs-human:verification-blocked'],
    ['add', 2, 'needs-human:approval-required'],
  ])
})

test('clearCompleted removes only completion, deduplicates targets, and continues after an error', async () => {
  const gh = fakeGh({ 1: ['agent:completed', 'ai:l1-executor'], 3: ['agent:completed'], 4: [] }, { failOn: 2 })
  assert.equal((await stops.clearCompleted(gh, [1, 1, null, 2, 3, 4])).message, 'boom')
  assert.deepEqual(gh.calls, [['remove', 1, 'agent:completed'], ['remove', 3, 'agent:completed']])
})

test('recordStop appends, closes the open entry, and skips approval-required', () => {
  const first = stops.recordStop({ costs: [] }, { reason: 'stuck', at: 't1', run: 'r1', on: [5, null, 6] })
  assert.deepEqual(first.stops, [{ reason: 'stuck', at: 't1', run: 'r1', on: [5, 6] }])
  const second = stops.recordStop(first, { reason: 'invalid', at: 't2', run: 'r2', on: [5] })
  assert.equal(second.stops[0].resumedAt, 't2')
  assert.equal(second.stops[1].resumedAt, undefined)
  assert.equal(first.stops[0].resumedAt, undefined)
  const same = stops.recordStop(second, { reason: 'approval-required', at: 't3', run: 'r3', on: [6] })
  assert.equal(same, second)
  assert.throws(() => stops.recordStop(second, { reason: 'nope', at: 't', run: 'r', on: [] }))
})

test('recordResume closes the open entry and is a no-op without one', () => {
  const st = stops.recordStop({}, { reason: 'stuck', at: 't1', run: 'r1', on: [5] })
  const resumed = stops.recordResume(st, { at: 't2', run: 'r2' })
  assert.equal(resumed.stops[0].resumedAt, 't2')
  assert.equal(resumed.stops[0].resumedRun, 'r2')
  assert.equal(stops.recordResume(resumed, { at: 't3', run: 'r3' }), resumed)
  const empty = {}
  assert.equal(stops.recordResume(empty, { at: 't', run: 'r' }), empty)
})

test('renderStop lays out the fields and leaves out empty ones', () => {
  assert.deepEqual(stops.renderStop({ reason: 'stuck', blocker: 'B', done: '', action: 'A', resume: 'R' }), [
    '**Reason:** `needs-human:stuck`',
    '',
    '**Blocker.** B',
    '',
    '**Required action.** A',
    '',
    '**Resume condition.** R',
  ])
  assert.deepEqual(stops.renderStop({ reason: 'invalid' }), ['**Reason:** `needs-human:invalid`'])
})
