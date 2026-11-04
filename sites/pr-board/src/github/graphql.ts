// Reads every open pull request through the GraphQL API, page by page.

import { repositoryName } from '../repository.ts';
import { sameName } from '../names.ts';
import type { Repository } from '../repository.ts';
import type { Actor, PullRequest, Report } from '../types.ts';
import { GitHubError } from './http.ts';
import type { Fetch } from './http.ts';
import { nodes, normalizePullRequest } from './normalize.ts';
import {
  ALL_PARTS, AVATAR_SIZE, CHECKS_PAGE_SIZE, COMMENTS_FETCHED, MIN_PAGE_SIZE, OPEN_PULL_REQUESTS_QUERY, PAGE_SIZE, PROJECT_FIELDS,
  PROJECT_ITEMS,
} from './query.ts';
import type { QueryParts, QueryVariables } from './query.ts';
import type { RawPullRequest, RawResponse } from './raw.ts';

export const GRAPHQL_URL = 'https://api.github.com/graphql';

// What one repository's read is doing, for the loading status (DATA-27).
export interface RepositoryProgress {
  repo: string;
  status: 'reading' | 'done' | 'unreadable';
  read: number;
  total: number | null;
  note?: string;
}

export interface FetchOptions {
  token: string;
  repositories: Repository[];
  parts?: QueryParts;
  fetchImpl?: Fetch;
  endpoint?: string;
  onProgress?: (event: RepositoryProgress) => void;
  // Reads the token owner (DATA-26). A snapshot leaves it out: the workflow's token is not the viewer's.
  withViewer?: boolean;
  // Stops the reads of a load that a newer one replaced.
  signal?: AbortSignal;
}

async function postQuery(fetchImpl: Fetch, endpoint: string, token: string, variables: QueryVariables,
  signal: AbortSignal | undefined): Promise<RawResponse> {
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: OPEN_PULL_REQUESTS_QUERY, variables }),
      signal,
    });
  } catch (error) {
    if (signal && signal.aborted) throw new LoadAborted();
    throw new GitHubError('Cannot reach api.github.com: ' + (error as Error).message, 0);
  }
  if (response.status === 401) {
    throw new GitHubError('GitHub rejected the token. Create a new token and try again.', 401);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new GitHubError('GitHub API returned HTTP ' + response.status + ': ' + text.slice(0, 300), response.status);
  }
  try {
    return await response.json();
  } catch {
    throw new GitHubError('GitHub API returned a response that is not JSON.', response.status);
  }
}

interface RepositoryPullRequests {
  repo: string;
  viewer: Actor | null;
  prs: PullRequest[];
  warnings: string[];
}

type ReadOptions = Required<Omit<FetchOptions, 'repositories' | 'signal'>> & Pick<FetchOptions, 'signal'>;

// Thrown when the load's signal is aborted; the caller started a newer load and ignores this one.
export class LoadAborted extends Error {
  constructor() {
    super('The load was replaced by a newer one.');
    this.name = 'LoadAborted';
  }
}

const TIMEOUT_STATUSES = new Set([0, 502, 503, 504]);
const PARALLEL_READS = 4;

// GitHub answers a repository it cannot give with null and errors at "repository": NOT_FOUND when it does not exist or
// the token cannot see it, FORBIDDEN when the organization blocks the token (SAML, for one). A null repository without
// errors is unreadable too. Returns the warning.
function unreadableRepository(body: RawResponse, repo: string): string | null {
  if (body.data && body.data.repository) return null;
  const errors = body.errors || [];
  if (!errors.length) return 'Repository ' + repo + ' was not found, or the token cannot read it.';
  if (!errors.every((error) => (error.path || []).join('.') === 'repository')) return null;
  if (errors.every((error) => error.type === 'NOT_FOUND')) return 'Repository ' + repo + ' was not found, or the token cannot read it.';
  return 'Repository ' + repo + ' cannot be read with this token: ' + errors[0].message;
}

function graphqlError(error: NonNullable<RawResponse['errors']>[number]): GitHubError {
  const path = (error.path || []).join('.');
  return new GitHubError('GitHub GraphQL error' + (path ? ' at ' + path : '') + ': ' + error.message, 200);
}

