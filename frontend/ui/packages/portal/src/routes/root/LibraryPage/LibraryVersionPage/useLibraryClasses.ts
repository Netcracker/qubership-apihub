import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import type { LibraryClassDto, LibraryClassesDto } from '@portal/entities/libraries'
import { useAutoFetchInfinitePages } from '@portal/routes/root/PortalPage/VersionPage/useAutoFetchInfinitePages'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { LIBRARIES_API_BASE_PATH } from '@portal/utils/requests'

const CLASSES_QUERY_KEY = 'library-classes'
const PAGE_SIZE = 100

type LibraryClassesResult = {
  data: readonly LibraryClassDto[] | undefined
  isLoading: boolean
  error: Error | null
}

type InvalidateLibraryClasses = (libraryId: Key) => Promise<void>

// TODO(libraries-backend): The service has no class count, so the UI pages through the whole list (100 per request).
export function useLibraryClasses(
  libraryId: Key | undefined,
  version: string | undefined,
): LibraryClassesResult {
  const { data, isLoading, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery<
    LibraryClassesDto,
    Error
  >({
    queryKey: [CLASSES_QUERY_KEY, libraryId, version],
    queryFn: ({ pageParam = 0, signal }) => getLibraryClasses(libraryId!, version!, pageParam, signal),
    enabled: !!libraryId && !!version,
    staleTime: Infinity,
    getNextPageParam: (lastPage, allPages) => (lastPage.classes.length === PAGE_SIZE ? allPages.length : undefined),
  })
  useAutoFetchInfinitePages({
    isLoading: isLoading,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
    enabled: !error,
  })
  const result = useMemo(() => data?.pages.flatMap(page => page.classes), [data])
  const hasPendingPages = !!hasNextPage && !error
  return {
    data: result,
    isLoading: isLoading || isFetchingNextPage || hasPendingPages,
    error: error,
  }
}

export function useInvalidateLibraryClasses(): InvalidateLibraryClasses {
  const queryClient = useQueryClient()
  return async libraryId => {
    const queryKey = [CLASSES_QUERY_KEY, libraryId]
    // Remove inactive entries first: refetchOnMount is off, so a cache that only went stale would be shown again
    queryClient.removeQueries({ queryKey: queryKey, type: 'inactive' })
    await queryClient.invalidateQueries({ queryKey })
  }
}

async function getLibraryClasses(
  libraryId: Key,
  version: string,
  page: number,
  signal?: AbortSignal,
): Promise<LibraryClassesDto> {
  const query = new URLSearchParams()
  query.set('limit', String(PAGE_SIZE))
  query.set('page', String(page))
  return requestJsonWithError<LibraryClassesDto>(
    `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}/classes?${query}`,
    { method: 'GET' },
    { basePath: LIBRARIES_API_BASE_PATH },
    signal,
  )
}
