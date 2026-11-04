import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  displayLogin, formatAge, formatAgo, initials, labelTextColor, plural, repositoriesSummary, repositoryLabel,
} from '../../src/board/format.ts';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MINUTE = 60 * 1000;

test('TABLE-10: ages read today or a number of days', () => {
  assert.equal(formatAge(0), 'today');
  assert.equal(formatAge(1), '1 day');
  assert.equal(formatAge(12), '12 days');
  assert.equal(plural(1, 'comment'), '1 comment');
  assert.equal(plural(0, 'comment'), '0 comments');
});

test('TABLE-10: relative times go from just now to minutes, hours, yesterday, and days', () => {
  assert.equal(formatAgo(ago(0), NOW), 'just now');
  assert.equal(formatAgo(ago(MINUTE), NOW), 'just now');
  assert.equal(formatAgo(ago(5 * MINUTE), NOW), '5 min ago');
  assert.equal(formatAgo(ago(60 * MINUTE), NOW), '1 hour ago');
  assert.equal(formatAgo(ago(23 * 60 * MINUTE), NOW), '23 hours ago');
  assert.equal(formatAgo(ago(24 * 60 * MINUTE), NOW), 'yesterday');
  assert.equal(formatAgo(ago(3 * 24 * 60 * MINUTE), NOW), '3 days ago');
});

test('TABLE-9: logins drop the [bot] suffix, and initials come from the parts of the login', () => {
  assert.equal(displayLogin({ login: 'renovate[bot]', avatarUrl: null, bot: true }), 'renovate');
  assert.equal(displayLogin({ login: 'anna-dev', avatarUrl: null, bot: false }), 'anna-dev');
  assert.equal(initials('new-contributor-42'), 'NC');
  assert.equal(initials('x[bot]'), 'X', 'the [bot] suffix never reaches the initials');
  assert.equal(initials('dependabot'), 'DE');
  assert.equal(initials('renovate[bot]'), 'RE');
});

test('TABLE-7: light label colors get dark text and dark ones light text', () => {
  assert.equal(labelTextColor('ffffff'), 'var(--label-ink-dark)');
  assert.equal(labelTextColor('fbca04'), 'var(--label-ink-dark)');
  assert.equal(labelTextColor('000000'), 'var(--label-ink-light)');
  assert.equal(labelTextColor('1d76db'), 'var(--label-ink-light)');
});

test('TABLE-26: the Repository cell shows the name alone, and the owner only when two names are the same', () => {
  assert.equal(repositoryLabel('acme/gadgets', ['acme/widgets', 'acme/gadgets']), 'gadgets');
  assert.equal(repositoryLabel('acme/gadgets', ['globex/widgets', 'acme/gadgets']), 'gadgets', 'different owners need no owner');
  assert.equal(repositoryLabel('acme/gadgets', ['acme/widgets', 'globex/gadgets', 'acme/gadgets']), 'acme/gadgets');
  assert.equal(repositoryLabel('acme/gadgets', ['acme/widgets', 'globex/Gadgets', 'acme/gadgets']), 'acme/gadgets', 'names compare without case');
});

test('TABLE-27: the header names one or two repositories, and more as the first one and +N more', () => {
  assert.equal(repositoriesSummary(['acme/widgets']), 'acme/widgets');
  assert.equal(repositoriesSummary(['acme/widgets', 'acme/gadgets']), 'acme/widgets, acme/gadgets');
  assert.equal(repositoriesSummary(['acme/widgets', 'acme/gadgets', 'acme/gizmos']), 'acme/widgets +2 more');
  assert.equal(repositoriesSummary(['acme/widgets', 'acme/gadgets', 'acme/gizmos', 'acme/tools']), 'acme/widgets +3 more');
  assert.equal(repositoriesSummary([]), '');
});
