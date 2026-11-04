// Text the board shows: counts, ages, relative times, logins, and label text colors.

import type { Actor } from '../types.ts';

// Relative luminance above which a label background needs dark text.
const LIGHT_LABEL_LUMINANCE = 0.45;

// Also the unit of the live load interval (SET-22).
export const MINUTE_MS = 60 * 1000;

// The header names up to this many repositories, then "+N more" (TABLE-27).
export const HEADER_REPOSITORIES = 2;

const nameOf = (repo: string) => repo.slice(repo.indexOf('/') + 1);

// The repository name alone, or owner/name when another repository on the board has the same name.
export function repositoryLabel(repo: string, repos: string[]): string {
  const name = nameOf(repo).toLowerCase();
  const clash = repos.some((other) => other.toLowerCase() !== repo.toLowerCase() && nameOf(other).toLowerCase() === name);
  return clash ? repo : nameOf(repo);
}

// The repositories named in the header: one or two in full, more as the first one and a count.
export function repositoriesSummary(repos: string[]): string {
  if (repos.length <= HEADER_REPOSITORIES) return repos.join(', ');
  return repos[0] + ' +' + (repos.length - 1) + ' more';
}

export function plural(n: number, word: string): string {
  return n + ' ' + word + (n === 1 ? '' : 's');
}
export function formatAge(days: number): string {
  return days === 0 ? 'today' : plural(days, 'day');
}
export function formatAgo(iso: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(iso)) / MINUTE_MS);
  if (minutes < 60) return minutes <= 1 ? 'just now' : minutes + ' min ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, 'hour') + ' ago';
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : days + ' days ago';
}
export function displayLogin(actor: Actor): string {
  return actor.login.replace(/\[bot\]$/, '');
}
export function initials(login: string): string {
  const name = login.replace(/\[bot\]$/, '');
  const parts = name.split(/[-_.\s]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export function labelTextColor(hex: string): string {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > LIGHT_LABEL_LUMINANCE ? 'var(--label-ink-dark)' : 'var(--label-ink-light)';
}
