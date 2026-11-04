// Corner cases. Review: approvals, requested changes, dismissed reviews, and pending reviewers.

import { conn, label, requested, review, team, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9400;

export function reviewCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('Ready to merge: approved, checks passed, no conflicts.', {
      title: 'feat(api-linter-service): add rule for missing operationId',
      author: user('chen-li'), createdAt: ago(3), updatedAt: ago(0, 2),
      labels: conn([label('enhancement', 'a2eeef'), label('module:api-linter-service', '0E8A16')]),
      latestOpinionatedReviews: conn([review('APPROVED', 'anna-dev', ago(0, 6))]),
      comments: conn([{ createdAt: ago(0, 2), author: user('anna-dev'), body: 'LGTM, merging after the release branch is cut.' }]),
    }),
    node('One reviewer approved and another requested changes. Requested changes win.', {
      title: 'refactor(backend): move package search into its own service',
      author: user('anna-dev'), createdAt: ago(4), updatedAt: ago(1),
      latestOpinionatedReviews: conn([
        review('APPROVED', 'boris-k', ago(0, 6)),
        review('CHANGES_REQUESTED', 'dara-ops', ago(0, 6)),
      ]),
    }),
    node('The only review was dismissed, so the PR has no approval.', {
      title: 'fix(ui): keep filters when switching package versions',
      author: user('boris-k'), createdAt: ago(2), updatedAt: ago(0, 6),
      latestOpinionatedReviews: conn([review('DISMISSED', 'hana-docs', ago(0, 6))]),
    }),
    node('Approved by two people (✓2), and one more reviewer is still requested (◷1).', {
      title: 'feat(ui): remember the last opened package tab',
      author: user('boris-k'), createdAt: ago(2), updatedAt: ago(0, 3),
      latestOpinionatedReviews: conn([review('APPROVED', 'anna-dev', ago(0, 3)), review('APPROVED', 'emil-qa', ago(1, 2))]),
      reviewRequests: conn([requested('hana-docs')]),
    }),
    node('No approval yet: five reviewers requested, including a team. The gray ◷5 next to the dash counts them.', {
      title: 'refactor(portal-backend): split the version service',
      author: user('anna-dev'), createdAt: ago(4), updatedAt: ago(3),
      reviewRequests: conn([
        requested('boris-k'), requested('chen-li'), requested('dara-ops'), requested('emil-qa'),
        team('widgets-maintainers'),
      ]),
    }),
    node('The approving reviewer deleted their account, so the approval shows ghost. A team request without org access comes back null and is skipped.', {
      title: 'fix(agent): close idle watch connections',
      author: user('farah-ui'), createdAt: ago(5), updatedAt: ago(2),
      latestOpinionatedReviews: conn([review('APPROVED', null, ago(2))]),
      reviewRequests: conn([{ requestedReviewer: null }]),
    }),
    node('Your review again: boris-k, the mock viewer on Refresh, requested changes and is asked again (the sync icon).', {
      title: 'fix(portal-backend): validate package names on import',
      author: user('emil-qa'), createdAt: ago(3), updatedAt: ago(0, 2),
      latestOpinionatedReviews: conn([review('CHANGES_REQUESTED', 'boris-k', ago(1))]),
      reviewRequests: conn([requested('boris-k')]),
    }),
    node('A crowd of reviewers: ten lines, so the Reviewers list shows the first three and +7 more. The mock viewer boris-k is still to review and leads the list.', {
      title: 'feat(portal-backend): publish packages in batches',
      author: user('anna-dev'), createdAt: ago(6), updatedAt: ago(0, 5),
      latestOpinionatedReviews: conn([
        review('APPROVED', 'chen-li', ago(2)), review('APPROVED', 'emil-qa', ago(1)), review('CHANGES_REQUESTED', 'dara-ops', ago(1, 3)),
        review('DISMISSED', 'gleb-be', ago(3)), review('APPROVED', 'a-very-long-github-login-that-keeps-going', ago(0, 8)),
      ]),
      reviewRequests: conn([
        requested('farah-ui'), requested('hana-docs'), requested('boris-k'), requested('new-contributor-42'), team('widgets-backend'),
      ]),
    }),
    node('Your review is requested: boris-k, the mock viewer on Refresh, is the only reviewer.', {
      title: 'fix(ui): show the publish date in the version list',
      author: user('farah-ui'), createdAt: ago(1), updatedAt: ago(0, 4),
      reviewRequests: conn([requested('boris-k')]),
    }),
    node('Approved by everyone asked: three approvals and nobody left to review.', {
      title: 'chore(ci): cache the frontend dependencies',
      author: user('dara-ops'), createdAt: ago(2), updatedAt: ago(0, 1),
      latestOpinionatedReviews: conn([review('APPROVED', 'anna-dev', ago(0, 3)), review('APPROVED', 'boris-k', ago(0, 2)), review('APPROVED', 'gleb-be', ago(0, 1))]),
    }),
    node('No reviews and nobody requested.', {
      title: 'docs(api): describe the export endpoint',
      author: user('gleb-be'), createdAt: ago(1), updatedAt: ago(1),
    }),
  ];
}
