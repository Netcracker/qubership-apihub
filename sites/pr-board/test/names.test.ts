import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commaList, parseList, sameName, splitList, uniqueNames } from '../src/names.ts';

test('SET-5: lists split on commas, spaces, and new lines, and drop repeats without regard to case', () => {
  assert.deepEqual(splitList(' a, b  c,,a\nd '), ['a', 'b', 'c', 'a', 'd']);
  assert.deepEqual(parseList(' a, b  c,,a, B '), ['a', 'b', 'c']);
});

test('FILTER-14: names compare and repeat without regard to case, keeping the first spelling', () => {
  assert.equal(sameName('Acme/Widgets', 'acme/widgets'), true);
  assert.deepEqual(uniqueNames(['Acme/Widgets', 'acme/widgets', 'acme/gadgets']), ['Acme/Widgets', 'acme/gadgets']);
});

test('FILTER-16 FILTER-17: names that may hold spaces split on commas only, trimmed, without blanks or repeats', () => {
  assert.deepEqual(commaList(' Monorepo & Co ,Old polyrepos,, old POLYREPOS '), ['Monorepo & Co', 'Old polyrepos']);
});
