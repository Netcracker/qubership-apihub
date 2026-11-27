// How the board shows CI, review, and conflict states: short codes, labels, tones, and sort ranks.

import type { CiState, MergeState, ReviewState } from '../types.ts';

// The reviewer state that stands behind each review code; the pill counts these reviewers.
export const DECISION_BY_REVIEW: Record<ReviewState, string | null> = {
  approved: 'APPROVED', changes_requested: 'CHANGES_REQUESTED', none: null,
};
export const REVIEW_SECTIONS = [
  { state: 'APPROVED', title: 'Approved by' },
  { state: 'CHANGES_REQUESTED', title: 'Changes requested by' },
  { state: 'DISMISSED', title: 'Dismissed reviews' },
];

export interface StateInfo {
  short: string;
  label: string;
  tone: string;
  rank: number;
  hint?: string;
}

// Cells show the short code; the full label is in the tooltip, the accessible name, and the legend.
export const CI: Record<CiState, StateInfo> = {
  failing: { short: 'F', label: 'Failing', tone: 'bad', rank: 0, hint: 'At least one check failed' },
  running: { short: 'R', label: 'Running', tone: 'warn running', rank: 1, hint: 'Checks are still running' },
  none: { short: '—', label: 'No checks', tone: 'idle', rank: 2, hint: 'No checks reported for the last commit' },
  passing: { short: 'P', label: 'Passing', tone: 'good', rank: 3, hint: 'All checks passed' },
};
export const REVIEW: Record<ReviewState, StateInfo> = {
  changes_requested: { short: 'CR', label: 'Changes requested', tone: 'bad', rank: 0 },
  none: { short: '—', label: 'No approval', tone: 'idle', rank: 1 },
  approved: { short: '✓', label: 'Approved', tone: 'good', rank: 2 },
};
export const MERGE: Record<MergeState, StateInfo> = {
  conflicts: { short: 'C', label: 'Conflicts', tone: 'bad', rank: 0, hint: 'Rebase or merge the target branch' },
  unknown: { short: '?', label: 'Checking', tone: 'idle', rank: 1, hint: 'GitHub has not computed mergeability yet' },
  clean: { short: 'OK', label: 'No conflicts', tone: 'good', rank: 2, hint: 'Merges cleanly into the target branch' },
};
export const LEGEND: [string, Record<string, StateInfo>][] = [['CI', CI], ['Review', REVIEW], ['Conflicts', MERGE]];
