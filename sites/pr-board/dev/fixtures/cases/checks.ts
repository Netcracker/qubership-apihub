// Corner cases. CI: running checks, every kind of failure, and missing or partial check details.

import { checks, conn, rollup, run, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9300;

export function checkCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('Opened minutes ago, checks still running, no comments. In a sprint without an issue, which is allowed.', {
      title: 'chore: tidy CODEOWNERS for the agent package',
      author: user('anna-dev'), assignees: conn([]), closingIssuesReferences: conn([]),
      projectsV2: conn([{ title: 'Widgets sprint' }]), commits: rollup('EXPECTED'),
      createdAt: ago(0, 0, 12), updatedAt: ago(0, 0, 12),
    }),
    node('Failed checks: every kind of failure, a duplicate job from two workflows, and a cancelled run that is ignored.', {
      title: 'feat(ui): new package overview layout',
      author: user('emil-qa'), createdAt: ago(2), updatedAt: ago(0, 2),
      commits: rollup('FAILURE', checks([
        run('ci-ok', 'FAILURE', 'CI'),
        run('e2e / e2e', 'FAILURE', 'CI'),
        run('screenshot-tests (apispec-view)', 'FAILURE', 'Frontend'),
        run('screenshot-tests (apispec-view)', 'FAILURE', 'Frontend'),
        run('run-lint', 'FAILURE', 'Lint'),
        run('run-lint', 'FAILURE', 'Super-Linter'),
        run('deploy-preview', 'STARTUP_FAILURE', 'Preview'),
        run('CLAAssistant', 'ACTION_REQUIRED', null),
        run('storybooks (ui, ui-shared, ui-shared,ui-portal,ui-agents, frontend/ui/dist-showcase)', 'FAILURE', 'Frontend'),
        run('unit (api-diff)', 'CANCELLED', 'Frontend'),
        run('unit (ui)', 'SUCCESS', 'Frontend'),
      ], { totalCount: 72 })),
    }),
    node('CI is failing, but no failed check is in the first 100 of 140 that were read.', {
      title: 'chore(ci): split the e2e matrix by module',
      author: user('anna-dev'), createdAt: ago(1), updatedAt: ago(0, 4),
      commits: rollup('FAILURE', checks(Array.from({ length: 100 }, (_, i) => run('matrix-' + (i + 1), 'SUCCESS')), { totalCount: 140, hasNextPage: true })),
    }),
    node('CI is failing, but check details were not collected (older prs.json or a token without access).', {
      title: 'fix(agent): handle empty namespace list',
      author: user('dara-ops'), createdAt: ago(2), updatedAt: ago(1),
      commits: rollup('FAILURE'),
    }),
  ];
}
