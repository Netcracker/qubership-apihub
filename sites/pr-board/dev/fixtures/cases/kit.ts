// Shared by the corner case topics: the default PR and the clock.

import type { RawPullRequest } from '../../../src/github/raw.ts';
import { agoFrom, conn, ISSUES_URL, PULLS_URL, rollup, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';

type CornerFields = Partial<RawPullRequest> & Pick<RawPullRequest, 'title' | 'createdAt' | 'updatedAt'>;

export interface CaseKit {
  // A corner case: the default PR overridden by the given fields, with a note the board shows under the title.
  node: (note: string, fields: CornerFields) => FixtureEntry;
  ago: (days: number, hours?: number, minutes?: number) => string;
}

// Each topic numbers its cases from its own block, so adding a case never renumbers another topic.
export function caseKit(now: number, firstNumber: number): CaseKit {
  let number = firstNumber;
  const node = (note: string, fields: CornerFields): FixtureEntry => ({
    note,
    node: {
      number: ++number,
      url: PULLS_URL,
      isDraft: false,
      baseRefName: 'main',
      mergeable: 'MERGEABLE',
      author: user('anna-dev'),
      assignees: conn([user('anna-dev')]),
      closingIssuesReferences: conn([{ title: '[Feat] Example linked issue', url: ISSUES_URL }]),
      projectsV2: conn([]),
      latestOpinionatedReviews: conn([]),
      commits: rollup('SUCCESS'),
      comments: conn([]),
      reviews: conn([]),
      ...fields,
    },
  });
  return { node, ago: agoFrom(now) };
}
