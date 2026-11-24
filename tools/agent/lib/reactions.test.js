'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const log = require('./log')
const { react, commentIdOf } = require('./reactions')

const logged = []
log.setWriter((line) => logged.push(line))

test('commentIdOf: a positive integer, else null', () => {
  assert.equal(commentIdOf('9001'), 9001)
  assert.equal(commentIdOf(9001), 9001)
  for (const bad of ['', undefined, null, '0', '-1', 'abc', '1.5']) assert.equal(commentIdOf(bad), null, String(bad))
})

test('react adds the reaction to the comment', async () => {
  const calls = []
  const gh = { addReaction: async (id, content) => calls.push([id, content]) }
  assert.equal(await react({ gh, commentId: 9001, content: 'eyes' }), true)
  assert.deepEqual(calls, [[9001, 'eyes']])
})

test('react does nothing without a comment id, and only logs in dry-run', async () => {
  const gh = { addReaction: async () => assert.fail('no call expected') }
  assert.equal(await react({ gh, commentId: null, content: 'rocket' }), false)
  assert.equal(await react({ gh, commentId: undefined, content: 'rocket' }), false)
  assert.equal(await react({ gh, commentId: 9001, content: 'rocket', dryRun: true }), false)
})

test('react logs a warning when the call fails and does not throw', async () => {
  logged.length = 0
  const gh = {
    addReaction: async () => {
      throw new Error('Resource not accessible')
    },
  }
  assert.equal(await react({ gh, commentId: 9001, content: 'confused' }), false)
  assert.ok(logged.some((line) => line.startsWith('::warning::') && line.includes('Resource not accessible')))
})

test('react rejects a reaction the agent does not use', async () => {
  await assert.rejects(react({ gh: {}, commentId: 1, content: 'tada' }), /Unknown reaction 'tada'/)
})

test('inline reactions never use issue comment endpoints, including dry-run and failures', async () => {
  const calls = []
  const gh = {
    addReaction: async () => assert.fail('wrong comment endpoint'),
    addReviewCommentReaction: async (id, content) => calls.push([id, content]),
  }
  const input = { gh, commentId: 4643082805, content: 'eyes', eventName: 'pull_request_review_comment' }
  assert.equal(await react(input), true)
  assert.deepEqual(calls, [[4643082805, 'eyes']])
  assert.equal(await react({ ...input, dryRun: true }), false)
  assert.equal(calls.length, 1)
  gh.addReviewCommentReaction = async () => { throw new Error('403') }
  assert.equal(await react(input), false)
})
