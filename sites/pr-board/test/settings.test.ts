import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasOf, parseAreaCriteria } from '../src/model/areas.ts';
import { attentionReasons, DEFAULT_RULES, isBot } from '../src/model/rules.ts';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, rulesAreDefault, saveSettings } from '../src/settings.ts';
import type { PullRequest } from '../src/types.ts';

test('SET-11: missing or invalid stored settings fall back to the defaults', () => {
  for (const stored of [null, 'text', 42, [], {}, { rules: 'x', theme: 'neon', density: 1, hiddenColumns: 'title' }]) {
    assert.deepEqual(parseSettings(stored), DEFAULT_SETTINGS, JSON.stringify(stored));
  }
});

test('DATA-28 SET-11: build groups fill missing or corrupt preferences, while saved groups and empty lists survive', () => {
  const groups = [{ name: 'Core', repos: ['acme/widgets'], isDefault: true }];
  for (const stored of [null, { theme: 'dark' }, { repoGroups: 'corrupt' }, { repoGroups: null }]) {
    assert.deepEqual(parseSettings(stored, groups).repoGroups, groups);
  }
  assert.deepEqual(parseSettings({ repoGroups: [] }, groups).repoGroups, []);
  const saved = [{ name: 'Tools', repos: ['acme/tools'] }];
  assert.deepEqual(parseSettings({ repoGroups: saved }, groups).repoGroups, saved);
  const data = useStorage();
  assert.deepEqual(loadSettings(groups).repoGroups, groups);
  data.set('apihub-pr-board.settings', '{broken');
  assert.deepEqual(loadSettings(groups).repoGroups, groups);
  useStorage(true);
  assert.deepEqual(loadSettings(groups).repoGroups, groups);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test('DATA-28 SET-10: build-default bot accounts do not mark the attention rules as customized', () => {
  const rules = { ...DEFAULT_RULES, extraBots: ['DEPLOY-bot', 'ci-bot'] };
  assert.equal(rulesAreDefault(rules, ['ci-bot', 'deploy-bot']), true);
  assert.equal(rulesAreDefault({ ...rules, checkTitle: false }, ['ci-bot', 'deploy-bot']), false);
  assert.equal(rulesAreDefault({ ...rules, extraBots: [] }, ['ci-bot', 'deploy-bot']), false);
});

test('SET-11: valid stored settings survive, and bad fields are replaced one by one', () => {
  const settings = parseSettings({
    rules: { staleDays: 3, checkTitle: false, requireIssue: 'no', extraBots: ['ci-user', 7, 'ci-user'], areaModules: { be: ['backend'], fe: 'ui' } },
    theme: 'dark',
    density: 'compact',
    hiddenColumns: ['assignee', 3],
  });
  assert.equal(settings.rules.staleDays, 3);
  assert.equal(settings.rules.checkTitle, false);
  assert.equal(settings.rules.requireIssue, true);
  assert.deepEqual(settings.rules.extraBots, ['ci-user']);
  assert.deepEqual(settings.rules.areaCriteria.be.labels, ['backend']);
  assert.deepEqual(settings.rules.areaCriteria.fe, DEFAULT_RULES.areaCriteria.fe);
  assert.deepEqual([settings.theme, settings.density, settings.hiddenColumns], ['dark', 'compact', ['assignee']]);
  assert.equal(rulesAreDefault(settings.rules), false);
});

test('SET-2: stale limits outside 1–365 or fractional are rejected', () => {
  for (const staleDays of [0, 366, 2.5, '5']) {
    assert.equal(parseSettings({ rules: { staleDays } }).rules.staleDays, DEFAULT_RULES.staleDays, String(staleDays));
  }
});

const pr = (fields: Record<string, unknown>) =>
  ({ title: 'feat: x', labels: [], issues: [], projects: [], ...fields }) as unknown as PullRequest;

test('RULE-9: turned-off rules raise no attention', () => {
  const rules = { ...DEFAULT_RULES, checkTitle: false, requireIssue: false, staleDays: 30 };
  assert.deepEqual(attentionReasons(pr({ title: 'WIP' }), 20, rules), []);
  assert.equal(attentionReasons(pr({ title: 'WIP' }), 20).length, 3);
});

test('RULE-10: extra bot logins match case-insensitively', () => {
  assert.equal(isBot({ login: 'CI-User', avatarUrl: null, bot: false }, ['ci-user']), true);
  assert.equal(isBot({ login: 'acme-release-bot', avatarUrl: null, bot: false }, []), false);
});

test('RULE-11: area lists match plain labels, module: labels, and title scopes', () => {
  const modules = parseAreaCriteria({ be: { labels: ['backend', 'module:portal-backend'], scopes: ['backend', 'module:portal-backend'] },
    fe: { labels: ['ui'], scopes: ['ui'] } });
  assert.deepEqual(areasOf(pr({ labels: [{ name: 'Backend' }] }), modules), ['be']);
  assert.deepEqual(areasOf(pr({ labels: [{ name: 'module:portal-backend' }] }), modules), ['be']);
  assert.deepEqual(areasOf(pr({ labels: [{ name: 'module:ui' }] }), modules), ['fe']);
  assert.deepEqual(areasOf(pr({ title: 'fix(ui): x' }), modules), ['fe']);
  assert.deepEqual(areasOf(pr({ labels: [{ name: 'module:agent' }] }), modules), []);
});

// A Map-backed localStorage, or one that throws like a browser with storage blocked.
function useStorage(blocked = false) {
  const data = new Map<string, string>();
  const fail = () => { throw new Error('storage is blocked'); };
  Object.assign(globalThis, {
    localStorage: { getItem: blocked ? fail : (key: string) => data.get(key) ?? null, setItem: blocked ? fail : (key: string, value: string) => { data.set(key, value); } },
  });
  return data;
}

test('SET-11: settings survive a reload through localStorage, and an unreadable entry gives the defaults', () => {
  const data = useStorage();
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  const changed = { ...DEFAULT_SETTINGS, theme: 'dark' as const, hiddenColumns: ['ci'] };
  saveSettings(changed);
  assert.deepEqual(loadSettings(), changed);
  data.set('apihub-pr-board.settings', '{broken');
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test('SET-11: blocked storage gives the defaults and never throws', () => {
  useStorage(true);
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  assert.doesNotThrow(() => saveSettings(DEFAULT_SETTINGS));
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test('SET-10: only the attention rules count as custom; the area lists do not change the Attention count', () => {
  assert.equal(rulesAreDefault(DEFAULT_SETTINGS.rules), true);
  const areas = { ...DEFAULT_SETTINGS.rules, areaModules: { be: ['backend'], fe: ['ui'] } };
  assert.equal(rulesAreDefault(areas), true);
  for (const changed of [{ staleDays: 3 }, { checkTitle: false }, { requireIssue: false }, { extraBots: ['ci-bot'] }]) {
    assert.equal(rulesAreDefault({ ...DEFAULT_SETTINGS.rules, ...changed }), false, JSON.stringify(changed));
  }
});

test('SET-19: stored groups are checked; a broken group is dropped and the rest load', () => {
  const settings = parseSettings({ repoGroups: [
    { name: ' Core ', repos: ['acme/widgets', '../x', 'ACME/widgets'] },
    { name: '', repos: ['acme/gadgets'] },
    { name: 'Empty', repos: ['nope'] },
    'x',
  ] });
  assert.deepEqual(settings.repoGroups, [{ name: 'Core', repos: ['acme/widgets'] }]);
  assert.deepEqual(parseSettings({}).repoGroups, DEFAULT_SETTINGS.repoGroups);
  const marked = parseSettings({ repoGroups: [
    { name: 'Core', repos: ['acme/widgets'], isDefault: true },
    { name: 'Tools', repos: ['acme/tools'], isDefault: 'yes' },
    { name: 'A, B', repos: ['acme/a'] },
    { name: 'Ungrouped', repos: ['acme/b'] },
    { name: '*Star', repos: ['acme/c'] },
  ] });
  assert.deepEqual(marked.repoGroups, [{ name: 'Core', repos: ['acme/widgets'], isDefault: true }, { name: 'Tools', repos: ['acme/tools'] }]);
});

test('SET-8 SET-11: saved column ids no column has any more are dropped, so they never come back into the address', () => {
  assert.deepEqual(parseSettings({ hiddenColumns: ['standup', 'ci', 'ci', 7] }).hiddenColumns, ['ci']);
});

test('SET-19: stored groups with the same name keep the first, and each holds up to 40 repositories', () => {
  const repos = Array.from({ length: 45 }, (_, i) => 'acme/r' + i);
  const settings = parseSettings({ repoGroups: [{ name: 'Core', repos }, { name: 'core', repos: ['acme/x'] }] });
  assert.deepEqual(settings.repoGroups.map((g) => [g.name, g.repos.length]), [['Core', 40]]);
});

test('SET-22: live loads repeat every 2, 5, 10, or 30 minutes or never, and anything else falls back to 5', () => {
  assert.equal(DEFAULT_SETTINGS.refreshMinutes, 5);
  assert.equal(parseSettings({ refreshMinutes: 30 }).refreshMinutes, 30);
  assert.equal(parseSettings({ refreshMinutes: 0 }).refreshMinutes, 0);
  for (const value of [1, 7, '10', null, -5]) assert.equal(parseSettings({ refreshMinutes: value }).refreshMinutes, 5, String(value));
});

test('SET-20: the Review column is a code or a list of reviewers, and anything else falls back to the code', () => {
  assert.equal(parseSettings({ reviewColumn: 'list' }).reviewColumn, 'list');
  assert.equal(parseSettings({ reviewColumn: 'people' }).reviewColumn, 'code');
  assert.equal(DEFAULT_SETTINGS.reviewColumn, 'code');
});

test('SET-23: labels show by default, and anything stored but true or false falls back to showing them', () => {
  assert.equal(DEFAULT_SETTINGS.showLabels, true);
  assert.equal(parseSettings({ showLabels: false }).showLabels, false);
  assert.equal(parseSettings({ showLabels: 'no' }).showLabels, true);
});

test('SET-25: the reviewer order defaults to requested changes first, and a stored one is completed', () => {
  assert.deepEqual(DEFAULT_SETTINGS.reviewerOrder, ['changes', 'waiting', 'commented', 'dismissed', 'approved']);
  assert.deepEqual(parseSettings({ reviewerOrder: ['approved'] }).reviewerOrder, ['approved', 'changes', 'waiting', 'commented', 'dismissed']);
  assert.deepEqual(parseSettings({ reviewerOrder: 'approved' }).reviewerOrder, DEFAULT_SETTINGS.reviewerOrder);
});
