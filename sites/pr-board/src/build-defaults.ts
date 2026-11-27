import { BOTS_VARIABLE, parseBuildBots } from './board/bots.ts';
import { parseGroupLines } from './board/groups.ts';
import type { RepoGroup } from './board/groups.ts';
import { OFFICIAL_REPO_GROUPS } from './defaults.ts';

export const GROUPS_VARIABLE = 'PR_BOARD_GROUPS';

export interface BuildDefaults {
  groups: RepoGroup[];
  bots: string[];
}

export function parseBuildGroups(text: string): RepoGroup[] {
  const result = parseGroupLines(text);
  if ('error' in result) throw new Error(GROUPS_VARIABLE + ': ' + result.error);
  return result.groups;
}

// An absent variable inherits the official defaults. An empty variable deliberately clears its list.
export function resolveBuildDefaults(env: Record<string, string | undefined>, mock = false): BuildDefaults {
  if (mock) return { groups: [], bots: [] };
  return {
    groups: env[GROUPS_VARIABLE] === undefined ? OFFICIAL_REPO_GROUPS : parseBuildGroups(env[GROUPS_VARIABLE]),
    bots: parseBuildBots(env[BOTS_VARIABLE] ?? ''),
  };
}
