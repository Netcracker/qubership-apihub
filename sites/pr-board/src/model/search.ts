// GitHub-style search over derived PRs, and toggling label filters in the query.

import type { AreaId, DerivedPullRequest } from '../types.ts';

// GitHub-style search: free words plus qualifiers such as label:bug, author:anna-dev, -is:draft, label:"good first issue".
const QUERY_TOKEN = /(-?)(?:([a-z]+):)?(?:"([^"]*)"?|(\S+))/gi;

// Values arrive lowercased. People match part of a login; labels, repositories, and priorities match the whole name,
// as on GitHub, so label:bug never matches "debug".
const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle);
const anyIncludes = (list: string[], needle: string) => list.some((item) => includes(item, needle));
const equals = (name: string, value: string) => name.toLowerCase() === value;
// A sprint matches by a whole word of its title, so sprint:42 finds "Sprint 42" but not "Sprint 142".
const hasWord = (title: string, value: string) => title.toLowerCase().split(/[^a-z0-9]+/).includes(value) || equals(title, value);

export interface SearchQualifier {
  hint: string;
  test: (pr: DerivedPullRequest, value: string) => boolean;
}

export const SEARCH_QUALIFIERS: Record<string, SearchQualifier> = {
  author: { hint: 'author:anna-dev', test: (pr, v) => includes(pr.authorKey, v) },
  assignee: {
    hint: 'assignee:boris-k',
    test: (pr, v) => (v === 'none' ? !pr.assignees.length : anyIncludes(pr.assignees.map((a) => a.login), v)),
  },
  reviewer: {
    hint: 'reviewer:chen-li (reviewed or requested)',
    test: (pr, v) => anyIncludes([...pr.reviewers, ...pr.requestedReviewers].map((r) => r.login), v),
  },
  label: {
    hint: 'label:bug, label:"module:ui"',
    test: (pr, v) => (v === 'none' ? !pr.labels.length : pr.labels.some((l) => equals(l.name, v))),
  },
  base: { hint: 'base:develop', test: (pr, v) => includes(pr.base, v) },
  repo: { hint: 'repo:widgets, repo:acme/widgets', test: (pr, v) => equals(pr.repo, v) || equals(pr.repo.slice(pr.repo.indexOf('/') + 1), v) },
  priority: {
    hint: 'priority:high, priority:none (from GitHub Projects)',
    test: (pr, v) => (v === 'none' ? !pr.issues.some((i) => i.priority) : pr.issues.some((i) => !!i.priority && equals(i.priority.name, v))),
  },
  sprint: {
    hint: 'sprint:current, sprint:42, sprint:none',
    test: (pr, v) => (v === 'current' ? pr.inCurrentSprint : v === 'none' ? !pr.issues.some((i) => i.sprint)
      : pr.issues.some((i) => !!i.sprint && hasWord(i.sprint.title, v))),
  },
  note: { hint: 'note:tests (your notes)', test: (pr, v) => !!pr.noteText && pr.noteText.includes(v) },
  area: { hint: 'area:be, area:ui, area:other', test: (pr, v) => (v === 'other' ? !pr.areas.length : pr.areas.includes((v === 'ui' ? 'fe' : v) as AreaId)) },
  ci: { hint: 'ci:failing, ci:running, ci:passing, ci:none', test: (pr, v) => pr.ci.startsWith(v) },
  review: {
    hint: 'review:approved, review:changes, review:none, review:requested (you), review:again',
    test: (pr, v) => (v === 'requested' ? pr.myReview !== null : v === 'again' ? pr.myReview === 'again' : pr.review.startsWith(v)),
  },
  is: {
    hint: 'is:draft, is:ready, is:bot, is:conflict, is:stale, is:attention',
    test: (pr, v) => ({
      draft: pr.draft,
      ready: !pr.draft,
      bot: pr.bot,
      conflict: pr.mergeable === 'conflicts',
      conflicts: pr.mergeable === 'conflicts',
      stale: pr.stale,
      attention: pr.attention.length > 0,
    } as Record<string, boolean>)[v] === true,
  },
  no: {
    hint: 'no:issue, no:label, no:assignee, no:review',
    test: (pr, v) => ({
      issue: !pr.issues.length,
      label: !pr.labels.length,
      assignee: !pr.assignees.length,
      review: !pr.reviewers.length,
    } as Record<string, boolean>)[v] === true,
  },
};

export interface QueryFilter {
  key: string;
  value: string;
  negate: boolean;
}

export interface QueryWord {
  value: string;
  negate: boolean;
}

export interface ParsedQuery {
  filters: QueryFilter[];
  words: QueryWord[];
}

export function parseQuery(query: string): ParsedQuery {
  const filters: QueryFilter[] = [];
  const words: QueryWord[] = [];
  for (const match of query.matchAll(QUERY_TOKEN)) {
    const [, minus, rawKey, quoted, bare] = match;
    const value = (quoted !== undefined ? quoted : bare || '').toLowerCase();
    const key = rawKey ? rawKey.toLowerCase() : null;
    const negate = minus === '-';
    if (key && SEARCH_QUALIFIERS[key]) {
      if (value) filters.push({ key, value, negate });
    } else if (!key && value.endsWith(':') && SEARCH_QUALIFIERS[value.slice(0, -1)]) {
      // A qualifier still being typed, such as "label:", filters nothing yet.
    } else {
      const word = ((key ? key + ':' : '') + value).trim();
      if (word) words.push({ value: word, negate });
    }
  }
  return { filters, words };
}

export function matchesQuery(pr: DerivedPullRequest, parsed: ParsedQuery): boolean {
  for (const word of parsed.words) {
    if (pr.searchText.includes(word.value) === word.negate) return false;
  }
  for (const filter of parsed.filters) {
    if (SEARCH_QUALIFIERS[filter.key].test(pr, filter.value) === filter.negate) return false;
  }
  return true;
}

// Adds label:<name> to the query, or removes every positive filter for that label (any case or quoting).
export function toggleLabelFilter(query: string, name: string): string {
  const target = name.toLowerCase();
  const kept: string[] = [];
  let removed = false;
  for (const match of query.matchAll(QUERY_TOKEN)) {
    const [token, minus, key, quoted, bare] = match;
    const value = (quoted !== undefined ? quoted : bare || '').toLowerCase();
    if (minus !== '-' && key && key.toLowerCase() === 'label' && value === target) removed = true;
    else kept.push(token);
  }
  if (removed) return kept.join(' ');
  const token = /[\s"]/.test(name) ? 'label:"' + name.replace(/"/g, '') + '"' : 'label:' + name;
  return (query.trim() + ' ' + token).trim();
}

// Labels the query asks for (label:<name> without a minus), lowercased, so chips of those labels show as active.
export function activeLabelFilters(query: ParsedQuery): Set<string> {
  return new Set(query.filters.filter((f) => f.key === 'label' && !f.negate).map((f) => f.value));
}
