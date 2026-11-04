// Which repositories the board shows, asks for, and loads, from the data, the address, and the repository groups
// (DATA-18, DATA-22, DATA-23), and what the empty table says. Pure, so App only wires it up.

import { sameName } from '../names.ts';
import { MAX_REPOSITORIES } from '../repository.ts';
import { checkedGroups, checkedRepositories, groupOptions } from './groups.ts';
import type { RepoGroup } from './groups.ts';

// The repositories the board shows, spelled as the data spells them, and the requested ones the data lacks.
export function boardRepos(dataRepos: string[], requested: string[]): { shown: string[]; missing: string[] } {
  if (!requested.length) return { shown: dataRepos, missing: [] };
  return {
    shown: dataRepos.filter((repo) => requested.some((r) => sameName(r, repo))),
    missing: requested.filter((repo) => !dataRepos.some((r) => sameName(r, repo))),
  };
}

export interface RepositoryInput {
  // The repositories of the data on the page, or of the build before any data loads.
  dataRepos: string[];
  // repos in the address.
  linkRepos: string[];
  groups: RepoGroup[];
  // groups in the address (FILTER-17).
  viewGroups: string[] | null;
  // No snapshot and nothing loaded yet (DATA-23).
  notLoaded: boolean;
}

export interface RepositoryPlan {
  shown: string[];
  // The Repositories menu entries and the checked ones.
  groupNames: string[];
  checked: string[];
  // What a live load reads: the address's repositories, or else those of the checked groups.
  wanted: string[];
  // Groups decide what loads, and the checked entries have nothing to load.
  nothingChecked: boolean;
  // Requested repositories the page has no data for, for the banner.
  pending: string[];
  // What the header names.
  headerRepos: string[];
}

export function planRepositories({ dataRepos, linkRepos, groups, viewGroups, notLoaded }: RepositoryInput): RepositoryPlan {
  const shown = boardRepos(dataRepos, linkRepos).shown;
  const groupNames = groupOptions(groups, shown);
  const checked = checkedGroups(viewGroups, groups, groupNames);
  const groupRepos = groups.length ? checkedRepositories(groups, checked, shown) : [];
  const wanted = linkRepos.length ? linkRepos : groupRepos;
  return {
    shown,
    groupNames,
    checked,
    wanted,
    nothingChecked: !linkRepos.length && groups.length > 0 && !groupRepos.length,
    pending: notLoaded ? wanted : boardRepos(dataRepos, wanted).missing,
    headerRepos: linkRepos.length ? linkRepos : notLoaded ? wanted : dataRepos,
  };
}

// What Refresh reads: the wanted repositories, or else those of the data, or else the build's; or why it cannot start.
export function loadTargets(plan: RepositoryPlan, reportRepos: string[], buildRepos: string[]): { names: string[] } | { problem: string } {
  if (plan.nothingChecked) return { problem: 'Check a repository group in the Repositories menu first.' };
  const names = plan.wanted.length ? plan.wanted : reportRepos.length ? reportRepos : buildRepos;
  if (!names.length) return { problem: 'Choose the repositories to show in Settings first.' };
  if (names.length > MAX_REPOSITORIES) {
    return { problem: 'The checked groups name ' + names.length + ' repositories; the board reads at most ' + MAX_REPOSITORIES
      + '. Uncheck a group in the Repositories menu.' };
  }
  return { names };
}

const WHERE = { snapshot: 'not in the snapshot', live: 'not in the live data', none: 'not loaded yet' };

// The banner for requested repositories that the page has no data for; only Refresh can load them. 'none' is a page
// without a snapshot before its first load (DATA-23).
export function missingReposMessage(missing: string[], hasToken: boolean, source: keyof typeof WHERE): string {
  const one = missing.length === 1;
  const action = (hasToken ? 'Refresh' : 'Add a GitHub token in Settings, then Refresh') + ' loads ' + (one ? 'it' : 'them') + '.';
  return missing.join(', ') + (one ? ' is ' : ' are ') + WHERE[source] + '. ' + action;
}

// What the table body says when it has no rows (TABLE-19, TABLE-20, DATA-23).
export type TableMessageKind = 'loading' | 'no-repos' | 'no-groups' | 'not-loaded' | 'no-match';

export function emptyTableKind({ loading, notLoaded, failed, plan }: {
  loading: boolean;
  notLoaded: boolean;
  failed: boolean;
  plan: Pick<RepositoryPlan, 'wanted' | 'nothingChecked'>;
}): TableMessageKind {
  if (loading) return 'loading';
  if (notLoaded) return plan.wanted.length ? 'not-loaded' : plan.nothingChecked ? 'no-groups' : 'no-repos';
  return failed ? 'not-loaded' : 'no-match';
}
