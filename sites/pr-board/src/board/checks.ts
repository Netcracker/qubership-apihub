// Failed checks as the CI popover lists them.

import { CHECKS_PAGE_SIZE } from '../github/query.ts';
import type { FailedCheck } from '../types.ts';

// How many checks of a commit the query reads (DATA-9), for the popover's notes on what was not read.
export const CHECKS_READ = CHECKS_PAGE_SIZE;

// Aggregate jobs that fail whenever anything else fails; listed last so the real cause comes first.
const SUMMARY_CHECKS = new Set(['ci-ok']);

export const CONCLUSION_LABELS: Record<string, string> = {
  failure: 'Failed', timed_out: 'Timed out', startup_failure: 'Did not start', action_required: 'Action required', error: 'Error',
};

interface CheckGroup extends FailedCheck {
  count: number;
  summary: boolean;
}

// The same job can report from several workflows or events; show it once with a count.
export function groupChecks(failed: FailedCheck[]): CheckGroup[] {
  const groups = new Map<string, CheckGroup>();
  for (const c of failed) {
    const key = [c.name, c.workflow, c.conclusion, c.description].join('|');
    const group = groups.get(key) || { ...c, count: 0, summary: SUMMARY_CHECKS.has(c.name) };
    group.count += 1;
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) => Number(a.summary) - Number(b.summary));
}
