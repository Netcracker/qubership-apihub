// Corner cases. People: deleted accounts, bots, service accounts, and broken or missing avatars.

import { missingAvatarUrl } from '../../avatars.ts';
import { bot, conn, rollup, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9200;

export function authorCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('author is null: the account was deleted, so the board shows ghost.', {
      title: 'feat(agent): report namespace discovery errors',
      author: null, assignees: conn([]), commits: rollup(null), mergeable: 'UNKNOWN',
      createdAt: ago(6), updatedAt: ago(4),
    }),
    node('A Dependabot PR. GitHub reports bots without the [bot] suffix. Bots are hidden until you select them under Authors.', {
      title: 'chore: deps: bump vite from 7.1.11 to 7.1.12',
      author: bot('dependabot'),
      assignees: conn([]), closingIssuesReferences: conn([]), createdAt: ago(1), updatedAt: ago(1),
    }),
    node('A release service account that GitHub treats as a user. It counts as a bot only when it is in the extra bot logins in Settings.', {
      title: 'chore: bump version to 2026.4.0',
      author: user('acme-release-bot'), assignees: conn([]), closingIssuesReferences: conn([]),
      commits: rollup('PENDING'), createdAt: ago(0, 3), updatedAt: ago(0, 1),
    }),
    node('The avatar URL is broken, so the board shows initials. The assignee has no avatar URL at all.', {
      title: 'docs: fix typo in the local setup guide',
      author: { __typename: 'User', login: 'new-contributor-42', avatarUrl: missingAvatarUrl('new-contributor-42') },
      assignees: conn([{ login: 'a-very-long-github-login-that-keeps-going', avatarUrl: null }]),
      closingIssuesReferences: conn([]), projectsV2: conn([{ title: 'Widgets sprint' }]),
      commits: rollup(null), createdAt: ago(1), updatedAt: ago(1),
    }),
  ];
}
