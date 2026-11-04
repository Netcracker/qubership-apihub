import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorGroup, authorsSummary, chosenAuthorGroups, collectAuthors, selectedAuthors, toggleAuthor } from '../../src/board/authors.ts';
import type { AuthorEntry } from '../../src/board/authors.ts';
import type { DerivedPullRequest } from '../../src/types.ts';

const pr = (authorKey: string, bot = false) =>
  ({ authorKey, author: authorKey === 'ghost' ? null : { login: authorKey, avatarUrl: null, bot }, bot }) as DerivedPullRequest;

const AUTHORS: AuthorEntry[] = [
  { login: 'anna-dev', actor: null, bot: false, count: 2 },
  { login: 'boris-k', actor: null, bot: false, count: 1 },
  { login: 'dependabot', actor: null, bot: true, count: 3 },
];

test('FILTER-3: authors are counted once each and sorted without regard to case', () => {
  // Plain string order would put "Boris-K" before "anna-dev".
  const authors = collectAuthors([pr('Boris-K'), pr('anna-dev'), pr('Boris-K'), pr('dependabot', true), pr('ghost')]);
  assert.deepEqual(authors.map((a) => [a.login, a.count, a.bot]), [['anna-dev', 1, false], ['Boris-K', 2, false], ['dependabot', 1, true], ['ghost', 1, false]]);
  assert.deepEqual(collectAuthors([]), []);
});

test('FILTER-3: named author categories combine and include new authors after a refresh', () => {
  const entries = collectAuthors([pr('NetcrackerCLPLCI'), pr('dependabot[bot]', true), pr('renovate[bot]', true), pr('anna-dev')]);
  assert.deepEqual(entries.map(authorGroup), ['humans', 'dependabot', 'service', 'other-bots']);
  assert.deepEqual([...selectedAuthors(null, entries)], ['anna-dev']);
  const mode = { groups: ['humans', 'service'] as const };
  const selected = selectedAuthors({ groups: [...mode.groups] }, [...entries, ...collectAuthors([pr('new-person')])]);
  assert.deepEqual([...selected], ['anna-dev', 'NetcrackerCLPLCI', 'new-person']);
  assert.deepEqual(chosenAuthorGroups(null), ['humans']);
  assert.equal(chosenAuthorGroups('all').length, 4);
  assert.equal(chosenAuthorGroups('bots').length, 3);
  assert.deepEqual(chosenAuthorGroups([]), []);
  assert.deepEqual(chosenAuthorGroups({ groups: ['service'] }), ['service']);
  assert.equal(authorsSummary({ groups: [] }, new Set()), 'Nobody');
  assert.equal(authorsSummary({ groups: ['service'] }, new Set()), 'NetcrackerCLPLCI');
});

test('FILTER-3: People leaves out bots, and Bots and Everyone pick their sets', () => {
  assert.deepEqual([...selectedAuthors(null, AUTHORS)], ['anna-dev', 'boris-k']);
  assert.deepEqual([...selectedAuthors('bots', AUTHORS)], ['dependabot']);
  assert.deepEqual([...selectedAuthors('all', AUTHORS)], ['anna-dev', 'boris-k', 'dependabot']);
  assert.deepEqual([...selectedAuthors([], AUTHORS)], []);
});

test('FILTER-4: a chosen author without PRs in the data is left out of the selection', () => {
  assert.deepEqual([...selectedAuthors(['boris-k', 'gone-person'], AUTHORS)], ['boris-k']);
});

test('FILTER-3: Me follows the current viewer and selects nobody until the viewer is known or when they have no PRs', () => {
  assert.deepEqual([...selectedAuthors('me', AUTHORS, 'BORIS-K')], ['boris-k']);
  assert.deepEqual([...selectedAuthors('me', AUTHORS, 'anna-dev')], ['anna-dev']);
  assert.deepEqual([...selectedAuthors('me', AUTHORS)], []);
  assert.deepEqual([...selectedAuthors('me', AUTHORS, 'no-open-prs')], []);
  assert.equal(authorsSummary('me', new Set()), 'Me');
  assert.deepEqual(chosenAuthorGroups('me'), []);
});

test('FILTER-3: the Authors button names the choice', () => {
  assert.equal(authorsSummary(null, new Set()), 'People');
  assert.equal(authorsSummary('all', new Set()), 'Everyone');
  assert.equal(authorsSummary('bots', new Set()), 'Bots');
  assert.equal(authorsSummary([], new Set()), 'Nobody');
  assert.equal(authorsSummary(['boris-k'], new Set(['boris-k'])), 'boris-k');
  assert.equal(authorsSummary(['anna-dev', 'boris-k'], new Set(['anna-dev', 'boris-k'])), '2 selected');
});

test('FILTER-4: checking or unchecking an author keeps a list, or becomes the preset it equals', () => {
  const people = new Set(['anna-dev', 'boris-k']);
  assert.deepEqual(toggleAuthor('boris-k', people, AUTHORS), ['anna-dev']);
  assert.equal(toggleAuthor('boris-k', new Set(['anna-dev']), AUTHORS), null);
  assert.equal(toggleAuthor('dependabot', people, AUTHORS), 'all');
  assert.equal(toggleAuthor('dependabot', new Set(), AUTHORS), 'bots');
  assert.deepEqual(toggleAuthor('anna-dev', new Set(['anna-dev']), AUTHORS), []);
});

test('FILTER-4: checking an author keeps chosen logins without open PRs, and clearing the last author means nobody', () => {
  // gone-person has no open PR now, but stays chosen in the address.
  assert.deepEqual(toggleAuthor('boris-k', new Set(['anna-dev']), AUTHORS, ['anna-dev', 'gone-person']), ['anna-dev', 'boris-k', 'gone-person']);
  assert.deepEqual(toggleAuthor('anna-dev', new Set(['anna-dev']), AUTHORS, ['anna-dev', 'gone-person']), ['gone-person']);
  // With only bots on the board, clearing the last one is Nobody, not the People preset.
  const onlyBots = [AUTHORS[2]];
  assert.deepEqual(toggleAuthor('dependabot', new Set(['dependabot']), onlyBots, 'bots'), []);
  // A login chosen in another case still counts as chosen.
  assert.deepEqual([...selectedAuthors(['Boris-K'], AUTHORS)], ['boris-k']);
});
