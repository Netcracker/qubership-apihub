import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkedGroups, checkedRepositories, groupColor, groupCounts, groupFilter, groupOptions, groupRepositories, groupsSelection, groupsSummary, groupsToText, parseGroupLines, repositoryColors, UNGROUPED,
} from '../../src/board/groups.ts';
import type { RepoGroup } from '../../src/board/groups.ts';

const GROUPS = [
  { name: 'Core', repos: ['acme/widgets', 'acme/gadgets'] },
  { name: 'Tools', repos: ['acme/gadgets', 'acme/tools'] },
];

test('SET-19: groups are lines of a name and repositories; blank lines are skipped and the text round-trips', () => {
  const parsed = parseGroupLines('Core: acme/widgets, acme/gadgets\n\n  Tools : acme/gadgets acme/tools, ACME/tools\n');
  assert.deepEqual(parsed, { groups: GROUPS });
  assert.deepEqual(parseGroupLines(groupsToText(GROUPS)), { groups: GROUPS });
  assert.deepEqual(parseGroupLines(''), { groups: [] });
});

test('SET-19: a wrong line is named with the reason', () => {
  assert.deepEqual(parseGroupLines('Core: acme/widgets\nacme/gadgets'),
    { error: 'Line 2: start with the group name and a colon, such as "Backend: acme/widgets".' });
  assert.deepEqual(parseGroupLines('Core: acme/widgets, gadgets'), { error: 'Line 1: "gadgets" is not owner/name, such as acme/widgets.' });
  assert.deepEqual(parseGroupLines('Core: acme/widgets\ncore: acme/tools'), { error: 'Line 2: the group "core" is already defined.' });
  assert.deepEqual(parseGroupLines('Empty:'), { error: 'Line 1: the group "Empty" lists no repositories.' });
  const many = Array.from({ length: 21 }, (_, i) => 'G' + i + ': acme/r' + i).join('\n');
  assert.deepEqual(parseGroupLines(many), { error: 'Up to 20 groups; this list has 21.' });
});

test('SET-19: a leading * marks a default group; a name with a comma, a semicolon, or named Ungrouped is refused', () => {
  const parsed = parseGroupLines('* Core: acme/widgets\nTools: acme/tools');
  assert.deepEqual(parsed, { groups: [{ name: 'Core', repos: ['acme/widgets'], isDefault: true }, { name: 'Tools', repos: ['acme/tools'] }] });
  assert.equal(groupsToText((parsed as { groups: RepoGroup[] }).groups), '*Core: acme/widgets\nTools: acme/tools');
  assert.deepEqual(parseGroupLines('Core, old: acme/widgets'), { error: 'Line 1: the group name "Core, old" has a comma, a semicolon, or a colon.' });
  assert.deepEqual(parseGroupLines('Core; old: acme/widgets'), { error: 'Line 1: the group name "Core; old" has a comma, a semicolon, or a colon.' });
  assert.deepEqual(parseGroupLines('ungrouped: acme/widgets'),
    { error: 'Line 1: "Ungrouped" names the repositories in no group; choose another name.' });
  assert.deepEqual(parseGroupLines('**Core: acme/widgets'),
    { error: 'Line 1: the group name "*Core" starts with *; one * before the name marks a default group.' });
});

const DATA = ['acme/widgets', 'acme/gadgets', 'acme/tools', 'acme/misc'];

test('FILTER-17: the menu lists every group, and Ungrouped when the data has a repository in no group', () => {
  assert.deepEqual(groupOptions(GROUPS, DATA), ['Core', 'Tools', UNGROUPED]);
  assert.deepEqual(groupOptions(GROUPS, ['ACME/Widgets', 'acme/tools']), ['Core', 'Tools']);
});

test('FILTER-17: without groups in the address the default ones are checked, or all when none is marked', () => {
  const options = groupOptions(GROUPS, DATA);
  assert.deepEqual(checkedGroups(null, GROUPS, options), options);
  const marked = [{ ...GROUPS[0], isDefault: true }, GROUPS[1]];
  assert.deepEqual(checkedGroups(null, marked, options), ['Core']);
  // Names are matched without regard to case and come back in menu order; unknown ones are dropped.
  assert.deepEqual(checkedGroups(['ungrouped', 'tools', 'Gone'], marked, options), ['Tools', UNGROUPED]);
  // A link that names only unknown groups falls back to the default; an empty one checks nothing.
  assert.deepEqual(checkedGroups(['Gone'], marked, options), ['Core']);
  assert.deepEqual(checkedGroups([], marked, options), []);
});

