import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardRepos, emptyTableKind, loadTargets, missingReposMessage, planRepositories } from '../../src/board/repositories.ts';
import type { RepositoryInput } from '../../src/board/repositories.ts';

test('FILTER-14 DATA-22: requested repositories narrow the board, and the ones the data lacks are missing', () => {
  const data = ['acme/widgets', 'acme/gadgets'];
  assert.deepEqual(boardRepos(data, []), { shown: data, missing: [] });
  assert.deepEqual(boardRepos(data, ['ACME/Gadgets']), { shown: ['acme/gadgets'], missing: [] });
  assert.deepEqual(boardRepos(data, ['acme/gizmos', 'acme/widgets']), { shown: ['acme/widgets'], missing: ['acme/gizmos'] });
});

test('DATA-22 DATA-23: the banner names the missing repositories and says how to load them', () => {
  assert.equal(missingReposMessage(['acme/gizmos'], true, 'snapshot'), 'acme/gizmos is not in the snapshot. Refresh loads it.');
  assert.equal(missingReposMessage(['acme/gizmos', 'acme/tools'], false, 'snapshot'),
    'acme/gizmos, acme/tools are not in the snapshot. Add a GitHub token in Settings, then Refresh loads them.');
  assert.equal(missingReposMessage(['acme/gizmos'], true, 'live'), 'acme/gizmos is not in the live data. Refresh loads it.');
  assert.equal(missingReposMessage(['acme/gizmos'], false, 'none'),
    'acme/gizmos is not loaded yet. Add a GitHub token in Settings, then Refresh loads it.');
});

const input = (fields: Partial<RepositoryInput>): RepositoryInput => ({
  dataRepos: ['acme/widgets', 'acme/gadgets'], linkRepos: [], groups: [], viewGroups: null, notLoaded: false, ...fields,
});

test('DATA-18 FILTER-17: without repos, the checked groups decide what loads, and Ungrouped adds the data in no group', () => {
  const groups = [{ name: 'Core', repos: ['acme/widgets'] }, { name: 'Tools', repos: ['acme/tools'], isDefault: true }];
  const plan = planRepositories(input({ groups }));
  assert.deepEqual(plan.checked, ['Tools']);
  assert.deepEqual(plan.wanted, ['acme/tools']);
  assert.deepEqual(plan.pending, ['acme/tools'], 'the data lacks the checked group');
  assert.deepEqual(planRepositories(input({ groups, viewGroups: ['Core', 'Ungrouped'] })).wanted, ['acme/widgets', 'acme/gadgets']);
  // repos in the address win over the groups.
  assert.deepEqual(planRepositories(input({ groups, linkRepos: ['acme/gizmos'] })).wanted, ['acme/gizmos']);
  const none = planRepositories(input({ groups, viewGroups: [] }));
  assert.equal(none.nothingChecked, true);
  assert.equal(planRepositories(input({})).nothingChecked, false, 'without groups nothing needs checking');
});

test('DATA-23 TABLE-27: before the first load the header names what will load, and the data names it after', () => {
  const groups = [{ name: 'Tools', repos: ['acme/tools'] }];
  assert.deepEqual(planRepositories(input({ groups, notLoaded: true, dataRepos: [] })).headerRepos, ['acme/tools']);
  assert.deepEqual(planRepositories(input({})).headerRepos, ['acme/widgets', 'acme/gadgets']);
  assert.deepEqual(planRepositories(input({ linkRepos: ['acme/gizmos'] })).headerRepos, ['acme/gizmos']);
});

test('DATA-18: Refresh reads the wanted repositories, or the data, or the build, and says why it cannot start', () => {
  const plan = planRepositories(input({}));
  assert.deepEqual(loadTargets(plan, ['acme/widgets'], ['acme/build']), { names: ['acme/widgets'] });
  assert.deepEqual(loadTargets(plan, [], ['acme/build']), { names: ['acme/build'] });
  assert.deepEqual(loadTargets(plan, [], []), { problem: 'Choose the repositories to show in Settings first.' });
  const nothing = planRepositories(input({ groups: [{ name: 'Core', repos: ['acme/widgets'] }], viewGroups: [] }));
  assert.deepEqual(loadTargets(nothing, ['acme/widgets'], []), { problem: 'Check a repository group in the Repositories menu first.' });
  const many = Array.from({ length: 41 }, (_, i) => 'acme/r' + i);
  assert.match((loadTargets(planRepositories(input({ linkRepos: many })), [], []) as { problem: string }).problem, /41 repositories; the board reads at most 40/);
});

test('TABLE-19 TABLE-20 DATA-23: the empty table says what is missing', () => {
  const plan = (wanted: string[], nothingChecked = false) => ({ wanted, nothingChecked });
  assert.equal(emptyTableKind({ loading: true, notLoaded: true, failed: false, plan: plan([]) }), 'loading');
  assert.equal(emptyTableKind({ loading: false, notLoaded: true, failed: false, plan: plan(['acme/widgets']) }), 'not-loaded');
  assert.equal(emptyTableKind({ loading: false, notLoaded: true, failed: false, plan: plan([], true) }), 'no-groups');
  assert.equal(emptyTableKind({ loading: false, notLoaded: true, failed: false, plan: plan([]) }), 'no-repos');
  assert.equal(emptyTableKind({ loading: false, notLoaded: false, failed: true, plan: plan([]) }), 'not-loaded');
  assert.equal(emptyTableKind({ loading: false, notLoaded: false, failed: false, plan: plan([]) }), 'no-match');
});
