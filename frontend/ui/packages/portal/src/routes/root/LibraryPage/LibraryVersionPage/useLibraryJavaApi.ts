import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { JavaApiClassListBuilder, type JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import type { LibraryJavaApiDocumentDto } from '@portal/entities/libraries'
import { toJavaApiDocument, toReportRows } from './javaapi/libraryClassDocument'
import { useInvalidateLibraryChanges } from './useLibraryChanges'
import { useInvalidateLibraryClasses, useLibraryClasses } from './useLibraryClasses'
import {
  LIBRARY_CLASS_CHANGES_QUERY_KEY,
  LIBRARY_CLASS_QUERY_KEY,
  LIBRARY_NESTED_CLASSES_QUERY_KEY,
} from './useLibraryJavaClass'

type LibraryJavaApiData = {
  document: LibraryJavaApiDocumentDto
  classes: ReadonlyArray<JavaApiClassListItem>
}

type LibraryJavaApiResult = {
  data: LibraryJavaApiData | null | undefined
  isLoading: boolean
  error: Error | null
}

type InvalidateLibraryJavaApi = (libraryId: Key) => Promise<void>

// TODO(libraries-backend): The class list has no member counts; a class's members load with its details.
export function useLibraryJavaApiReport(
  libraryId: Key | undefined,
  version: string | undefined,
): LibraryJavaApiResult {
  const { data: classes, isLoading, error } = useLibraryClasses(libraryId, version)
  const result = useMemo(() => {
    if (!classes) return undefined
    if (!classes.length) return null
    const document = toJavaApiDocument(toReportRows(classes, []))
    return { document: document, classes: new JavaApiClassListBuilder({ source: document }).build() }
  }, [classes])
  return { data: isLoading ? undefined : result, isLoading: isLoading, error: error }
}

export function useInvalidateLibraryJavaApi(): InvalidateLibraryJavaApi {
  const queryClient = useQueryClient()
  const invalidateLibraryChanges = useInvalidateLibraryChanges()
  const invalidateLibraryClasses = useInvalidateLibraryClasses()
  return async libraryId => {
    const queryKeys = [
      [LIBRARY_CLASS_QUERY_KEY, libraryId],
      [LIBRARY_CLASS_CHANGES_QUERY_KEY, libraryId],
      [LIBRARY_NESTED_CLASSES_QUERY_KEY, libraryId],
    ]
    // Remove inactive entries first: refetchOnMount is off, so a cache that only went stale would be shown again
    queryKeys.forEach(queryKey => queryClient.removeQueries({ queryKey: queryKey, type: 'inactive' }))
    await Promise.all(queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey })))
    await invalidateLibraryChanges(libraryId)
    await invalidateLibraryClasses(libraryId)
  }
}