test('FILTER-17: the address keeps the checked groups only when they differ from the default', () => {
  const marked = [{ ...GROUPS[0], isDefault: true }, GROUPS[1]];
  const options = groupOptions(marked, DATA);
  assert.equal(groupsSelection(['Core'], marked, options), null);
  assert.deepEqual(groupsSelection([UNGROUPED, 'Core'], marked, options), ['Core', UNGROUPED]);
  assert.deepEqual(groupsSelection([], marked, options), []);
  assert.equal(groupsSelection(options, GROUPS, options), null, 'all checked is the default without marks');
});

test('FILTER-17: rows show when their repository is in a checked group, or in none while Ungrouped is checked', () => {
  const core = groupFilter(GROUPS, ['Core']);
  assert.deepEqual(DATA.filter(core), ['acme/widgets', 'acme/gadgets']);
  assert.equal(core('ACME/Widgets'), true);
  assert.deepEqual(DATA.filter(groupFilter(GROUPS, [UNGROUPED])), ['acme/misc']);
  assert.deepEqual(DATA.filter(groupFilter(GROUPS, [])), []);
  // A repository in two groups counts in both.
  const prRepos = ['acme/gadgets', 'acme/gadgets', 'acme/widgets', 'acme/misc'];
  const counts = groupCounts(GROUPS, groupOptions(GROUPS, DATA), DATA, prRepos);
  assert.deepEqual([...counts], [['Core', 3], ['Tools', 2], [UNGROUPED, 1]]);
  // A group with no repository in the data is not loaded, so it has no count.
  const late = { name: 'Late', repos: ['acme/later'] };
  assert.equal(groupCounts([...GROUPS, late], [...groupOptions(GROUPS, DATA), 'Late'], DATA, prRepos).has('Late'), false);
});

test('FILTER-17: the button names all, none, up to two groups, or how many', () => {
  const options = ['A', 'B', 'C', UNGROUPED];
  assert.equal(groupsSummary(options, options), 'All');
  assert.equal(groupsSummary([], options), 'None');
  assert.equal(groupsSummary(['A', UNGROUPED], options), 'A, Ungrouped');
  assert.equal(groupsSummary(['A', 'B', 'C'], options), '3 selected');
});

test('DATA-18: the board loads every repository of the groups once, in the order the groups list them', () => {
  assert.deepEqual(groupRepositories([...GROUPS, { name: 'More', repos: ['ACME/widgets', 'acme/misc'] }]),
    ['acme/widgets', 'acme/gadgets', 'acme/tools', 'acme/misc']);
  assert.deepEqual(groupRepositories([]), []);
});

test('DATA-18: the checked entries load their groups, and Ungrouped loads the repositories of the data in no group', () => {
  assert.deepEqual(checkedRepositories(GROUPS, ['Tools'], DATA), ['acme/gadgets', 'acme/tools']);
  assert.deepEqual(checkedRepositories(GROUPS, ['Core', UNGROUPED], DATA), ['acme/widgets', 'acme/gadgets', 'acme/misc']);
  assert.deepEqual(checkedRepositories(GROUPS, [UNGROUPED], []), [], 'nothing loaded, nothing known to be ungrouped');
  assert.deepEqual(checkedRepositories(GROUPS, [], DATA), []);
});

test('TABLE-31: groups take the six tints in turn, and a repository the tint of the first group that lists it', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ name: 'G' + i, repos: ['acme/r' + i] }));
  assert.deepEqual(many.map((group) => groupColor(many, group.name)), [0, 1, 2, 3, 4, 5, 0, 1]);
  assert.equal(groupColor(many, UNGROUPED), null);
  const colors = repositoryColors(GROUPS);
  assert.equal(colors.get('acme/widgets'), 0);
  assert.equal(colors.get('acme/gadgets'), 0, 'in Core and Tools, Core comes first');
  assert.equal(colors.get('acme/tools'), 1);
  assert.equal(colors.has('acme/misc'), false);
});
