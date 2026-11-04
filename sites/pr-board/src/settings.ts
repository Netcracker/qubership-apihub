// Personal settings, kept in this browser's localStorage. Stored values are untrusted: anything missing or invalid
// falls back to the default, so an old or hand-edited entry never breaks the page.

import { groupNameError, MAX_GROUPS } from './board/groups.ts';
import type { RepoGroup } from './board/groups.ts';
import { completeReviewerOrder, DEFAULT_REVIEWER_ORDER } from './board/reviewers.ts';
import type { ReviewerGroup } from './board/reviewers.ts';
import { AREAS, parseAreaCriteria } from './model/areas.ts';
import { OFFICIAL_REPO_GROUPS } from './defaults.ts';
import { COLUMNS, orderToKeep } from './board/columns.ts';
import { isRepositoryName, MAX_REPOSITORIES } from './repository.ts';
import { parseList, uniqueNames } from './names.ts';
import { DEFAULT_RULES } from './model/rules.ts';
import type { Rules } from './model/rules.ts';
import { cleanBots } from './board/bots.ts';

export type Theme = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type ReviewColumn = 'code' | 'list';

// Minutes between live loads (SET-22); 0 turns them off.
export type RefreshMinutes = 0 | 2 | 5 | 10 | 30;

export interface Settings {
  rules: Rules;
  theme: Theme;
  density: Density;
  // The Review column as a code or as GitHub's Reviewers list (SET-20).
  reviewColumn: ReviewColumn;
  // The order of the reviewer groups in the Reviewers list (SET-25).
  reviewerOrder: ReviewerGroup[];
  refreshMinutes: RefreshMinutes;
  // Labels of the PR and its linked issues show in the table (SET-23); search finds them either way.
  showLabels: boolean;
  // Ids of columns the viewer turned off.
  hiddenColumns: string[];
  // Every column id in the viewer's order, or empty for the default order (SET-24).
  columnOrder: string[];
  // Named lists of repositories for the Repositories menu (SET-19).
  repoGroups: RepoGroup[];
}

export const DEFAULT_SETTINGS: Settings = { rules: DEFAULT_RULES, theme: 'system', density: 'comfortable', reviewColumn: 'code', reviewerOrder: DEFAULT_REVIEWER_ORDER, refreshMinutes: 5, showLabels: true, hiddenColumns: [], columnOrder: [], repoGroups: OFFICIAL_REPO_GROUPS };
export const MIN_STALE_DAYS = 1;
export const MAX_STALE_DAYS = 365;
export const THEMES: [Theme, string][] = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];
export const DENSITIES: [Density, string][] = [['comfortable', 'Comfortable'], ['compact', 'Compact']];
export const REVIEW_COLUMNS: [ReviewColumn, string][] = [['code', 'Code'], ['list', 'Reviewers']];
export const LABEL_CHOICES: [boolean, string][] = [[true, 'Show'], [false, 'Hide']];
export const REFRESH_INTERVALS: [RefreshMinutes, string][] = [[0, 'Off'], [2, '2 min'], [5, '5 min'], [10, '10 min'], [30, '30 min']];

const SETTINGS_KEY = 'apihub-pr-board.settings';

export function isValidStaleDays(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_STALE_DAYS && (value as number) <= MAX_STALE_DAYS;
}

// Splits a comma- or space-separated list of logins or labels.
function pick<T extends string | number>(value: unknown, options: [T, string][], fallback: T): T {
  const option = options.find(([id]) => id === value);
  return option ? option[0] : fallback;
}

function migrateAreaModules(value: unknown) {
  const stored = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const areas: Record<string, unknown> = {};
  for (const area of AREAS) {
    const list = stored[area.id];
    if (Array.isArray(list)) areas[area.id] = { labels: list, scopes: list };
  }
  return areas;
}

