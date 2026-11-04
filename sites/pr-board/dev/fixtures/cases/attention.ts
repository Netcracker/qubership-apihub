// Corner cases. Attention: the age limit and PRs with several problems at once.

import { STALE_DAYS } from '../../../src/model/rules.ts';
import { checks, conn, review, rollup, run, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9700;

export function attentionCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('Every problem at once: an old draft with conflicts, requested changes, failing CI, no issue and no project.', {
      title: 'feat(portal): experimental GraphQL schema diff',
      author: user('farah-ui'), isDraft: true, mergeable: 'CONFLICTING',
      commits: rollup('FAILURE', checks([
        run('run-lint', 'FAILURE', 'Lint'),
        run('go (portal-backend)', 'FAILURE', 'Backend'),
        run('ci-ok', 'FAILURE', 'CI'),
        run('build', 'SUCCESS', 'CI'),
        { __typename: 'StatusContext' as const, context: 'SonarCloud Code Analysis', state: 'ERROR', targetUrl: 'https://sonarcloud.io', description: 'Quality gate failed: 3 new bugs' },
      ])),
      latestOpinionatedReviews: conn([review('CHANGES_REQUESTED', 'chen-li', ago(0, 6))]),
      closingIssuesReferences: conn([]),
      createdAt: ago(214), updatedAt: ago(160),
      comments: conn([{ createdAt: ago(160), author: user('chen-li'), body: 'Please split this into the parser change and the UI change.' }]),
    }),
    // The default age limit, so the two cases follow it if it changes (RULE-7).
    node('Open exactly ' + STALE_DAYS + ' days: still within the limit.', {
      title: 'fix(builder): keep operation order stable across rebuilds',
      author: user('emil-qa'), createdAt: ago(STALE_DAYS, 2), updatedAt: ago(2),
    }),
    node('Open ' + (STALE_DAYS + 1) + ' days: one day over the limit.', {
      title: 'fix(builder): normalize trailing slashes in server URLs',
      author: user('emil-qa'), createdAt: ago(STALE_DAYS + 1, 2), updatedAt: ago(2),
    }),
    node('Three problems at once: the icon shows a counter.', {
      title: 'WIP export',
      author: user('farah-ui'), closingIssuesReferences: conn([]), createdAt: ago(25), updatedAt: ago(20),
    }),
  ];
}
