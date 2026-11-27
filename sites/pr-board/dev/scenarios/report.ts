// What /prs.json returns on page load.

import { normalizePullRequest } from '../../src/github/normalize.ts';
import type { Report } from '../../src/types.ts';
import { cornerCaseNodes } from '../fixtures/corner-cases.ts';
import { DAY_MS } from '../fixtures/builders.ts';
import type { FixtureEntry } from '../fixtures/builders.ts';
import { gadgetsEntries } from '../fixtures/gadgets.ts';
import { DEV_REPOSITORY, GADGETS_REPOSITORY } from '../fixtures/people.ts';
import { typicalNodes } from '../fixtures/typical.ts';
import { MANY_PRS, manyEntries, mixedEntries } from './entries.ts';
import type { MockResponse, ReportScenario } from './types.ts';


const STALE_SNAPSHOT_DAYS = 3;
const SLOW_REPORT_MS = 3000;

function report(entries: FixtureEntry[], { now, warnings = [], projectsAvailable = true, generatedAt = now, gadgets = false }: {
  now: number;
  warnings?: string[];
  projectsAvailable?: boolean;
  generatedAt?: number;
  // Adds the second mock repository.
  gadgets?: boolean;
}): Report {
  const normalize = (repo: string) => ({ node, note }: FixtureEntry) => {
    const pr = normalizePullRequest(node, { repo, projectsAvailable });
    return note ? { ...pr, example: true, exampleNote: note } : pr;
  };
  return {
    repos: gadgets ? [DEV_REPOSITORY, GADGETS_REPOSITORY] : [DEV_REPOSITORY],
    generatedAt: new Date(generatedAt).toISOString(),
    runUrl: null,
    warnings,
    prs: [...entries.map(normalize(DEV_REPOSITORY)), ...(gadgets ? gadgetsEntries(now).map(normalize(GADGETS_REPOSITORY)) : [])],
  };
}

const json = (body: unknown, extra: { delayMs?: number } = {}): MockResponse => ({ status: 200, body: JSON.stringify(body), ...extra });

export const REPORT_SCENARIOS: ReportScenario[] = [
  { id: 'mixed', label: 'Typical board + corner cases', respond: (now) => json(report(mixedEntries(now), { now })) },
  { id: 'typical', label: 'Typical board only', respond: (now) => json(report(typicalNodes(now), { now })) },
  { id: 'corner', label: 'Corner cases only', respond: (now) => json(report(cornerCaseNodes(now), { now })) },
  { id: 'two-repos', label: 'Two repositories', respond: (now) => json(report(typicalNodes(now), { now, gadgets: true })) },
  { id: 'empty', label: 'No open PRs', respond: (now) => json(report([], { now })) },
  { id: 'many', label: MANY_PRS + ' PRs', respond: (now) => json(report(manyEntries(now), { now })) },
  {
    id: 'projects-unavailable',
    label: 'Project data unavailable',
    respond: (now) => json(report(typicalNodes(now), {
      now,
      projectsAvailable: false,
      warnings: ['Project membership is unavailable for this token: Resource not accessible by integration'],
    })),
  },
  {
    id: 'stale',
    label: 'Snapshot ' + STALE_SNAPSHOT_DAYS + ' days old',
    respond: (now) => json(report(mixedEntries(now), { now, generatedAt: now - STALE_SNAPSHOT_DAYS * DAY_MS })),
  },
  { id: 'slow', label: 'Slow load (3 s)', respond: (now) => json(report(mixedEntries(now), { now }), { delayMs: SLOW_REPORT_MS }) },
  { id: 'missing', label: 'prs.json missing (404)', respond: () => ({ status: 404, body: 'Not found' }) },
  { id: 'broken', label: 'prs.json is not valid JSON', respond: () => ({ status: 200, body: '{"repo": "' + DEV_REPOSITORY + '", "prs": [' }) },
  { id: 'wrong-shape', label: 'prs.json without a PR list', respond: () => json({ repo: DEV_REPOSITORY }) },
];