// Stored groups are checked like the field checks them; a broken group is dropped and the rest load.
function parseGroups(value: unknown): RepoGroup[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  return value.flatMap((entry): RepoGroup[] => {
    const group = entry as Partial<RepoGroup> | null;
    if (!group || typeof group !== 'object' || typeof group.name !== 'string' || !group.name.trim() || !Array.isArray(group.repos)) return [];
    const name = group.name.trim();
    const repos = uniqueNames(group.repos.filter(isRepositoryName)).slice(0, MAX_REPOSITORIES);
    if (!repos.length || names.has(name.toLowerCase()) || groupNameError(name)) return [];
    names.add(name.toLowerCase());
    return [group.isDefault === true ? { name, repos, isDefault: true } : { name, repos }];
  }).slice(0, MAX_GROUPS);
}

export function parseSettings(value: unknown, defaultGroups: RepoGroup[] = OFFICIAL_REPO_GROUPS): Settings {
  const stored = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rules = (stored.rules && typeof stored.rules === 'object' ? stored.rules : {}) as Record<string, unknown>;
  return {
    rules: {
      staleDays: isValidStaleDays(rules.staleDays) ? rules.staleDays : DEFAULT_RULES.staleDays,
      checkTitle: typeof rules.checkTitle === 'boolean' ? rules.checkTitle : DEFAULT_RULES.checkTitle,
      requireIssue: typeof rules.requireIssue === 'boolean' ? rules.requireIssue : DEFAULT_RULES.requireIssue,
      extraBots: Array.isArray(rules.extraBots) ? parseList(rules.extraBots.filter((l) => typeof l === 'string').join(' ')) : DEFAULT_RULES.extraBots,
      areaCriteria: parseAreaCriteria(rules.areaCriteria ?? migrateAreaModules(rules.areaModules)),
    },
    theme: pick(stored.theme, THEMES, DEFAULT_SETTINGS.theme),
    density: pick(stored.density, DENSITIES, DEFAULT_SETTINGS.density),
    reviewColumn: pick(stored.reviewColumn, REVIEW_COLUMNS, DEFAULT_SETTINGS.reviewColumn),
    reviewerOrder: Array.isArray(stored.reviewerOrder) ? completeReviewerOrder(stored.reviewerOrder) : DEFAULT_SETTINGS.reviewerOrder,
    refreshMinutes: pick(stored.refreshMinutes, REFRESH_INTERVALS, DEFAULT_SETTINGS.refreshMinutes),
    showLabels: typeof stored.showLabels === 'boolean' ? stored.showLabels : DEFAULT_SETTINGS.showLabels,
    // An id no column has any more, such as one from an older version, is dropped (SET-8).
    hiddenColumns: Array.isArray(stored.hiddenColumns)
      ? [...new Set(stored.hiddenColumns.filter((id): id is string => typeof id === 'string' && COLUMNS.some((column) => column.id === id)))]
      : [],
    columnOrder: Array.isArray(stored.columnOrder) ? orderToKeep(stored.columnOrder.filter((id): id is string => typeof id === 'string')) : [],
    repoGroups: Array.isArray(stored.repoGroups) ? parseGroups(stored.repoGroups) : defaultGroups,
  };
}

// The rules behind the Attention count (SET-10). The area lists only sort PRs into BE and FE, so they are left out.
export function rulesAreDefault(rules: Rules, defaultBots: string[] = DEFAULT_RULES.extraBots): boolean {
  const attention = ({ staleDays, checkTitle, requireIssue, extraBots }: Rules) => JSON.stringify([
    staleDays, checkTitle, requireIssue, cleanBots(extraBots).map((login) => login.toLowerCase()).sort(),
  ]);
  return attention(rules) === attention({ ...DEFAULT_RULES, extraBots: defaultBots });
}

export function loadSettings(defaultGroups: RepoGroup[] = OFFICIAL_REPO_GROUPS): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'), defaultGroups);
  } catch {
    return { ...DEFAULT_SETTINGS, repoGroups: defaultGroups };
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* storage is blocked; settings live only for this page load */ }
}
