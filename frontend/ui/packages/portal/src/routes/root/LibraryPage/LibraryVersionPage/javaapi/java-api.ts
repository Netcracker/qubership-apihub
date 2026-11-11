import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import {
  BREAKING_CHANGE_SEVERITY,
  type ChangeSeverity,
  type ChangesSummary,
  NON_BREAKING_CHANGE_SEVERITY,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { EMPTY_CHANGE_SUMMARY } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'

import { getLibraryJavaClassPath } from '../library-version'

export const JAVA_TYPE_FILTER_SEARCH_PARAM = 'javaType'
export const JAVA_DOCUMENT_SEARCH_PARAM = 'document'
export const JAVA_CLASSES_EMPTY_MESSAGE = 'No Java types'
export const PREVIOUS_LIBRARY_ID_SEARCH_PARAM = 'previousLibraryId'
export const PREVIOUS_VERSION_SEARCH_PARAM = 'previousVersion'

export const JAVA_CHANGE_SEVERITIES: ReadonlySet<ChangeSeverity> = new Set([
  BREAKING_CHANGE_SEVERITY,
  NON_BREAKING_CHANGE_SEVERITY,
])

export type JavaTypeFilterValue = 'CLASS' | 'INTERFACE' | 'ENUM' | 'ANNOTATION'
export type PreviousLibraryVersion = { previousLibraryId?: string; previousVersion?: string }
export type JavaApiDocumentKind = 'report' | 'diff'

export const JAVA_TYPE_FILTER_TITLES: Record<JavaTypeFilterValue, string> = {
  CLASS: 'Classes',
  INTERFACE: 'Interfaces',
  ENUM: 'Enums',
  ANNOTATION: 'Annotation types',
}

export function filterJavaClasses(
  classes: ReadonlyArray<JavaApiClassListItem>,
  searchValue: string,
  javaType: JavaTypeFilterValue | undefined,
): JavaApiClassListItem[] {
  const phrase = searchValue.trim().toLowerCase()
  // people type `Outer.Inner`, the binary name is `org.example.Outer$Inner`
  return classes.filter(({ className, typeKind }) =>
    (!phrase || className.replaceAll('$', '.').toLowerCase().includes(phrase)) &&
    (!javaType || typeKind === javaType),
  )
}

export function getJavaClassPageLink(
  libraryId: string,
  versionId: string,
  className: string,
  kind: JavaApiDocumentKind = 'report',
  previous?: PreviousLibraryVersion,
): { pathname: string; search: string } {
  const query = new URLSearchParams({ [JAVA_DOCUMENT_SEARCH_PARAM]: kind })
  setPreviousLibraryVersion(query, previous)
  return {
    pathname: getLibraryJavaClassPath(libraryId, versionId, className),
    search: `?${query}`,
  }
}

export function getPreviousLibraryVersion(query: URLSearchParams): PreviousLibraryVersion {
  return {
    previousLibraryId: query.get(PREVIOUS_LIBRARY_ID_SEARCH_PARAM) ?? undefined,
    previousVersion: query.get(PREVIOUS_VERSION_SEARCH_PARAM) ?? undefined,
  }
}

export function setPreviousLibraryVersion(query: URLSearchParams, previous?: PreviousLibraryVersion): void {
  if (previous?.previousLibraryId) query.set(PREVIOUS_LIBRARY_ID_SEARCH_PARAM, previous.previousLibraryId)
  if (previous?.previousVersion) query.set(PREVIOUS_VERSION_SEARCH_PARAM, previous.previousVersion)
}

export function toChangesSummary(counts: JavaApiClassListItem['changeCounts']): ChangesSummary {
  return {
    ...EMPTY_CHANGE_SUMMARY,
    [BREAKING_CHANGE_SEVERITY]: counts.breaking,
    [NON_BREAKING_CHANGE_SEVERITY]: counts['non-breaking'],
  }
}

export function sumChangesSummaries(classes: ReadonlyArray<JavaApiClassListItem>): ChangesSummary {
  return classes.reduce<ChangesSummary>((total, { changeCounts }) => ({
    ...total,
    [BREAKING_CHANGE_SEVERITY]: total[BREAKING_CHANGE_SEVERITY] + changeCounts.breaking,
    [NON_BREAKING_CHANGE_SEVERITY]: total[NON_BREAKING_CHANGE_SEVERITY] + changeCounts['non-breaking'],
  }), EMPTY_CHANGE_SUMMARY)
}

export function countJavaTypes(classes: ReadonlyArray<JavaApiClassListItem>): Record<JavaTypeFilterValue, number> {
  return {
    CLASS: classes.filter(({ typeKind }) => typeKind === 'CLASS').length,
    INTERFACE: classes.filter(({ typeKind }) => typeKind === 'INTERFACE').length,
    ENUM: classes.filter(({ typeKind }) => typeKind === 'ENUM').length,
    ANNOTATION: classes.filter(({ typeKind }) => typeKind === 'ANNOTATION').length,
  }
}
