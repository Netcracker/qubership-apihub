import { type InfiniteData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { JavaApiChangesClassListBuilder, type JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type { LibraryChangesDto, LibraryChangesSummaryDto } from '@portal/entities/libraries'
import { useAutoFetchInfinitePages } from '@portal/routes/root/PortalPage/VersionPage/useAutoFetchInfinitePages'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { LIBRARIES_API_BASE_PATH } from '@portal/utils/requests'
import {
  type JavaChangesSummary,
  type PreviousLibraryVersion,
  setPreviousLibraryVersion,
  toChangesSummary,
} from './javaapi/javaApi'

const CHANGES_QUERY_KEY = 'library-changes'
const SUMMARY_QUERY_KEY = 'library-changes-summary'
const PAGE_SIZE = 100

// TODO(libraries-backend): The service marks builds complete before storing the comparison.
// Drop this wait when complete means the comparison is stored.
const COMPARISON_REFETCH_INTERVAL = 3000
const COMPARISON_NOT_FOUND_CODES = ['3200', 'LIBRARY_COMPARISON_NOT_FOUND']
const COMPARISON_REFETCH_ATTEMPTS = 10

type LibraryChangesOptions = { expectsComparison?: boolean }

type LibraryChangesResult = {
  data: Readonly<{ classes: readonly JavaApiClassListItem[] }> | null | undefined
  isLoading: boolean
  error: Error | null
}

type LibraryChangesSummaryResult = {
  data: JavaChangesSummary | null | undefined
  isLoading: boolean
  error: Error | null
}

type InvalidateLibraryChanges = (libraryId: Key) => Promise<void>

export function useLibraryChangesSummary(
  libraryId: Key | undefined,
  version: string | undefined,
  previous?: PreviousLibraryVersion,
  { expectsComparison = false }: LibraryChangesOptions = {},
): LibraryChangesSummaryResult {
  const queryClient = useQueryClient()
  const queryKey = [SUMMARY_QUERY_KEY, libraryId, version, previous?.previousLibraryId, previous?.previousVersion]
  const isWaitingForComparison = (): boolean => {
    const state = queryClient.getQueryState<JavaChangesSummary | null>(queryKey)
    const hasNoComparison = state?.status === 'success' && state.data === null
    return expectsComparison && hasNoComparison && state.dataUpdateCount <= COMPARISON_REFETCH_ATTEMPTS
  }
  const { data, isLoading, isFetching, error } = useQuery<JavaChangesSummary | null, Error>({
    queryKey: queryKey,
    queryFn: async ({ signal }) => {
      const dto = await getLibraryChanges<LibraryChangesSummaryDto>(
        libraryId!,
        version!,
        'changes/summary',
        previous,
        signal,
      )
      return dto ? toChangesSummary(dto.changeCounts) : null
    },
    enabled: !!libraryId && !!version,
    staleTime: Infinity,
    refetchInterval: () => (isWaitingForComparison() ? COMPARISON_REFETCH_INTERVAL : false),
  })
  return {
    data: data,
    isLoading: isLoading || (data === null && isFetching) || isWaitingForComparison(),
    error: error,
  }
}

export function useLibraryChanges(
  libraryId: Key | undefined,
  version: string | undefined,
  previous?: PreviousLibraryVersion,
  { expectsComparison = false }: LibraryChangesOptions = {},
): LibraryChangesResult {
  const queryClient = useQueryClient()
  const queryKey = [CHANGES_QUERY_KEY, libraryId, version, previous?.previousLibraryId, previous?.previousVersion]
  const isWaitingForComparison = (): boolean => {
    const state = queryClient.getQueryState<InfiniteData<LibraryChangesDto | null>>(queryKey)
    const hasNoComparison = state?.status === 'success' && !!state.data?.pages.some(page => page === null)
    return expectsComparison && hasNoComparison && state.dataUpdateCount <= COMPARISON_REFETCH_ATTEMPTS
  }
  const { data, isLoading, isFetching, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery<
    LibraryChangesDto | null,
    Error
  >({
    queryKey: queryKey,
    queryFn: ({ pageParam = 0, signal }) =>
      getLibraryChanges<LibraryChangesDto>(
        libraryId!,
        version!,
        'changes',
        previous,
        signal,
        pageParam,
      ),
    enabled: !!libraryId && !!version,
    staleTime: Infinity,
    refetchInterval: () => (isWaitingForComparison() ? COMPARISON_REFETCH_INTERVAL : false),
    getNextPageParam: (lastPage, allPages) => (lastPage?.changes.length === PAGE_SIZE ? allPages.length : undefined),
  })
  useAutoFetchInfinitePages({
    isLoading: isLoading,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
    enabled: !error,
  })
  const result = useMemo(() => {
    if (!data) return undefined
    if (data.pages.some(page => page === null)) return null
    const changes = data.pages.flatMap(page => page?.changes ?? [])
    return { classes: new JavaApiChangesClassListBuilder({ changes }).build() }
  }, [data])
  const hasPendingPages = !!hasNextPage && !error
  const isRefetchingEmpty = result === null && isFetching
  return {
    data: result,
    isLoading: isLoading || isFetchingNextPage || hasPendingPages || isRefetchingEmpty || isWaitingForComparison(),
    error: error,
  }
}

export function useInvalidateLibraryChanges(): InvalidateLibraryChanges {
  const queryClient = useQueryClient()
  return async libraryId => {
    const queryKeys = [[CHANGES_QUERY_KEY, libraryId], [SUMMARY_QUERY_KEY, libraryId]]
    // Remove inactive entries first: refetchOnMount is off, so a cache that only went stale would be shown again
    queryKeys.forEach(queryKey => queryClient.removeQueries({ queryKey: queryKey, type: 'inactive' }))
    await Promise.all(queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey })))
  }
}

export async function getLibraryChanges<T extends object>(
  libraryId: Key,
  version: string,
  resource: 'changes' | 'changes/summary',
  previous?: PreviousLibraryVersion,
  signal?: AbortSignal,
  page?: number,
  classId?: string,
): Promise<T | null> {
  const query = new URLSearchParams()
  if (classId) query.set('classId', classId)
  if (page !== undefined) {
    query.set('limit', String(PAGE_SIZE))
    query.set('page', String(page))
  }
  setPreviousLibraryVersion(query, previous)
  try {
    return await requestJsonWithError<T>(
      `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}/${resource}?${query}`,
      { method: 'GET' },
      { basePath: LIBRARIES_API_BASE_PATH },
      signal,
    )
  } catch (error) {
    if (
      error instanceof HttpError && error.status === 404 && COMPARISON_NOT_FOUND_CODES.includes(error.code)
    ) return null
    throw error
  }
}
