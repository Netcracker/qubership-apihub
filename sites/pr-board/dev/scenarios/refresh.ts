// How the GraphQL mock behind Refresh behaves.

import type { RawResponse } from '../../src/github/raw.ts';
import type { FixtureEntry } from '../fixtures/builders.ts';
import { gadgetsEntries } from '../fixtures/gadgets.ts';
import { DEV_REPOSITORY, DEV_VIEWER, FORBIDDEN_REPOSITORY, GADGETS_REPOSITORY } from '../fixtures/people.ts';
import { typicalNodes } from '../fixtures/typical.ts';
import { mixedEntries } from './entries.ts';
import type { GraphqlVariables, MockResponse, RefreshScenario } from './types.ts';

const SLOW_REFRESH_MS = 4000;
const PACED_PAGE_MS = 500;
const SMALL_PAGE = 7;
// reviews(last: 10) in the query.
const REVIEWS_FETCHED = 10;
const MISSING_PRS = 3;

// Like GitHub, the mock leaves out what the query's @include switches off, and keeps only the last comments and reviews
// the query asks for.
function asQueried(node: FixtureEntry['node'], variables: GraphqlVariables): FixtureEntry['node'] {
  const next = { ...node };
  if (variables.withProjectFields === false && next.closingIssuesReferences) {
    next.closingIssuesReferences = { nodes: (next.closingIssuesReferences.nodes || []).map((issue) => (issue ? { ...issue, projectItems: undefined } : issue)) };
  }
  if (variables.withComments === false) {
    delete next.comments;
    delete next.reviews;
  } else {
    if (next.comments && variables.commentsFetched) next.comments = { nodes: (next.comments.nodes || []).slice(-variables.commentsFetched) };
    if (next.reviews) next.reviews = { nodes: (next.reviews.nodes || []).slice(-REVIEWS_FETCHED) };
  }
  if (variables.withChecks === false && next.commits) {
    next.commits = { nodes: (next.commits.nodes || []).map((commit) => (commit && commit.commit && commit.commit.statusCheckRollup
      ? { commit: { statusCheckRollup: { ...commit.commit.statusCheckRollup, contexts: undefined } } } : commit)) };
  }
  return next;
}

function graphqlPage(entries: FixtureEntry[], variables: GraphqlVariables,
  { pageSize = variables.first, totalExtra = 0, projectsError = false, fieldsRefusedAfterFirstPage = false } = {}): MockResponse {
  const offset = variables.after ? Number(variables.after) : 0;
  const slice = entries.slice(offset, offset + pageSize)
    .map(({ node }) => asQueried(projectsError ? { ...node, projectsV2: null } : node, variables));
  const next = offset + slice.length;
  const body: RawResponse = {
    data: {
      ...(variables.withViewer === false ? {} : { viewer: { login: DEV_VIEWER, avatarUrl: null } }),
      repository: {
        pullRequests: {
          totalCount: entries.length + totalExtra,
          pageInfo: { hasNextPage: next < entries.length, endCursor: next < entries.length ? String(next) : null },
          nodes: slice,
        },
      },
    },
  };
  // GitHub refuses the project fields of an issue in a project the token cannot read, and nulls that issue.
  if (fieldsRefusedAfterFirstPage && offset > 0 && variables.withProjectFields !== false && slice.length) {
    body.errors = [{ type: 'FORBIDDEN', path: ['repository', 'pullRequests', 'nodes', 0, 'closingIssuesReferences', 'nodes', 0, 'projectItems'],
      message: 'Resource not accessible by integration' }];
  }
  if (projectsError && slice.length) {
    body.errors = slice.map((_, i) => ({
      type: 'FORBIDDEN',
      path: ['repository', 'pullRequests', 'nodes', i, 'projectsV2'],
      message: 'Resource not accessible by integration',
    }));
  }
  return { status: 200, body: JSON.stringify(body) };
}

function notFound(variables: GraphqlVariables): MockResponse {
  const name = variables.owner + '/' + variables.repo;
  return {
    status: 200,
    body: JSON.stringify({
      data: { repository: null },
      errors: [{ type: 'NOT_FOUND', path: ['repository'], message: "Could not resolve to a Repository with the name '" + name + "'." }],
    }),
  };
}

function forbidden(): MockResponse {
  return {
    status: 200,
    body: JSON.stringify({
      data: { repository: null },
      errors: [{ type: 'FORBIDDEN', path: ['repository'], message: 'Resource protected by organization SAML enforcement.' }],
    }),
  };
}

// The scenario's PRs for the mock repository, the gadgets PRs for the second one, FORBIDDEN for the private one, and
// NOT_FOUND for any other. Names compare without case, as on GitHub.
function board(widgets: (now: number) => FixtureEntry[], options: Parameters<typeof graphqlPage>[2] = {}) {
  return (variables: GraphqlVariables, now: number): MockResponse => {
    const name = (variables.owner + '/' + variables.repo).toLowerCase();
    if (name === DEV_REPOSITORY) return graphqlPage(widgets(now), variables, options);
    if (name === GADGETS_REPOSITORY) return graphqlPage(gadgetsEntries(now), variables, options);
    return name === FORBIDDEN_REPOSITORY ? forbidden() : notFound(variables);
  };
}

const ok = board(mixedEntries);

export const REFRESH_SCENARIOS: RefreshScenario[] = [
  { id: 'ok', label: 'Success', respond: ok },
  { id: 'paginated', label: 'Success over several pages', respond: board(mixedEntries, { pageSize: SMALL_PAGE }) },
  { id: 'projects-error', label: 'Partial error: projects forbidden', respond: board(typicalNodes, { projectsError: true }) },
  // The refusal comes on a later page, so the load reads the repository again from its first page (DATA-25).
  { id: 'fields-error', label: 'Partial error: project fields forbidden', respond: board(mixedEntries, { pageSize: SMALL_PAGE, fieldsRefusedAfterFirstPage: true }) },
  { id: 'count-mismatch', label: 'Fewer PRs than totalCount', respond: board(typicalNodes, { totalExtra: MISSING_PRS }) },
  // Only the first page waits, so the delay stays 4 s however many pages the board takes.
  { id: 'slow', label: 'Slow response (4 s)', respond: (v, now) => ({ ...ok(v, now), delayMs: v.after ? 0 : SLOW_REFRESH_MS }) },
  // Every page waits, so the loading status walks through the pages of each repository (DATA-27).
  { id: 'paced', label: 'Pages one by one (0.5 s each)', respond: (v, now) => ({ ...ok(v, now), delayMs: PACED_PAGE_MS }) },
  { id: 'unauthorized', label: '401 Bad credentials', respond: () => ({ status: 401, body: JSON.stringify({ message: 'Bad credentials' }) }) },
  { id: 'server-error', label: '502 from GitHub', respond: () => ({ status: 502, body: 'Server Error' }) },
  { id: 'repo-not-found', label: 'Repository not found', respond: notFound },
  { id: 'network', label: 'Network failure', respond: () => ({ destroy: true }) },
];
