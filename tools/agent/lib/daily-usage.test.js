'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { WINDOW_MS, windowStart, toSearchTime, isInWindow, countAnalyses, countReviews } = require('./daily-usage')

const now = new Date('2026-10-25T12:00:00.000Z')
const since = windowStart(now)

test('the window is the 24 hours before now, and a search time has no milliseconds', () => {
  assert.equal(now.getTime() - since.getTime(), WINDOW_MS)
  assert.equal(toSearchTime(since), '2026-10-24T12:00:00Z')
  assert.equal(toSearchTime(new Date('2026-01-02T03:04:05.000Z')), '2026-01-02T03:04:05Z')
})

test('a time is in the window from its start on, and a bad time is never in it', () => {
  assert.equal(isInWindow(since.toISOString(), since), true)
  assert.equal(isInWindow('2026-10-24T11:59:59.999Z', since), false)
  assert.equal(isInWindow('2026-10-25T11:59:59Z', since), true)
  for (const bad of [undefined, null, '', 'yesterday', 42]) assert.equal(isInWindow(bad, since), false, String(bad))
})

const analysis = (trigger, at) => ({ trigger, at, verdict: 'suitable', run: 'r' })

test('countAnalyses counts opened, typed, and sweep entries in the window, across issues', () => {
  const states = [
    { analyses: [analysis('opened', '2026-10-25T10:00:00Z'), analysis('sweep', '2026-10-25T11:00:00Z')] },
    { analyses: [analysis('typed', '2026-10-24T12:00:00Z')] },
  ]
  assert.equal(countAnalyses(states, since), 3)
})

test('countAnalyses leaves out answers of the author, commands, old entries, and unknown triggers', () => {
  const states = [{
    analyses: [
      analysis('edited', '2026-10-25T10:00:00Z'),
      analysis('author-reply', '2026-10-25T10:00:00Z'),
      analysis('command', '2026-10-25T10:00:00Z'),
      analysis('unknown', '2026-10-25T10:00:00Z'),
      analysis(undefined, '2026-10-25T10:00:00Z'),
      analysis('opened', '2026-10-24T11:59:59Z'),
      analysis('opened', undefined),
    ],
  }]
  assert.equal(countAnalyses(states, since), 0)
})

test('countAnalyses tolerates states without analyses and null states', () => {
  assert.equal(countAnalyses([{}, null, { analyses: null }, { analyses: [null] }], since), 0)
  assert.equal(countAnalyses([], since), 0)
})

test('countReviews counts auto entries and old entries without a trigger', () => {
  const states = [{
    reviews: [
      { sha: 'a', at: '2026-10-25T09:00:00Z', trigger: 'auto' },
      { sha: 'b', at: '2026-10-25T09:00:00Z' },
      { sha: 'c', at: since.toISOString(), trigger: 'auto' },
    ],
  }]
  assert.equal(countReviews(states, since), 3)
})

test('countReviews leaves out commands, size skips, and entries outside the window', () => {
  const states = [{
    reviews: [
      { sha: 'a', at: '2026-10-25T09:00:00Z', trigger: 'command' },
      { sha: 'b', at: '2026-10-25T09:00:00Z', trigger: 'auto', skipped: 'size', lines: 9000, files: 3 },
      { sha: 'c', at: '2026-10-25T09:00:00Z', skipped: 'size' },
      { sha: 'd', at: '2026-10-24T11:59:59Z', trigger: 'auto' },
      { sha: 'e', trigger: 'auto' },
    ],
  }]
  assert.equal(countReviews(states, since), 0)
  assert.equal(countReviews([{}, null, { reviews: null }], since), 0)
})
