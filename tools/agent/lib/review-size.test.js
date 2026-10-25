'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { LOCK_FILES, measureDiff, exceedsLimit, checkSize, renderSkip } = require('./review-size')

const file = (filename, additions, deletions) => ({ filename, additions, deletions })
const limits = { reviewMaxLines: 100, reviewMaxFiles: 3 }

test('measureDiff adds additions and deletions and counts the files', () => {
  assert.deepEqual(measureDiff([file('a.go', 10, 5), file('b/c.ts', 1, 0)]), { lines: 16, files: 2 })
  assert.deepEqual(measureDiff([]), { lines: 0, files: 0 })
  assert.deepEqual(measureDiff([{ filename: 'x' }]), { lines: 0, files: 1 })
})

test('measureDiff leaves out lock files by basename, in any folder', () => {
  const files = [
    file('a.go', 10, 0),
    file('pnpm-lock.yaml', 5000, 4000),
    file('frontend/package-lock.json', 300, 300),
    file('deep/yarn.lock', 10, 10),
    file('backend/go.sum', 20, 20),
    file('go.work.sum', 3, 3),
  ]
  assert.deepEqual(LOCK_FILES.length, 5)
  assert.deepEqual(measureDiff(files), { lines: 10, files: 1 })
  // Only the basename counts: a folder or a longer name that merely contains the text is a normal file.
  assert.deepEqual(measureDiff([file('docs/go.sum/readme.md', 1, 1), file('my-pnpm-lock.yaml', 1, 1)]), {
    lines: 4,
    files: 2,
  })
})

test('exceedsLimit allows a diff exactly at a limit and stops one above', () => {
  assert.equal(exceedsLimit({ lines: 100, files: 3 }, limits), false)
  assert.equal(exceedsLimit({ lines: 101, files: 3 }, limits), true)
  assert.equal(exceedsLimit({ lines: 100, files: 4 }, limits), true)
  assert.equal(exceedsLimit({ lines: 0, files: 0 }, limits), false)
})

test('checkSize skips a diff above a limit unless the review is forced', () => {
  const big = [file('a.go', 60, 41)]
  assert.deepEqual(checkSize(big, limits), { size: { lines: 101, files: 1 }, tooBig: true, skip: true })
  assert.deepEqual(checkSize(big, limits, true), { size: { lines: 101, files: 1 }, tooBig: true, skip: false })
  const many = ['a', 'b', 'c', 'd'].map((name) => file(name, 1, 1))
  assert.equal(checkSize(many, limits).skip, true)
  assert.equal(checkSize(many.slice(0, 3), limits).skip, false)
  // Lock files do not make a diff big.
  assert.equal(checkSize([file('a.go', 100, 0), file('pnpm-lock.yaml', 9000, 9000)], limits).skip, false)
})

test('renderSkip names the size, the limits, the variables, and the force command', () => {
  const text = renderSkip({
    headSha: 'abcdef0123456789',
    size: { lines: 5001, files: 12 },
    limits: { reviewMaxLines: 5000, reviewMaxFiles: 150 },
    runUrl: 'https://github.com/o/r/actions/runs/1',
  })
  const [heading, blank, body, , footer] = text.split('\n')
  assert.equal(heading, '### AI review of abcdef0 skipped')
  assert.equal(blank, '')
  assert.equal(
    body,
    'The diff has 5001 changed lines in 12 files (lock files not counted), above the limit of 5000 lines or 150 ' +
      'files (AGENT_REVIEW_MAX_LINES, AGENT_REVIEW_MAX_FILES). An AI review of a diff this large costs much and ' +
      'finds little. Comment `/agent review force` to review it anyway.',
  )
  assert.equal(footer, '<sub>[Run](https://github.com/o/r/actions/runs/1)</sub>')
})
