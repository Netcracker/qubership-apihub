// Shared filter configuration lives beside the view in the URL. Legacy appearance parameters remain readable.

import { isRepositoryName, MAX_REPOSITORIES } from '../repository.ts';
import { parseList, splitList, uniqueNames } from '../names.ts';
import { cleanBots } from './bots.ts';
import { COLUMNS, orderToKeep } from './columns.ts';
import { groupsToText, parseGroupLines } from './groups.ts';
import type { RepoGroup } from './groups.ts';
import type { Settings } from '../settings.ts';
import { DEFAULT_RULES } from '../model/rules.ts';
import { areaCriteriaQuery, parseAreaCriteria } from '../model/areas.ts';
import type { AreaCriteriaMap } from '../model/areas.ts';
import { OFFICIAL_REPO_GROUPS } from '../defaults.ts';

export { cleanBots, MAX_BOTS } from './bots.ts';

export interface LinkSettings {
  // owner/name; empty shows every repository of the data.
  repos: string[];
  bots: string[];
  // Ids of the hidden columns; undefined when the address does not say, so the saved ones apply.
  hidden?: string[];
  // Every column id in order; undefined when the address does not say, so the saved order applies (SET-24).
  order?: string[];
  // The repository groups; undefined when the address does not name them, so the saved ones apply.
  groups?: RepoGroup[];
  criteria?: AreaCriteriaMap;
}

// Groups in the address: "*Name:owner/name,owner/name;Name:owner/name". Group names hold no ; or , (SET-19).
function parseLinkGroups(value: string): RepoGroup[] | undefined {
  const parsed = parseGroupLines(value.split(';').join('\n'));
  return 'groups' in parsed ? parsed.groups : undefined;
}

function linkGroupsValue(groups: RepoGroup[]): string {
  const keep = (text: string) => encodeURIComponent(text).replace(/%2F/g, '/').replace(/%2C/g, ',').replace(/%3A/g, ':').replace(/%2A/g, '*');
  return groups.map((group) => keep((group.isDefault ? '*' : '') + group.name + ':' + group.repos.join(','))).join(';');
}

export function parseLinkSettings(search: string): LinkSettings {
  const params = new URLSearchParams(search);
  const repos = uniqueNames(splitList(params.get('repos') || '').filter(isRepositoryName)).slice(0, MAX_REPOSITORIES);
  const hide = params.get('hide');
  const hiddenIds = hide === null ? [] : splitList(hide);
  const known = uniqueNames(hiddenIds.filter((id) => COLUMNS.some((column) => column.id === id)));
  // An empty hide= shows every column; a list of only unknown ids, such as one from a newer version, names nothing.
  const hidden = hide === null || (hiddenIds.length && !known.length) ? undefined : known;
  const groupsValue = params.get('repogroups');
  // An explicit empty list clears groups; an absent parameter keeps browser or build defaults.
  const groups = groupsValue === '' ? [] : groupsValue ? parseLinkGroups(groupsValue) : undefined;
  let criteria: AreaCriteriaMap | undefined;
  const encodedCriteria = params.get('criteria');
  if (encodedCriteria !== null && encodedCriteria.length <= 30000) {
    try {
      const value: unknown = JSON.parse(encodedCriteria);
      if (value && typeof value === 'object' && !Array.isArray(value)) criteria = parseAreaCriteria(value);
    } catch { /* A malformed link keeps the saved criteria. */ }
  }
  const cols = params.get('cols');
  // A list without a known id, such as one from a newer version, names no order.
  const order = cols && splitList(cols).some((id) => COLUMNS.some((column) => column.id === id)) ? orderToKeep(splitList(cols)) : undefined;
  return { repos, bots: cleanBots(params.has('bots') ? parseList(params.get('bots') || '') : DEFAULT_RULES.extraBots),
    hidden, ...(order ? { order } : {}), ...(groups ? { groups } : {}), ...(criteria ? { criteria } : {}) };
}

// Repository names are only letters, digits, and . _ - /, so they stay readable in the link; logins are encoded.
export function linkSettingsQuery(link: LinkSettings, defaults: RepoGroup[] = OFFICIAL_REPO_GROUPS,
  defaultBots: string[] = DEFAULT_RULES.extraBots): string {
  const parts: string[] = [];
  if (link.repos.length) parts.push('repos=' + link.repos.join(','));
  const botKey = (bots: string[]) => bots.map((login) => login.toLowerCase()).sort().join(',');
  if (botKey(link.bots) !== botKey(defaultBots)) {
    parts.push('bots=' + link.bots.map(encodeURIComponent).join(','));
  }
  if (link.groups && groupsToText(link.groups) !== groupsToText(defaults)) {
    parts.push('repogroups=' + linkGroupsValue(link.groups));
  }
  if (link.criteria) {
    const overrides = areaCriteriaQuery(link.criteria);
    if (overrides) parts.push('criteria=' + encodeURIComponent(overrides));
  }
  return parts.join('&');
}

export function readLinkSettings(): LinkSettings {
  return parseLinkSettings(window.location.search);
}

// Extra bots used to be saved in this browser. They move into the address once, unless the link names its own.
export function moveStoredBots(settings: Settings, link: LinkSettings, botsSpecified = false): { settings: Settings; link: LinkSettings; moved: boolean } {
  const stored = settings.rules.extraBots;
  if (!stored.length) return { settings, link, moved: false };
  return {
    settings: { ...settings, rules: { ...settings.rules, extraBots: [] } },
    link: botsSpecified || link.bots.length ? link : { ...link, bots: cleanBots(stored) },
    moved: true,
  };
}

export function withDefaultBots(link: LinkSettings, bots: string[], explicitlySet = false): LinkSettings {
  return explicitlySet || link.bots.length || !bots.length ? link : { ...link, bots };
}

// Hidden columns live in this browser and in the address (SET-8). A link that names them wins and is saved; otherwise
// the saved ones go into the address, so a copied link carries the same columns.
export function applyLinkColumns(settings: Settings, link: LinkSettings): { settings: Settings; link: LinkSettings; changed: boolean } {
  if (link.hidden === undefined) return { settings, link: { ...link, hidden: settings.hiddenColumns }, changed: false };
  return { settings: { ...settings, hiddenColumns: link.hidden }, link, changed: true };
}

// Repository groups from a link show on this page without being saved, so opening a shared link never replaces the
// viewer's own groups. Without them, the saved groups go into the address, so a copied link carries them.
export function linkWithGroups(link: LinkSettings, saved: RepoGroup[]): LinkSettings {
  return link.groups === undefined ? { ...link, groups: saved } : link;
}

// The groups to save when Settings changes: the ones the viewer edited, or else the saved ones, never a link's.
export function groupsToSave(next: RepoGroup[], shown: RepoGroup[], saved: RepoGroup[]): RepoGroup[] {
  return next === shown ? saved : next;
}

// The column order works like the hidden columns: a link that names it wins and is saved; otherwise the saved order
// goes into the address, so a copied link carries the same columns in the same order (SET-24).
export function applyLinkOrder(settings: Settings, link: LinkSettings): { settings: Settings; link: LinkSettings; changed: boolean } {
  if (link.order === undefined) return { settings, link: { ...link, order: settings.columnOrder }, changed: false };
  return { settings: { ...settings, columnOrder: link.order }, link, changed: true };
}
