import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, isBot } from '../src/model/rules.ts';
import { checkRepositoryList, parseRepositories, parseRepository, repositoryName } from '../src/repository.ts';

test('DATA-1: PR_BOARD_REPO names the repository as owner/name', () => {
  assert.deepEqual(parseRepository('acme/widgets'), { owner: 'acme', name: 'widgets' });
  assert.deepEqual(parseRepository('acme-labs/widgets.js'), { owner: 'acme-labs', name: 'widgets.js' });
  assert.equal(repositoryName(parseRepository('acme/widgets')), 'acme/widgets');
});

test('DATA-1: a missing or malformed PR_BOARD_REPO stops with the variable named', () => {
  // CI passes an unset repository variable as an empty string.
  for (const value of [undefined, '']) assert.throws(() => parseRepository(value), /PR_BOARD_REPO is not set/);
  for (const value of ['acme', 'acme/..', 'acme/.', 'acme/', '/widgets', 'acme/widgets/extra', 'acme/ widgets']) {
    assert.throws(() => parseRepository(value), /PR_BOARD_REPO must be "owner\/name"/, value);
  }
});

test('RULE-10: the official service account is a bot without extra logins', () => {
  assert.deepEqual(DEFAULT_RULES.extraBots, []);
  assert.equal(isBot({ login: 'netcrackerclplci', bot: false, avatarUrl: null }), true);
});

test('DATA-17: PR_BOARD_REPO lists repositories, ignoring spaces and repeats', () => {
  const names = (value: string) => parseRepositories(value).map(repositoryName);
  assert.deepEqual(names('acme/widgets'), ['acme/widgets']);
  assert.deepEqual(names(' acme/widgets, acme/gadgets ,ACME/Widgets,,'), ['acme/widgets', 'acme/gadgets']);
  const forty = Array.from({ length: 40 }, (_, i) => 'acme/r' + i).join(',');
  assert.equal(parseRepositories(forty).length, 40);
});

test('DATA-17: an empty list, a malformed entry, or more than 40 repositories stops with the variable named', () => {
  for (const value of [undefined, '', ' , ']) assert.throws(() => parseRepositories(value), /PR_BOARD_REPO is not set/);
  assert.throws(() => parseRepositories('acme/widgets, gadgets'), /PR_BOARD_REPO must be "owner\/name", such as acme\/widgets, not "gadgets"/);
  const tooMany = Array.from({ length: 41 }, (_, i) => 'acme/r' + i).join(',');
  assert.throws(() => parseRepositories(tooMany), /PR_BOARD_REPO lists 41 repositories; the board reads at most 40/);
});

test('SET-16: the Repositories field takes owner/name entries and names what is wrong', () => {
  assert.deepEqual(checkRepositoryList(''), { repos: [] });
  assert.deepEqual(checkRepositoryList('acme/widgets\n acme/gadgets, ACME/widgets'), { repos: ['acme/widgets', 'acme/gadgets'] });
  assert.deepEqual(checkRepositoryList('acme/widgets, gadgets'), { error: '"gadgets" is not owner/name, such as acme/widgets.' });
  assert.deepEqual(checkRepositoryList('acme/..'), { error: '"acme/.." is not owner/name, such as acme/widgets.' });
  const tooMany = Array.from({ length: 41 }, (_, i) => 'acme/r' + i).join(' ');
  assert.deepEqual(checkRepositoryList(tooMany), { error: 'The board reads at most 40 repositories; this list has 41.' });
});
