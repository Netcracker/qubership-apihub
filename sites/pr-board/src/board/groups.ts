// Repository groups (SET-19, FILTER-17): named lists of repositories defined in Settings. The Repositories menu checks
// groups to show only the rows of their repositories; the data itself does not change.

import { checkRepositoryList } from '../repository.ts';
import { uniqueNames } from '../names.ts';

export interface RepoGroup {
  name: string;
  repos: string[];
  // Checked when the address names no groups; marked with a leading * in Settings.
  isDefault?: boolean;
}

export const MAX_GROUPS = 20;

// The menu entry for repositories of the data that are in no group. No group may take its name.
export const UNGROUPED = 'Ungrouped';

// Group names go into the address in lists split by commas and semicolons, so they hold neither.
export function groupNameError(name: string): string | null {
  // A colon ends the name in a Settings line and in the address, and control characters would break a line.
  if (/[,;:\p{Cc}]/u.test(name)) return 'the group name "' + name + '" has a comma, a semicolon, or a colon.';
  if (name.startsWith('*')) return 'the group name "' + name + '" starts with *; one * before the name marks a default group.';
  if (name.toLowerCase() === UNGROUPED.toLowerCase()) return '"' + UNGROUPED + '" names the repositories in no group; choose another name.';
  return null;
}

// One group per line, "<name>: owner/name, owner/name", and a leading * for a group checked by default. The first
// line that is wrong is named with the reason.
export function parseGroupLines(text: string): { groups: RepoGroup[] } | { error: string } {
  const groups: RepoGroup[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].trim();
    if (!line) continue;
    const where = 'Line ' + (i + 1) + ': ';
    const isDefault = line.startsWith('*');
    if (isDefault) line = line.slice(1).trim();
    const colon = line.indexOf(':');
    const name = colon > 0 ? line.slice(0, colon).trim() : '';
    if (!name) return { error: where + 'start with the group name and a colon, such as "Backend: acme/widgets".' };
    const nameError = groupNameError(name);
    if (nameError) return { error: where + nameError };
    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) return { error: where + 'the group "' + name + '" is already defined.' };
    const list = checkRepositoryList(line.slice(colon + 1));
    if ('error' in list) return { error: where + list.error };
    if (!list.repos.length) return { error: where + 'the group "' + name + '" lists no repositories.' };
    groups.push(isDefault ? { name, repos: list.repos, isDefault } : { name, repos: list.repos });
  }
  if (groups.length > MAX_GROUPS) return { error: 'Up to ' + MAX_GROUPS + ' groups; this list has ' + groups.length + '.' };
  return { groups };
}

export function groupsToText(groups: RepoGroup[]): string {
  return groups.map((group) => (group.isDefault ? '*' : '') + group.name + ': ' + group.repos.join(', ')).join('\n');
}

// Every repository of the groups, once, in the order the groups list them. The board loads those of the checked
// groups when the address names no repositories (DATA-18).
export function groupRepositories(groups: RepoGroup[]): string[] {
  return uniqueNames(groups.flatMap((group) => group.repos));
}

// The repositories the checked entries load: those of the checked groups, and for Ungrouped those of the data that
// are in no group (DATA-18).
export function checkedRepositories(groups: RepoGroup[], checked: string[], dataRepos: string[]): string[] {
  const grouped = inAnyGroup(groups);
  const ungrouped = checked.includes(UNGROUPED) ? dataRepos.filter((repo) => !grouped.has(repo.toLowerCase())) : [];
  return uniqueNames([...groupRepositories(groups.filter((group) => checked.includes(group.name))), ...ungrouped]);
}

const inAnyGroup = (groups: RepoGroup[]) => new Set(groups.flatMap((group) => group.repos.map((repo) => repo.toLowerCase())));

// The menu entries: every group, then Ungrouped when some repository of the data is in no group.
export function groupOptions(groups: RepoGroup[], dataRepos: string[]): string[] {
  const grouped = inAnyGroup(groups);
  const names = groups.map((group) => group.name);
  return dataRepos.some((repo) => !grouped.has(repo.toLowerCase())) ? [...names, UNGROUPED] : names;
}

// The groups marked as default, or every entry when none is marked.
export function defaultGroups(groups: RepoGroup[], options: string[]): string[] {
  const marked = groups.filter((group) => group.isDefault).map((group) => group.name);
  return marked.length ? marked : options;
}

// The checked entries for the groups named in the address, in menu order. Without the parameter, or when it names
// only unknown groups, the default groups apply; an empty parameter checks nothing.
export function checkedGroups(selection: string[] | null, groups: RepoGroup[], options: string[]): string[] {
  if (selection === null) return defaultGroups(groups, options);
  const wanted = selection.map((name) => name.toLowerCase());
  const known = options.filter((name) => wanted.includes(name.toLowerCase()));
  return known.length || !selection.length ? known : defaultGroups(groups, options);
}

// What the address keeps for the checked entries: null when they are the default ones.
export function groupsSelection(checked: string[], groups: RepoGroup[], options: string[]): string[] | null {
  const defaults = defaultGroups(groups, options);
  const same = checked.length === defaults.length && defaults.every((name) => checked.includes(name));
  return same ? null : options.filter((name) => checked.includes(name));
}

// Whether a repository's rows show: it is in a checked group, or in no group while Ungrouped is checked.
export function groupFilter(groups: RepoGroup[], checked: string[]): (repo: string) => boolean {
  const grouped = inAnyGroup(groups);
  const shown = inAnyGroup(groups.filter((group) => checked.includes(group.name)));
  const ungrouped = checked.includes(UNGROUPED);
  return (repo) => {
    const key = repo.toLowerCase();
    return shown.has(key) || (ungrouped && !grouped.has(key));
  };
}

// The number of PRs of each entry; a repository in two groups counts in both. A group none of whose repositories is
// in the data has no count, since its PRs are not loaded.
export function groupCounts(groups: RepoGroup[], options: string[], dataRepos: string[], prRepos: string[]): Map<string, number> {
  const loaded = new Set(dataRepos.map((repo) => repo.toLowerCase()));
  const counts = new Map<string, number>();
  for (const name of options) {
    const group = groups.find((g) => g.name === name);
    if (group && !group.repos.some((repo) => loaded.has(repo.toLowerCase()))) continue;
    const test = groupFilter(groups, [name]);
    counts.set(name, prRepos.filter(test).length);
  }
  return counts;
}

export const GROUP_COLORS = 6;

// The color of a group, by its place in Settings: the six tints in turn (TABLE-31).
export function groupColor(groups: RepoGroup[], name: string): number | null {
  const index = groups.findIndex((group) => group.name === name);
  return index < 0 ? null : index % GROUP_COLORS;
}

// The color of a repository's rows: that of the first group that lists it, or none for a repository in no group.
export function repositoryColors(groups: RepoGroup[]): Map<string, number> {
  const colors = new Map<string, number>();
  groups.forEach((group, index) => {
    for (const repo of group.repos) {
      if (!colors.has(repo.toLowerCase())) colors.set(repo.toLowerCase(), index % GROUP_COLORS);
    }
  });
  return colors;
}

// The button text: All, None, up to two names, or how many are checked.
export function groupsSummary(checked: string[], options: string[]): string {
  if (checked.length === options.length) return 'All';
  if (!checked.length) return 'None';
  return checked.length <= 2 ? checked.join(', ') : checked.length + ' selected';
}
