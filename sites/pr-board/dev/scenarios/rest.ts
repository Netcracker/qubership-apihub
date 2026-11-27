// The REST answers behind the comments panel.

import { nodes } from '../../src/github/normalize.ts';
import type { RawActor, RestComment, RestReview } from '../../src/github/raw.ts';
import { gadgetsEntries } from '../fixtures/gadgets.ts';
import { DEV_REPOSITORY, GADGETS_REPOSITORY } from '../fixtures/people.ts';
import { MANY_FIRST_NUMBER, manyEntries, mixedEntries } from './entries.ts';

// REST names a GitHub App with its [bot] suffix, where GraphQL leaves it out, as on GitHub.
function restUser(actor: RawActor | null | undefined) {
  if (!actor) return null;
  const bot = actor.__typename === 'Bot';
  return { login: bot ? actor.login + '[bot]' : actor.login, avatar_url: actor.avatarUrl || null, type: bot ? 'Bot' : 'User' };
}

// The REST answers behind the comments panel: every comment and review of a mock PR, or null when it does not exist.
export function restComments(repo: string, number: number, now: number): { comments: RestComment[]; reviews: RestReview[] } | null {
  const name = repo.toLowerCase();
  // The copies of the 300-PR scenario keep the comments of the PR they copy.
  const widgets = () => (number >= MANY_FIRST_NUMBER ? manyEntries(now) : mixedEntries(now));
  const entries = name === DEV_REPOSITORY ? widgets() : name === GADGETS_REPOSITORY ? gadgetsEntries(now) : [];
  const entry = entries.find(({ node }) => node.number === number);
  if (!entry) return null;
  return {
    comments: nodes(entry.node.comments).map((c) => ({ created_at: c.createdAt, body: c.body, html_url: c.url || entry.node.url, user: restUser(c.author) })),
    reviews: nodes(entry.node.reviews).map((r) => ({ submitted_at: r.submittedAt, body: r.body, html_url: r.url || entry.node.url, user: restUser(r.author) })),
  };
}
