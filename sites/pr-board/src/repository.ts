// Repository names. The repositories are configuration, not code: they come from the link, Settings, repository
// groups, or PR_BOARD_REPO, so nothing in git names the organization that owns them.

import { splitList, uniqueNames } from './names.ts';

export const REPO_VARIABLE = 'PR_BOARD_REPO';
export const MAX_REPOSITORIES = 40;

export interface Repository {
  owner: string;
  name: string;
}

// GitHub owner and repository names: letters, digits, and dashes; repository names may also have dots and underscores.
const OWNER_AND_NAME = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/;

function matchRepository(value: string): RegExpExecArray | null {
  const match = OWNER_AND_NAME.exec(value);
  return match && match[2] !== '.' && match[2] !== '..' ? match : null;
}

// Repository names reach REST paths, so a name from prs.json is checked before use.
export function isRepositoryName(value: unknown): value is string {
  return typeof value === 'string' && matchRepository(value) !== null;
}

// An empty value counts as unset: CI passes an unset repository variable as an empty string.
export function parseRepository(value: string | undefined): Repository {
  if (!value) {
    throw new Error(REPO_VARIABLE + ' is not set. Set it to the repository as owner/name, such as acme/widgets.');
  }
  const match = matchRepository(value);
  if (!match) {
    throw new Error(REPO_VARIABLE + ' must be "owner/name", such as acme/widgets, not "' + value + '".');
  }
  return { owner: match[1], name: match[2] };
}

export function parseRepositories(value: string | undefined): Repository[] {
  const entries = uniqueNames(splitList(value || ''));
  if (!entries.length) parseRepository('');
  const repositories = entries.map(parseRepository);
  if (repositories.length > MAX_REPOSITORIES) {
    throw new Error(REPO_VARIABLE + ' lists ' + repositories.length + ' repositories; the board reads at most ' + MAX_REPOSITORIES + '.');
  }
  return repositories;
}

// The Repositories field in Settings: the list, or what is wrong with it. An empty list is valid.
export function checkRepositoryList(text: string): { repos: string[] } | { error: string } {
  const entries = splitList(text);
  const invalid = entries.find((entry) => !isRepositoryName(entry));
  if (invalid !== undefined) return { error: '"' + invalid + '" is not owner/name, such as acme/widgets.' };
  const repos = uniqueNames(entries);
  if (repos.length > MAX_REPOSITORIES) {
    return { error: 'The board reads at most ' + MAX_REPOSITORIES + ' repositories; this list has ' + repos.length + '.' };
  }
  return { repos };
}

export function repositoryName(repository: Repository): string {
  return repository.owner + '/' + repository.name;
}
