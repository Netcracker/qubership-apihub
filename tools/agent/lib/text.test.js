'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { inline, clip, tailLines, stripAnsi } = require('./text')

test('inline: one line, and a mention cannot notify anyone', () => {
  assert.equal(inline('  a\n\n  b  '), 'a b')
  assert.equal(inline('ping @alice and @org/team'), 'ping @​alice and @​org/team')
  assert.equal(inline('mail me@ home'), 'mail me@ home')
  assert.equal(inline(null), 'null')
})

test('clip: short text stays, long text is cut with a note', () => {
  assert.equal(clip('abc', 5), 'abc')
  assert.equal(clip(undefined, 5), '')
  assert.equal(clip('abcdef', 3), 'abc\n[cut: the text is longer than 3 characters]')
})

test('tailLines: the last lines, trailing blank lines dropped', () => {
  assert.equal(tailLines('a\nb\nc\nd\n\n', 2), 'c\nd')
  assert.equal(tailLines('a\nb', 10), 'a\nb')
  assert.equal(tailLines('', 3), '')
  assert.equal(tailLines(undefined, 3), '')
})

test('stripAnsi: removes color and cursor sequences', () => {
  assert.equal(stripAnsi('\u001b[31mred\u001b[0m \u001b[2K\u001b[1Gdone'), 'red done')
  assert.equal(stripAnsi(undefined), '')
})
