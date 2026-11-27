// Checks shared by the GraphQL normalization and the prs.json parser for the issue type, priority, and sprint values,
// so a value is accepted the same way whichever way it arrives.

import { NAMED_COLORS } from '../types.ts';
import type { NamedColor, Sprint } from '../types.ts';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
// An iteration lasts whole days; a year bounds a value no project would set and keeps date math in range.
const MAX_SPRINT_DAYS = 366;

// GitHub's color names, any case; an unknown one becomes null and shows as a neutral dot.
export function knownColor(color: unknown): NamedColor | null {
  const lower = typeof color === 'string' ? color.toLowerCase() : '';
  return (NAMED_COLORS as readonly string[]).includes(lower) ? lower as NamedColor : null;
}

export function parseNamedColor(value: unknown): { name: string; color: NamedColor | null } | null {
  const entry = value as { name?: unknown; color?: unknown } | null;
  return entry && typeof entry === 'object' && typeof entry.name === 'string' ? { name: entry.name, color: knownColor(entry.color) } : null;
}

export function parseSprint(value: unknown): Sprint | null {
  const entry = value as Partial<Sprint> | null;
  if (!entry || typeof entry !== 'object' || typeof entry.title !== 'string' || !DAY.test(entry.startDate || '')) return null;
  if (!Number.isInteger(entry.duration) || entry.duration! < 1 || entry.duration! > MAX_SPRINT_DAYS) return null;
  return { title: entry.title, startDate: entry.startDate!, duration: entry.duration! };
}
