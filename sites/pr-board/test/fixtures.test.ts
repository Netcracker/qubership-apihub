import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { avatarSvg, AVATAR_PATH } from '../dev/avatars.ts';
import { cornerCaseNodes } from '../dev/fixtures/corner-cases.ts';
import { BOTS, PEOPLE, TEAMS } from '../dev/fixtures/people.ts';
import { SEARCH_QUALIFIERS } from '../src/model/search.ts';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const json = JSON.stringify(cornerCaseNodes(NOW));

function valuesOf(key: string): string[] {
  return Array.from(json.matchAll(new RegExp('"' + key + '":"([^"]*)"', 'g')), (m) => m[1]);
}

test('corner cases use only the fictional cast', () => {
  const cast = new Set([...PEOPLE, ...BOTS]);
  assert.deepEqual([...new Set(valuesOf('login'))].filter((l) => !cast.has(l)), []);
  const teams = cornerCaseNodes(NOW).flatMap(({ node }) => (node.reviewRequests?.nodes || [])
    .map((request) => request?.requestedReviewer)
    .flatMap((reviewer) => (reviewer && reviewer.__typename === 'Team' ? [reviewer.name] : [])));
  assert.ok(teams.length > 0);
  assert.deepEqual(teams.filter((t) => !TEAMS.includes(t)), []);
});

test('corner case avatars come from the dev server, never from GitHub', () => {
  const avatars = valuesOf('avatarUrl');
  assert.ok(avatars.length > 0);
  assert.deepEqual(avatars.filter((url) => !url.startsWith(AVATAR_PATH)), []);
});

test('an avatar is the same SVG for the same login, with the initials', () => {
  assert.equal(avatarSvg('anna-dev'), avatarSvg('anna-dev'));
  assert.notEqual(avatarSvg('anna-dev'), avatarSvg('boris-k'));
  assert.match(avatarSvg('anna-dev'), /^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[\s\S]*>AD<\/text>/);
});

test('avatar text is escaped', () => {
  assert.doesNotMatch(avatarSvg('<x>&"'), /<x>/);
});

test('corner cases keep every case, each with a note and its own number', () => {
  const cases = cornerCaseNodes(NOW);
  assert.ok(cases.length >= 39, 'cases: ' + cases.length);
  assert.ok(cases.every((c) => c.note && c.note.length > 10));
  const numbers = cases.map((c) => c.node.number);
  assert.equal(new Set(numbers).size, numbers.length);
});

test('corner cases are sorted into short topic files', () => {
  const dir = new URL('../dev/fixtures/cases/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'kit.ts');
  assert.ok(files.length >= 6, files.join(', '));
  for (const file of files) {
    const lines = readFileSync(new URL(file, dir), 'utf8').split('\n').length;
    assert.ok(lines <= 120, file + ' has ' + lines + ' lines');
  }
});

test('search hints name only the fictional cast', () => {
  const hinted = Object.values(SEARCH_QUALIFIERS).flatMap((q) => Array.from(q.hint.matchAll(/(?:author|assignee|reviewer):([\w-]+)/g), (m) => m[1]));
  assert.ok(hinted.length >= 3);
  assert.deepEqual(hinted.filter((login) => login !== 'none' && !PEOPLE.includes(login)), []);
});
