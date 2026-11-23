import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import {
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  type ChangeSeverity,
  type ChangesSummary,
  NON_BREAKING_CHANGE_SEVERITY,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

import type { LibraryChangesSummaryDto } from '@portal/entities/libraries'
import { getLibraryJavaClassPath } from '../libraryVersion'

export const JAVA_TYPE_FILTER_SEARCH_PARAM = 'javaType'
export const JAVA_DOCUMENT_SEARCH_PARAM = 'document'
export const JAVA_CLASSES_EMPTY_MESSAGE = 'No Java types'
export const PREVIOUS_LIBRARY_ID_SEARCH_PARAM = 'previousLibraryId'
export const PREVIOUS_VERSION_SEARCH_PARAM = 'previousVersion'

export const JAVA_CHANGE_SEVERITIES: ReadonlySet<ChangeSeverity> = new Set([
  BREAKING_CHANGE_SEVERITY,
  NON_BREAKING_CHANGE_SEVERITY,
  ANNOTATION_CHANGE_SEVERITY,
])

export type JavaTypeFilterValue = 'CLASS' | 'INTERFACE' | 'ENUM' | 'ANNOTATION'
export type PreviousLibraryVersion = { previousLibraryId?: string; previousVersion?: string }
export type JavaApiDocumentKind = 'report' | 'diff'
export type JavaChangesSummary = Pick<
  ChangesSummary,
  typeof BREAKING_CHANGE_SEVERITY | typeof NON_BREAKING_CHANGE_SEVERITY | typeof ANNOTATION_CHANGE_SEVERITY
>

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

export function toChangesSummary(counts: LibraryChangesSummaryDto['changeCounts']): JavaChangesSummary {
  // TODO(libraries-backend): The service leaves out zero counts and mixes change types with severities in
  // changeCounts; default missing severities to 0 until it returns every severity key.
  return {
    [BREAKING_CHANGE_SEVERITY]: counts.breaking ?? 0,
    [NON_BREAKING_CHANGE_SEVERITY]: counts['non-breaking'] ?? 0,
    [ANNOTATION_CHANGE_SEVERITY]: counts.annotation ?? 0,
  }
}

export function countJavaTypes(classes: ReadonlyArray<JavaApiClassListItem>): Record<JavaTypeFilterValue, number> {
  return {
    CLASS: classes.filter(({ typeKind }) => typeKind === 'CLASS').length,
    INTERFACE: classes.filter(({ typeKind }) => typeKind === 'INTERFACE').length,
    ENUM: classes.filter(({ typeKind }) => typeKind === 'ENUM').length,
    ANNOTATION: classes.filter(({ typeKind }) => typeKind === 'ANNOTATION').length,
  }
}
