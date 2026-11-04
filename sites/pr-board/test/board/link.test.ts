import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLinkColumns, applyLinkOrder, cleanBots, groupsToSave, linkSettingsQuery, MAX_BOTS, linkWithGroups, moveStoredBots, parseLinkSettings, withDefaultBots,
} from '../../src/board/link.ts';
import { DEFAULT_SETTINGS } from '../../src/settings.ts';
import { OFFICIAL_REPO_GROUPS } from '../../src/defaults.ts';
import { DEFAULT_AREA_CRITERIA, parseAreaCriteria } from '../../src/model/areas.ts';

test('FILTER-14: repos and bots come from the address, and invalid entries are dropped', () => {
  assert.deepEqual(parseLinkSettings(''), { repos: [], bots: [], hidden: undefined });
  assert.deepEqual(parseLinkSettings('?repos=acme/widgets,../x,ACME/Widgets,,acme/gadgets,gadgets&bots=ci-bot,,release-bot,ci-bot'), {
    repos: ['acme/widgets', 'acme/gadgets'],
    bots: ['ci-bot', 'release-bot'],
    hidden: undefined,
  });
  const tooMany = Array.from({ length: 41 }, (_, i) => 'acme/r' + i).join(',');
  assert.equal(parseLinkSettings('?repos=' + tooMany).repos.length, 40);
});

test('SET-6 FILTER-14: official defaults keep a clean URL, customized criteria override saved defaults', () => {
  assert.equal(linkSettingsQuery({ repos: [], bots: [], groups: OFFICIAL_REPO_GROUPS, criteria: DEFAULT_AREA_CRITERIA }), '');
  const criteria = parseAreaCriteria({ be: { labels: [], repositories: ['acme/tools'] }, fe: { tags: [] } });
  const encoded = linkSettingsQuery({ repos: [], bots: [], criteria });
  assert.deepEqual(parseLinkSettings('?' + encoded).criteria, criteria);
  assert.equal(parseLinkSettings('?criteria=%7Bbroken').criteria, undefined);
  assert.equal(parseLinkSettings('?criteria=[]').criteria, undefined);
  assert.equal(parseLinkSettings('?criteria=' + 'x'.repeat(30001)).criteria, undefined);
});

test('FILTER-14: bots in the address must be GitHub logins, and their number is capped', () => {
  const bots = parseLinkSettings('?bots=' + encodeURIComponent('ci-bot renovate[bot] -lead trail- a--b <x> ' + 'x'.repeat(40))).bots;
  assert.deepEqual(bots, ['ci-bot', 'renovate[bot]', 'a--b']);
  assert.deepEqual(cleanBots(['ci-bot', 'bad login', 'ok', 'CI-Bot']), ['ci-bot', 'ok']);
  const many = Array.from({ length: 60 }, (_, i) => 'bot-' + i).join(',');
  assert.equal(parseLinkSettings('?bots=' + many).bots.length, MAX_BOTS);
});

test('FILTER-14: the address keeps repos and bots readable, leaves them out when empty, and survives the round trip', () => {
  assert.equal(linkSettingsQuery({ repos: [], bots: [] }), '');
  assert.equal(linkSettingsQuery({ repos: [], bots: [], hidden: [] }), '');
  const link = { repos: ['acme/widgets', 'acme/gadgets'], bots: ['ci-bot', 'odd login&x'] };
  assert.equal(linkSettingsQuery(link), 'repos=acme/widgets,acme/gadgets&bots=ci-bot,odd%20login%26x');
  assert.deepEqual(parseLinkSettings('?' + linkSettingsQuery(link)), { repos: link.repos, bots: ['ci-bot', 'odd'], hidden: undefined });
  const forty = Array.from({ length: 40 }, (_, i) => 'acme-labs/repository-number-' + i);
  assert.ok(linkSettingsQuery({ repos: forty, bots: [] }).length < 1600, 'forty repositories still make a usable link');
});

test('SET-17: extra bots saved in this browser move into the address once', () => {
  const stored = { ...DEFAULT_SETTINGS, rules: { ...DEFAULT_SETTINGS.rules, extraBots: ['acme-release-bot'] } };
  const moved = moveStoredBots(stored, { repos: ['acme/widgets'], bots: [] });
  assert.deepEqual(moved.link, { repos: ['acme/widgets'], bots: ['acme-release-bot'] });
  assert.deepEqual(moved.settings.rules.extraBots, []);
  assert.equal(moved.moved, true);
  const linkWins = moveStoredBots(stored, { repos: [], bots: ['ci-bot'] });
  assert.deepEqual(linkWins.link.bots, ['ci-bot'], 'a link with bots keeps its own');
  assert.deepEqual(linkWins.settings.rules.extraBots, []);
  const nothing = moveStoredBots(DEFAULT_SETTINGS, { repos: [], bots: [] });
  assert.equal(nothing.moved, false);
  assert.equal(nothing.settings, DEFAULT_SETTINGS);
});

