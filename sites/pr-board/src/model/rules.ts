// Attention rules and who counts as a bot.

import type { Actor, PullRequest } from '../types.ts';
import { DEFAULT_AREA_CRITERIA } from './areas.ts';
import type { AreaCriteriaMap } from './areas.ts';
import { SERVICE_ACCOUNT } from '../defaults.ts';

export const STALE_DAYS = 10;

// Attention rules. These are the team defaults; each viewer can change them in Settings.
export interface Rules {
  staleDays: number;
  checkTitle: boolean;
  requireIssue: boolean;
  // Accounts that are bots in practice but are regular GitHub users.
  extraBots: string[];
  // Per-area detection rules, shared in the URL when customized.
  areaCriteria: AreaCriteriaMap;
}

export const DEFAULT_RULES: Rules = {
  staleDays: STALE_DAYS,
  checkTitle: true,
  requireIssue: true,
  extraBots: [],
  areaCriteria: DEFAULT_AREA_CRITERIA,
};

// GitHub logins are case-insensitive.
export function isBot(actor: Actor | null, extraBots: string[] = DEFAULT_RULES.extraBots): boolean {
  if (!actor) return false;
  const login = actor.login.toLowerCase();
  return actor.bot || login === SERVICE_ACCOUNT.toLowerCase() || login.endsWith('[bot]')
    || extraBots.some((bot) => bot.toLowerCase() === login);
}

// Mirrors the defaults of amannn/action-semantic-pull-request, the usual PR title lint.
export const TITLE_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const TITLE_HEADER = /^(\w+)(?:\([^()\r\n]*\))?!?: \S/;

export function titleProblem(title: string): string | null {
  const match = TITLE_HEADER.exec(title);
  if (!match) {
    return 'Title does not follow Conventional Commits: expected "type(scope): subject"';
  }
  if (!TITLE_TYPES.includes(match[1])) {
    return 'Title type "' + match[1] + '" is not allowed. Use one of: ' + TITLE_TYPES.join(', ');
  }
  return null;
}

export function attentionReasons(pr: Pick<PullRequest, 'title' | 'issues' | 'projects'>, ageDays: number, rules: Rules = DEFAULT_RULES): string[] {
  const reasons: string[] = [];
  const problem = rules.checkTitle ? titleProblem(pr.title) : null;
  if (problem) reasons.push(problem);
  if (ageDays > rules.staleDays) {
    reasons.push('Open ' + ageDays + ' days, limit is ' + rules.staleDays);
  }
  if (rules.requireIssue && !pr.issues.length) {
    if (pr.projects === null) {
      reasons.push('No linked issue; project membership could not be checked');
    } else if (!pr.projects.length) {
      reasons.push('No linked issue and not in a GitHub Project');
    }
  }
  return reasons;
}
