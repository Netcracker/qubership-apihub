// What a live load is doing, repository by repository, in words for the loading status (DATA-27).

import type { RepositoryProgress } from '../github/graphql.ts';
import { MINUTE_MS, plural } from './format.ts';

// How long the summary of a finished live load stays on screen (DATA-27).
export const LOAD_SUMMARY_MS = 5000;
const SECOND_MS = 1000;
const TENTH_MS = 100;

export interface RepoProgress {
  repo: string;
  status: 'waiting' | RepositoryProgress['status'];
  read: number;
  // Null until GitHub has answered the first page.
  total: number | null;
  // The last thing worth telling, such as a retry after a timeout.
  note: string;
}

// A live load in progress, or the one that just finished (DATA-27).
export interface LoadState {
  startedAt: number;
  repos: RepoProgress[];
  // Tells this load from the next one, so late events of an old load are dropped.
  id: number;
  // Set once the data is in.
  finished?: { at: number; prs: number; repos: number };
}

export function startProgress(repos: string[]): RepoProgress[] {
  return repos.map((repo) => ({ repo, status: 'waiting', read: 0, total: null, note: '' }));
}

// Merges one event in. The repositories keep their order; an unknown one is ignored.
export function applyProgress(progress: RepoProgress[], event: RepositoryProgress): RepoProgress[] {
  const key = event.repo.toLowerCase();
  if (!progress.some((p) => p.repo.toLowerCase() === key)) return progress;
  return progress.map((p) => (p.repo.toLowerCase() === key
    ? { ...p, status: event.status, read: event.read, total: event.total, note: event.note ?? p.note } : p));
}

function repoLine(p: RepoProgress): string {
  const count = p.total === null ? 'starting' : p.read + ' of ' + plural(p.total, 'pull request');
  return p.repo + ': ' + count + (p.note ? '. ' + p.note : '');
}

export function describeProgress(progress: RepoProgress[]): { headline: string; lines: { repo: string; text: string }[] } {
  if (progress.every((p) => p.status === 'waiting')) return { headline: 'Connecting to GitHub', lines: [] };
  if (progress.length === 1) return { headline: 'Reading ' + repoLine(progress[0]), lines: [] };
  const done = progress.filter((p) => p.status === 'done' || p.status === 'unreadable').length;
  const read = progress.reduce((sum, p) => sum + p.read, 0);
  return {
    headline: 'Reading repositories: ' + done + ' of ' + progress.length + ' done, ' + plural(read, 'pull request') + ' so far',
    lines: progress.filter((p) => p.status === 'reading').map((p) => ({ repo: p.repo, text: repoLine(p) })),
  };
}

export function describeFinished(prs: number, repos: number): string {
  return 'Loaded ' + plural(prs, 'pull request') + (repos > 1 ? ' from ' + repos + ' repositories' : '');
}

// Tenths of a second for the first minute, whole seconds after it.
export function formatElapsed(ms: number): string {
  if (ms < MINUTE_MS) return (Math.floor(ms / TENTH_MS) / 10).toFixed(1) + ' s';
  const seconds = Math.floor(ms / SECOND_MS);
  const perMinute = MINUTE_MS / SECOND_MS;
  return Math.floor(seconds / perMinute) + ' min ' + (seconds % perMinute) + ' s';
}
