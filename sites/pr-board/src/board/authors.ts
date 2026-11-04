// The author menu: who opened the shown PRs and which of them are chosen.

import { sameName } from '../names.ts';
import type { Actor, DerivedPullRequest } from '../types.ts';
import { AUTHOR_GROUP_IDS } from './view.ts';
import type { AuthorGroupId, AuthorsFilter } from './view.ts';
import { SERVICE_ACCOUNT } from '../defaults.ts';

export const AUTHOR_GROUPS: [AuthorGroupId, string][] = [
  ['humans', 'Humans'], ['service', SERVICE_ACCOUNT], ['dependabot', 'Dependabot'], ['other-bots', 'Other bots'],
];

export function authorGroup(author: AuthorEntry): AuthorGroupId {
  if (sameName(author.login, SERVICE_ACCOUNT)) return 'service';
  if (sameName(author.login, 'dependabot[bot]') || sameName(author.login, 'dependabot')) return 'dependabot';
  return author.bot ? 'other-bots' : 'humans';
}

export function chosenAuthorGroups(mode: AuthorsFilter): AuthorGroupId[] {
  if (mode === null) return ['humans'];
  if (mode === 'all') return AUTHOR_GROUP_IDS;
  if (mode === 'bots') return AUTHOR_GROUP_IDS.filter((id) => id !== 'humans');
  if (mode === 'me') return [];
  return Array.isArray(mode) ? [] : mode.groups;
}

export interface AuthorEntry {
  login: string;
  actor: Actor | null;
  bot: boolean;
  count: number;
}

export function collectAuthors(prs: DerivedPullRequest[]): AuthorEntry[] {
  const byLogin = new Map<string, AuthorEntry>();
  for (const pr of prs) {
    const entry = byLogin.get(pr.authorKey) || { login: pr.authorKey, actor: pr.author, bot: pr.bot, count: 0 };
    entry.count += 1;
    byLogin.set(pr.authorKey, entry);
  }
  return Array.from(byLogin.values()).sort((a, b) => a.login.localeCompare(b.login, 'en', { sensitivity: 'base' }));
}

export function selectedAuthors(mode: AuthorsFilter, authors: AuthorEntry[], viewer = ''): Set<string> {
  if (mode === 'me') return new Set(authors.filter((author) => sameName(author.login, viewer)).map((author) => author.login));
  if (mode && typeof mode === 'object' && !Array.isArray(mode)) {
    return new Set(authors.filter((author) => mode.groups.includes(authorGroup(author))).map((author) => author.login));
  }
  if (mode === 'all') return new Set(authors.map((a) => a.login));
  if (mode === 'bots') return new Set(authors.filter((a) => authorGroup(a) !== 'humans').map((a) => a.login));
  // A chosen login without open PRs in the current data is left out, so counts match what is shown.
  if (mode) return new Set(authors.map((a) => a.login).filter((login) => mode.some((chosen) => sameName(chosen, login))));
  return new Set(authors.filter((a) => authorGroup(a) === 'humans').map((a) => a.login));
}

// What the Authors button says about the choice.
export function authorsSummary(mode: AuthorsFilter, selected: Set<string>): string {
  if (mode && typeof mode === 'object' && !Array.isArray(mode)) {
    return mode.groups.length ? AUTHOR_GROUPS.filter(([id]) => mode.groups.includes(id)).map(([, label]) => label).join(', ') : 'Nobody';
  }
  if (mode === null) return 'People';
  if (mode === 'all') return 'Everyone';
  if (mode === 'bots') return 'Bots';
  if (mode === 'me') return 'Me';
  if (selected.size === 0) return 'Nobody';
  if (selected.size === 1) return Array.from(selected)[0];
  return selected.size + ' selected';
}

// The choice after one author is checked or unchecked. Chosen logins without open PRs stay chosen (FILTER-4), and a
// choice that equals a preset, with nothing else chosen, becomes that preset.
export function toggleAuthor(login: string, selected: Set<string>, authors: AuthorEntry[], mode: AuthorsFilter = null): AuthorsFilter {
  const next = new Set(selected);
  if (next.has(login)) next.delete(login); else next.add(login);
  const away = Array.isArray(mode) ? mode.filter((chosen) => !authors.some((a) => sameName(a.login, chosen))) : [];
  const everyone = authors.map((a) => a.login);
  const chosen = [...everyone.filter((l) => next.has(l)), ...away];
  if (away.length || !next.size) return chosen;
  const people = authors.filter((a) => authorGroup(a) === 'humans').map((a) => a.login);
  const bots = authors.filter((a) => authorGroup(a) !== 'humans').map((a) => a.login);
  const same = (list: string[]) => list.length === next.size && list.every((l) => next.has(l));
  if (same(people)) return null;
  if (same(everyone)) return 'all';
  if (bots.length && same(bots)) return 'bots';
  return chosen;
}
