import { useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { useInvalidateLibraryChanges } from './useLibraryChanges'
import { useInvalidateLibraryClasses } from './useLibraryClasses'
import { LIBRARY_CLASS_CHANGES_QUERY_KEY, LIBRARY_CLASS_QUERY_KEY } from './useLibraryJavaClass'

type InvalidateLibraryJavaApi = (libraryId: Key) => Promise<void>

export function useInvalidateLibraryJavaApi(): InvalidateLibraryJavaApi {
  const queryClient = useQueryClient()
  const invalidateLibraryChanges = useInvalidateLibraryChanges()
  const invalidateLibraryClasses = useInvalidateLibraryClasses()
  return async libraryId => {
    const queryKeys = [
      [LIBRARY_CLASS_QUERY_KEY, libraryId],
      [LIBRARY_CLASS_CHANGES_QUERY_KEY, libraryId],
    ]
    // Remove inactive entries first: refetchOnMount is off, so a cache that only went stale would be shown again
    queryKeys.forEach(queryKey => queryClient.removeQueries({ queryKey: queryKey, type: 'inactive' }))
    await Promise.all(queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey })))
    await invalidateLibraryChanges(libraryId)
    await invalidateLibraryClasses(libraryId)
  }
}