test('DATA-28 FILTER-14 SET-17: URL bots, including none, take precedence over legacy preferences and build defaults', () => {
  const defaults = ['ci-bot', 'deploy-bot'];
  const absent = parseLinkSettings('');
  const inherited = withDefaultBots(absent, defaults);
  assert.deepEqual(inherited.bots, defaults);
  assert.equal(linkSettingsQuery(inherited, OFFICIAL_REPO_GROUPS, ['DEPLOY-bot', 'CI-bot']), '');
  const none = withDefaultBots(parseLinkSettings('?bots='), defaults, true);
  assert.deepEqual(none.bots, []);
  assert.equal(linkSettingsQuery(none, OFFICIAL_REPO_GROUPS, defaults), 'bots=');
  assert.deepEqual(withDefaultBots(parseLinkSettings('?bots=other'), defaults).bots, ['other']);
  assert.equal(withDefaultBots(absent, []), absent);
  const stored = { ...DEFAULT_SETTINGS, rules: { ...DEFAULT_SETTINGS.rules, extraBots: ['old-bot'] } };
  const migrated = moveStoredBots(stored, absent);
  assert.deepEqual(withDefaultBots(migrated.link, defaults, migrated.moved).bots, ['old-bot']);
  const cleared = moveStoredBots(stored, none, true);
  assert.deepEqual(cleared.settings.rules.extraBots, []);
  assert.deepEqual(withDefaultBots(cleared.link, defaults, true).bots, []);
});

test('FILTER-14 SET-8: legacy hidden-column links are accepted, and appearance is omitted from new links', () => {
  assert.deepEqual(parseLinkSettings('?hide=ci,nope,assignee,ci').hidden, ['ci', 'assignee']);
  assert.deepEqual(parseLinkSettings('?hide=').hidden, [], 'an empty list shows every column');
  assert.equal(parseLinkSettings('?q=x').hidden, undefined);
  assert.equal(linkSettingsQuery({ repos: ['acme/widgets'], bots: [], hidden: ['ci', 'assignee'] }), 'repos=acme/widgets');
});

test('SET-8 SET-17: a link with hidden columns wins and is kept; without one, the saved columns go into the address', () => {
  const stored = { ...DEFAULT_SETTINGS, hiddenColumns: ['ci'] };
  const fromLink = applyLinkColumns(stored, { repos: [], bots: [], hidden: ['assignee'] });
  assert.deepEqual(fromLink.settings.hiddenColumns, ['assignee']);
  assert.deepEqual(fromLink.link.hidden, ['assignee']);
  assert.equal(fromLink.changed, true);
  const fromStorage = applyLinkColumns(stored, { repos: [], bots: [] });
  assert.equal(fromStorage.settings, stored);
  assert.deepEqual(fromStorage.link.hidden, ['ci']);
  assert.equal(fromStorage.changed, false);
});

const GROUPS = [
  { name: 'Monorepo & Co', repos: ['acme/widgets', 'acme/tools'], isDefault: true },
  { name: 'Old', repos: ['acme/gadgets'] },
];

test('FILTER-14 SET-19: repository groups travel in the address, readable, and a broken list is ignored', () => {
  const query = linkSettingsQuery({ repos: [], bots: [], groups: GROUPS });
  assert.equal(query, 'repogroups=*Monorepo%20%26%20Co:acme/widgets,acme/tools;Old:acme/gadgets');
  assert.deepEqual(parseLinkSettings('?' + query).groups, GROUPS);
  assert.equal(parseLinkSettings('?q=x').groups, undefined);
  assert.equal(parseLinkSettings('?repogroups=Old:gadgets').groups, undefined, 'an entry that is not owner/name');
  assert.deepEqual(parseLinkSettings('?repogroups=').groups, [], 'an empty list disables groups');
  assert.equal(linkSettingsQuery({ repos: [], bots: [], groups: [] }), 'repogroups=');
});

test('SET-19: a link with groups shows them without saving; without one, the saved groups go into the address', () => {
  const saved = [GROUPS[1]];
  assert.deepEqual(linkWithGroups({ repos: [], bots: [], groups: GROUPS }, saved).groups, GROUPS);
  assert.deepEqual(linkWithGroups({ repos: [], bots: [] }, saved).groups, saved);
  // Another setting changes: the saved groups stay, not the link's.
  assert.deepEqual(groupsToSave(GROUPS, GROUPS, saved), saved);
  // The viewer edits the groups: the edit is saved.
  assert.deepEqual(groupsToSave([GROUPS[0]], GROUPS, saved), [GROUPS[0]]);
  assert.deepEqual(groupsToSave([...GROUPS], GROUPS, saved), GROUPS, 'an explicit reset saves defaults even when a shared link already shows them');
});

test('FILTER-14 SET-17: a hide list of only unknown ids keeps the saved columns, and bots moved from storage are cleaned', () => {
  assert.equal(parseLinkSettings('?hide=bogus,standup').hidden, undefined);
  assert.deepEqual(parseLinkSettings('?hide=').hidden, []);
  const stored = { ...DEFAULT_SETTINGS, rules: { ...DEFAULT_SETTINGS.rules, extraBots: ['ci-bot', 'CI-Bot', 'not a login', 'release_bot'] } };
  assert.deepEqual(moveStoredBots(stored, { repos: [], bots: [] }).link.bots, ['ci-bot']);
});

test('FILTER-14 SET-24: legacy column order is accepted, a link with it wins, and new links omit it', () => {
  const order = parseLinkSettings('?cols=author,title,bogus').order!;
  assert.deepEqual(order.slice(0, 2), ['author', 'title']);
  assert.equal(parseLinkSettings('?cols=bogus').order, undefined);
  assert.equal(parseLinkSettings('?q=x').order, undefined);
  assert.equal(linkSettingsQuery({ repos: [], bots: [], order }), '', 'appearance stays in browser preferences');
  const stored = { ...DEFAULT_SETTINGS, columnOrder: ['ci'] };
  assert.deepEqual(applyLinkOrder(stored, { repos: [], bots: [], order }).settings.columnOrder, order);
  assert.deepEqual(applyLinkOrder(stored, { repos: [], bots: [] }).link.order, ['ci']);
});
