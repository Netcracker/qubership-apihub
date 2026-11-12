import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { DifferentVersionChanges, VersionChanges, VersionChangesDto } from '../../../entities/version-changelog'
import { toDiffVersionChanges, toVersionChanges } from '../../../entities/version-changelog'
import { useResolvedOperationGroupParameters } from '../../../hooks/operation-groups/useResolvedOperationGroupParameters'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '../../../utils/aliases'
import type { VersionChangelogOptions } from './getVersionChangelog'
import { getVersionChangelog } from './getVersionChangelog'

const VERSION_CHANGELOG = 'version-changelog-query-key'

export type FetchNextPage = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<VersionChangesDto, Error>>

type IsChangelogReady = boolean

type QueryResult<T> = {
  data: ReadonlyArray<T>
  isLoading: IsLoading
  fetchNextPage: FetchNextPage
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
  isChangelogReady: IsChangelogReady
}

function useCommonPagedVersionChangelog<T>(
  options: VersionChangelogOptions,
  toChanges: (data: VersionChangesDto) => T,
): QueryResult<T> {
  const {
    packageKey,
    versionKey,
    documentSlug,
    packageIdFilter,
    previousVersionKey,
    previousVersionPackageKey,
    tag,
    searchValue,
    apiType,
    apiKind,
    apiAudience,
    group,
    severityFilters,
    page,
    limit,
    enabled = true,
  } = options

  const { resolvedGroupName, resolvedEmptyGroup } = useResolvedOperationGroupParameters(group)

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<VersionChangesDto, Error, VersionChangesDto>({
    queryKey: [
      VERSION_CHANGELOG, packageKey, versionKey, documentSlug, packageIdFilter,
      previousVersionKey, previousVersionPackageKey, tag, searchValue, apiType, apiAudience, apiKind, group,
      page, limit, enabled, severityFilters,
    ],
    enabled: !!versionKey && !!packageKey && enabled,
    retry: false,
    queryFn: ({ pageParam = page, signal }) => getVersionChangelog({
      packageKey: packageKey,
      versionKey: versionKey,
      documentSlug: documentSlug,
      packageIdFilter: packageIdFilter,
      previousVersionKey: previousVersionKey,
      previousVersionPackageKey: previousVersionPackageKey,
      tag: tag,
      searchValue: searchValue,
      apiType: apiType,
      apiKind: apiKind,
      apiAudience: apiAudience,
      group: resolvedGroupName,
      severityFilters: severityFilters,
      emptyGroup: resolvedEmptyGroup,
      page: pageParam - 1,
      limit: limit,
    }, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (limit && enabled) {
        return lastPage.operations?.length === limit ? allPages.length + 1 : undefined
      }
      return undefined
    },
  })

  const versionChanges = useMemo(
    () => data?.pages.map(page => toChanges(page)) ?? [],
    [data?.pages, toChanges],
  )

  return {
    data: versionChanges,
    isLoading: isLoading,
    fetchNextPage: fetchNextPage,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    isChangelogReady: !isLoading && !isFetchingNextPage && !hasNextPage,
  }
}

export function usePagedVersionChangelog(
  options: VersionChangelogOptions,
): QueryResult<VersionChanges> {
  return useCommonPagedVersionChangelog<VersionChanges>(options, toVersionChanges)
}

export function usePagedDetailedVersionChangelog(
  options: VersionChangelogOptions,
): QueryResult<DifferentVersionChanges> {
  return useCommonPagedVersionChangelog<DifferentVersionChanges>(options, toDiffVersionChanges)
}
