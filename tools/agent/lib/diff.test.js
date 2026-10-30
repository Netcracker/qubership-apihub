'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { commentableLines } = require('./diff')

const sorted = (set) => [...set].sort((a, b) => a - b)

test('a patch with two hunks yields the added and context lines of both', () => {
  const patch = [
    '@@ -1,4 +1,5 @@',
    ' one',
    '+inserted',
    ' two',
    ' three',
    ' four',
    '@@ -20,3 +21,3 @@ func main() {',
    ' keep',
    '-old',
    '+new',
    ' tail',
  ].join('\n')
  assert.deepEqual(sorted(commentableLines(patch)), [1, 2, 3, 4, 5, 21, 22, 23])
})

test('removed lines do not advance the new-file counter and are not commentable', () => {
  const patch = ['@@ -5,4 +5,2 @@', ' a', '-b', '-c', ' d'].join('\n')
  assert.deepEqual(sorted(commentableLines(patch)), [5, 6])
})

test('a hunk of only added lines starts at the new-file start line', () => {
  const patch = ['@@ -0,0 +1,3 @@', '+x', '+y', '+z'].join('\n')
  assert.deepEqual(sorted(commentableLines(patch)), [1, 2, 3])
})

test('the "No newline at end of file" marker is ignored', () => {
  const patch = [
    '@@ -1,2 +1,2 @@',
    ' keep',
    '-last',
    '\\ No newline at end of file',
    '+last changed',
    '\\ No newline at end of file',
  ].join('\n')
  assert.deepEqual(sorted(commentableLines(patch)), [1, 2])
})

test('a hunk header without counts means one line on each side', () => {
  const patch = ['@@ -1 +1 @@', '-old', '+new'].join('\n')
  assert.deepEqual(sorted(commentableLines(patch)), [1])
})

test('a trailing newline does not add a phantom line', () => {
  const patch = '@@ -3 +3,2 @@\n a\n+b\n'
  assert.deepEqual(sorted(commentableLines(patch)), [3, 4])
})

test('a blank context line whose space was stripped still counts, inside the header counts only', () => {
  const patch = '@@ -1,3 +1,3 @@\n a\n\n c\n\n'
  assert.deepEqual(sorted(commentableLines(patch)), [1, 2, 3])
})

test('CRLF line endings in the patch are accepted', () => {
  const patch = '@@ -1 +1,2 @@\r\n a\r\n+b\r\n'
  assert.deepEqual(sorted(commentableLines(patch)), [1, 2])
})

test('a removed line that starts with dashes is still a removed line', () => {
  const patch = ['@@ -1,2 +1,1 @@', '--- a/not-a-header', ' kept'].join('\n')
  assert.deepEqual(sorted(commentableLines(patch)), [1])
})

test('an undefined, empty, or hunk-less patch gives an empty set', () => {
  assert.equal(commentableLines(undefined).size, 0)
  assert.equal(commentableLines('').size, 0)
  assert.equal(commentableLines('Binary files differ').size, 0)
  assert.ok(commentableLines(undefined) instanceof Set)
})
