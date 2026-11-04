// BE and FE areas: which labels, title scopes, tags, and paths put a PR in each.

import type { AreaId, PullRequest } from '../types.ts';

export interface Area {
  id: AreaId;
  label: string;
  modules: string[];
}

// Module labels follow the monorepo layout: module:<dir> for each dir under frontend/ or backend/.
// ui-tests live under tests/ but cover the UI, so they count as frontend.
export const AREAS: Area[] = [
  {
    id: 'be',
    label: 'BE',
    modules: ['agent', 'agents-backend', 'api-linter-service', 'commons-go', 'java-task-consumer', 'libraries-backend',
      'portal-backend', 'test-service'],
  },
  {
    id: 'fe',
    label: 'UI',
    modules: ['api-diff', 'api-doc-viewer', 'api-processor', 'api-unifier', 'api-visitor', 'apispec-view',
      'build-task-consumer', 'class-view', 'compatibility-suites', 'ddlapi', 'graphapi', 'http-spec', 'json-crawl',
      'rest-playground', 'ui', 'ui-tests'],
  },
];

export const DEFAULT_AREA_MODULES: Record<AreaId, string[]> = { be: AREAS[0].modules, fe: AREAS[1].modules };

export interface AreaCriteria {
  labels: string[];
  scopes: string[];
  tags: string[];
  directories: string[];
  repositories: string[];
}

export type AreaCriteriaMap = Record<AreaId, AreaCriteria>;
export const CRITERIA_FIELDS = ['labels', 'scopes', 'tags', 'directories', 'repositories'] as const;

export const DEFAULT_AREA_CRITERIA: AreaCriteriaMap = {
  be: {
    labels: DEFAULT_AREA_MODULES.be, scopes: DEFAULT_AREA_MODULES.be, tags: ['BE'], directories: ['backend'],
    repositories: ['Netcracker/qubership-apihub-backend', 'Netcracker/qubership-api-linter-service',
      'Netcracker/qubership-apihub-agents-backend', 'Netcracker/qubership-apihub-sniffer-agent',
      'Netcracker/qubership-apihub-traffic-analyzer'],
  },
  fe: {
    labels: DEFAULT_AREA_MODULES.fe, scopes: DEFAULT_AREA_MODULES.fe, tags: ['FE', 'UI'], directories: ['frontend'],
    repositories: ['Netcracker/qubership-apihub-ui', 'Netcracker/qubership-apihub-api-diff',
      'Netcracker/qubership-apihub-api-doc-viewer', 'Netcracker/qubership-apihub-api-unifier',
      'Netcracker/qubership-apihub-api-processor', 'Netcracker/qubership-apihub-compatibility-suites',
      'Netcracker/qubership-apihub-vscode'],
  },
};

for (const { id } of AREAS) {
  for (const field of CRITERIA_FIELDS) DEFAULT_AREA_CRITERIA[id][field] = normalizeList(DEFAULT_AREA_CRITERIA[id][field]);
}

function normalizeList(list: string[]): string[] {
  return [...new Set(list.map((entry) => entry.trim().toLowerCase()).filter(Boolean))].sort();
}

// Missing fields inherit official criteria; an explicit empty list disables that signal.
export function parseAreaCriteria(value: unknown): AreaCriteriaMap {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const result = structuredClone(DEFAULT_AREA_CRITERIA);
  for (const { id } of AREAS) {
    const area = input[id];
    if (!area || typeof area !== 'object') continue;
    for (const field of CRITERIA_FIELDS) {
      const list = (area as Record<string, unknown>)[field];
      if (!Array.isArray(list) || list.length > 100 || !list.every((entry) => typeof entry === 'string' && entry.length <= 200)) continue;
      result[id][field] = normalizeList(list);
    }
  }
  return result;
}

export function areaCriteriaQuery(criteria: AreaCriteriaMap): string {
  const current = parseAreaCriteria(criteria);
  const defaults = parseAreaCriteria(DEFAULT_AREA_CRITERIA);
  const overrides: Record<string, Partial<AreaCriteria>> = {};
  for (const { id } of AREAS) {
    for (const field of CRITERIA_FIELDS) {
      if (JSON.stringify(current[id][field]) === JSON.stringify(defaults[id][field])) continue;
      (overrides[id] ??= {})[field] = current[id][field];
    }
  }
  return Object.keys(overrides).length ? JSON.stringify(overrides) : '';
}

// The scope of a Conventional Commits title, such as api-doc-viewer in fix(api-doc-viewer): ...
const TITLE_SCOPE = /^\w+\(([^()]+)\)!?:/;

const MODULE_PREFIX = 'module:';

export function areasOf(pr: Pick<PullRequest, 'title' | 'labels' | 'issues'> & Partial<Pick<PullRequest, 'repo'>>,
  criteria: AreaCriteriaMap = DEFAULT_AREA_CRITERIA): AreaId[] {
  // A module:ui label matches both "module:ui" and "ui" in the lists; a plain label matches only its own name.
  const names = pr.labels.map((l) => l.name.toLowerCase())
    .flatMap((name) => (name.startsWith(MODULE_PREFIX) ? [name, name.slice(MODULE_PREFIX.length)] : [name]));
  const scope = TITLE_SCOPE.exec(pr.title);
  const scopes = scope ? scope[1].toLowerCase().split(',').map((m) => m.trim()) : [];
  const texts = [pr.title, ...pr.issues.map((i) => i.title)];
  return AREAS.filter((area) => {
    const configured = criteria[area.id];
    const labels = configured.labels.map((name) => name.toLowerCase());
    const wantedScopes = configured.scopes.map((name) => name.toLowerCase());
    const tags = configured.tags.map((tag) => '[' + tag.replace(/^\[|\]$/g, '').toLowerCase() + ']');
    const directories = configured.directories.map((dir) => dir.replace(/^\/+|\/+$/g, '').toLowerCase());
    const pathMatches = texts.some((text) => text.toLowerCase().split(/\s+/).some((word) =>
      directories.some((dir) => word.replace(/^\//, '') === dir || word.replace(/^\//, '').startsWith(dir + '/'))));
    return names.some((name) => labels.includes(name)) || scopes.some((name) => wantedScopes.includes(name))
      || texts.some((text) => tags.some((tag) => text.toLowerCase().includes(tag))) || pathMatches
      || configured.repositories.some((repo) => repo.toLowerCase() === pr.repo?.toLowerCase());
  }).map((area) => area.id);
}
