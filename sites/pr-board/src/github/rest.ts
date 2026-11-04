// Reads every comment and review of one pull request through the REST API, for the comments panel.

import { repositoryName } from '../repository.ts';
import type { Repository } from '../repository.ts';
import type { Comment } from '../types.ts';
import { GitHubError } from './http.ts';
import type { Fetch } from './http.ts';
import { mergeComments } from './normalize.ts';
import { AVATAR_SIZE } from './query.ts';
import type { RawActor, RestComment, RestReview, RestUser } from './raw.ts';

export const REST_URL = 'https://api.github.com';

const REST_PAGE_SIZE = 100;

// Enough for any real PR; the panel says so when a list is longer.
const MAX_REST_PAGES = 5;

export interface AllComments {
  comments: Comment[];
  // False when a list had more than MAX_REST_PAGES pages.
  complete: boolean;
}

export interface AllCommentsOptions {
  number: number;
  repository: Repository;
  // Optional: without it GitHub allows 60 requests an hour per IP address.
  token?: string;
  fetchImpl?: Fetch;
  restUrl?: string;
}

function restActor(user: RestUser | null | undefined): RawActor | null {
  if (!user) return null;
  const avatar = user.avatar_url ? user.avatar_url + (user.avatar_url.includes('?') ? '&' : '?') + 's=' + AVATAR_SIZE : null;
  return { __typename: user.type === 'Bot' ? 'Bot' : 'User', login: user.login, avatarUrl: avatar };
}

function nextPage(link: string | null): string | null {
  const match = link ? /<([^>]+)>;\s*rel="next"/.exec(link) : null;
  return match ? match[1] : null;
}

// restUrl bounds where the token may go: GitHub's next links can point to /repositories/<id>/..., but always to the API.
async function getAllPages<T>(fetchImpl: Fetch, restUrl: string, url: string, token: string): Promise<{ items: T[]; complete: boolean }> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const items: T[] = [];
  let next: string | null = url + '?per_page=' + REST_PAGE_SIZE;
  for (let page = 0; next && page < MAX_REST_PAGES; page += 1) {
    let response: Response;
    try {
      response = await fetchImpl(next, { headers });
    } catch (error) {
      throw new GitHubError('Cannot reach api.github.com: ' + (error as Error).message, 0);
    }
    if (response.status === 401) throw new GitHubError('GitHub rejected the token. Replace it in Settings.', 401);
    if ((response.status === 403 || response.status === 429) && response.headers.get('x-ratelimit-remaining') === '0') {
      throw new GitHubError(token
        ? 'The GitHub API rate limit for your token is used up. Try again later.'
        : 'GitHub allows 60 requests an hour without a token, and they are used up. Add a token in Settings.', response.status);
    }
    if (!response.ok) throw new GitHubError('GitHub API returned HTTP ' + response.status + '.', response.status);
    const body: unknown = await response.json().catch(() => null);
    if (!Array.isArray(body)) throw new GitHubError('GitHub API returned a response that is not a list.', response.status);
    items.push(...(body as T[]));
    // The token goes with every page, so a next link outside the API is not followed (SEC-1).
    next = nextPage(response.headers.get('link'));
    if (next && !next.startsWith(restUrl + '/')) return { items, complete: false };
  }
  return { items, complete: !next };
}

// Every non-empty comment and review summary of a PR, newest first and not cut.
export async function fetchAllComments({ number, repository, token = '', fetchImpl = fetch, restUrl = REST_URL }: AllCommentsOptions): Promise<AllComments> {
  const base = restUrl + '/repos/' + repositoryName(repository);
  const [comments, reviews] = await Promise.all([
    getAllPages<RestComment>(fetchImpl, restUrl, base + '/issues/' + number + '/comments', token),
    getAllPages<RestReview>(fetchImpl, restUrl, base + '/pulls/' + number + '/reviews', token),
  ]);
  const merged = mergeComments(
    comments.items.map((c) => ({ createdAt: c.created_at, body: c.body || '', url: c.html_url, author: restActor(c.user) })),
    reviews.items.map((r) => ({ submittedAt: r.submitted_at, body: r.body || '', url: r.html_url, author: restActor(r.user) })),
  );
  return { comments: merged.map((c) => ({ ...c, truncated: false })), complete: comments.complete && reviews.complete };
}