// Partial GraphQL errors on optional fields (projects need extra token scopes) become warnings, not a failed report.
// With several repositories, one that cannot be read gives its warning instead of failing.
// stopped says another read failed, so the whole load fails anyway and the next page is not worth asking for.
async function readRepository(repository: Repository, several: boolean, options: ReadOptions, stopped: () => boolean): Promise<RepositoryPullRequests | { unreadable: string }> {
  const { token, parts, fetchImpl, endpoint, onProgress, withViewer, signal } = options;
  let repo = repositoryName(repository);
  const rawNodes: RawPullRequest[] = [];
  const warnings = new Set<string>();
  let projectsAvailable = true;
  let after: string | null = null;
  let totalCount = 0;
  let first = PAGE_SIZE;
  // projectItems is non-null, so a refusal there nulls the whole issue; the page is then asked again without them.
  let withProjectFields = true;
  let viewer: Actor | null = null;
  onProgress({ repo, status: 'reading', read: 0, total: null });
  for (;;) {
    if (signal && signal.aborted) throw new LoadAborted();
    if (stopped()) throw new GitHubError('Stopped reading ' + repo + ': another repository failed.', 0);
    let body: RawResponse;
    try {
      body = await postQuery(fetchImpl, endpoint, token, {
        owner: repository.owner, repo: repository.name, first, after, avatarSize: AVATAR_SIZE, checksPageSize: CHECKS_PAGE_SIZE, commentsFetched: COMMENTS_FETCHED,
        withChecks: parts.checks, withComments: parts.comments, withProjectFields, projectItems: PROJECT_ITEMS,
        // The viewer is the same on every page, so only the first one asks.
        withViewer: withViewer && !after,
        priorityField: PROJECT_FIELDS.priority, estimateField: PROJECT_FIELDS.estimate, sprintField: PROJECT_FIELDS.sprint,
      }, signal);
    } catch (error) {
      // A timeout comes back as 502-504, or, without CORS headers, as a failed fetch (status 0), which a network failure
      // also gives. The same page is asked again with half the PRs, and later pages keep that size.
      if (!(error instanceof GitHubError) || !TIMEOUT_STATUSES.has(error.status) || first <= MIN_PAGE_SIZE) throw error;
      first = Math.max(MIN_PAGE_SIZE, Math.floor(first / 2));
      const why = error.status ? 'GitHub timed out' : 'GitHub did not answer';
      onProgress({ repo, status: 'reading', read: rawNodes.length, total: after ? totalCount : null, note: why + '; asking for ' + first + ' pull requests a page' });
      continue;
    }
    const unreadable = after ? null : unreadableRepository(body, repo);
    if (unreadable) {
      onProgress({ repo, status: 'unreadable', read: 0, total: null, note: unreadable });
      if (several) return { unreadable };
      throw body.errors && body.errors.length ? graphqlError(body.errors[0]) : new GitHubError(unreadable, 404);
    }
    // GitHub's spelling of the name, so the same repository typed in another case keeps the same PR keys.
    const canonical = body.data && body.data.repository && body.data.repository.nameWithOwner;
    if (typeof canonical === 'string' && sameName(canonical, repo)) repo = canonical;
    const who = body.data && body.data.viewer;
    if (who && typeof who.login === 'string') viewer = { login: who.login, avatarUrl: typeof who.avatarUrl === 'string' ? who.avatarUrl : null, bot: false };
    const connection = body.data && body.data.repository && body.data.repository.pullRequests;
    const fieldsRefused = (body.errors || []).find((error) => (error.path || []).join('.').includes('projectItems'));
    if (connection && fieldsRefused && withProjectFields) {
      // The repository starts over, so no PR keeps fields that later ones lack.
      withProjectFields = false;
      rawNodes.length = 0;
      after = null;
      onProgress({ repo, status: 'reading', read: 0, total: connection.totalCount, note: 'Reading again without project fields' });
      warnings.add('Project fields (Priority, Estimate, Sprint) are unavailable for this token: ' + fieldsRefused.message);
      continue;
    }
    for (const error of body.errors || []) {
      const path = (error.path || []).join('.');
      if (!connection || !path.includes('projectsV2')) throw graphqlError(error);
      projectsAvailable = false;
      warnings.add('Project membership is unavailable for this token: ' + error.message);
    }
    if (!connection) throw new GitHubError('Repository ' + repo + ' was not found.', 404);
    totalCount = connection.totalCount;
    rawNodes.push(...nodes(connection));
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    onProgress({ repo, status: after ? 'reading' : 'done', read: rawNodes.length, total: totalCount, note: '' });
    if (!after) break;
  }
  if (rawNodes.length !== totalCount) {
    warnings.add('GitHub reported ' + totalCount + ' open pull requests' + (several ? ' in ' + repo : '') + ' but returned ' + rawNodes.length + '.');
  }
  return { repo, viewer, prs: rawNodes.map((node) => normalizePullRequest(node, { repo, projectsAvailable })), warnings: [...warnings] };
}

// A missing repository only costs a warning, and four reads at a time keep GitHub from seeing a burst.
export async function fetchOpenPullRequests({
  token, repositories, parts = ALL_PARTS, fetchImpl = fetch, endpoint = GRAPHQL_URL, onProgress = () => {}, withViewer = true, signal,
}: FetchOptions): Promise<Report> {
  if (!token) throw new GitHubError('A GitHub token is required to query the GraphQL API.', 0);
  if (!repositories.length) throw new GitHubError('No repositories to read.', 0);
  const several = repositories.length > 1;
  const read: RepositoryPullRequests[] = [];
  const warnings = new Set<string>();
  // Results keep the order of the list.
  const results: Awaited<ReturnType<typeof readRepository>>[] = [];
  let next = 0;
  // After one read fails the whole load fails, so the other workers stop instead of reading the rest for nothing.
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(PARALLEL_READS, repositories.length) }, async () => {
    while (!failed && next < repositories.length) {
      const index = next++;
      try {
        results[index] = await readRepository(repositories[index], several, { token, parts, fetchImpl, endpoint, onProgress, withViewer, signal }, () => failed);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }));
  for (const result of results) {
    if ('unreadable' in result) warnings.add(result.unreadable);
    else read.push(result);
  }
  if (!read.length) throw new GitHubError('None of the repositories ' + repositories.map(repositoryName).join(', ') + ' was found.', 404);
  for (const result of read) for (const warning of result.warnings) warnings.add(warning);
  const prs = read.flatMap((result) => result.prs);
  prs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const viewer = read.map((result) => result.viewer).find(Boolean);
  return {
    ...(viewer ? { viewer } : {}),
    repos: read.map((result) => result.repo),
    generatedAt: new Date().toISOString(),
    warnings: [...warnings],
    prs,
  };
}
