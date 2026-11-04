// Corner cases. GitHub quirks: null entries inside connections.

import { conn, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9800;

export function quirkCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('GraphQL returned null entries inside connections; they are skipped.', {
      title: 'fix(portal-backend): preserve the requested revision when comparing',
      author: user('anna-dev'), createdAt: ago(1), updatedAt: ago(1),
      assignees: conn([null, { login: 'anna-dev', avatarUrl: user('anna-dev').avatarUrl }]),
      closingIssuesReferences: conn([null]), projectsV2: conn([null, { title: 'Widgets sprint' }]),
      commits: conn([null]),
    }),
  ];
}
