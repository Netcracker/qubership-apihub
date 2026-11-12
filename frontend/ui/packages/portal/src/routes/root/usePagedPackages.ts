import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { PackageKind, Packages } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { HasNextPage, IsFetching, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { EMPTY_PAGE_REFERER } from '@netcracker/qubership-apihub-ui-shared/entities/referer-pages-names'
import { getPackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'

const PACKAGES_QUERY_KEY = 'packages-query-key'

export type FetchNextPackages = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<Packages, Error>>

export type PagedPackagesQueryState = {
  packages: Packages
  isLoading: IsLoading
  isFetching: IsFetching
  fetchNextPage: FetchNextPackages
  fetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

export function usePagedPackages(options: {
  kind: PackageKind | PackageKind[]
  limit?: number
  onlyFavorite?: boolean
  textFilter?: string
  showParents?: boolean
  page?: number
  parentId?: string
  onlyShared?: boolean
  lastReleaseVersionDetails?: boolean
  versionLabel?: string
  showAllDescendants?: boolean
  enabled?: boolean
  refererPageName?: string
}): PagedPackagesQueryState {
  const {
    kind,
    limit = 100,
    onlyFavorite = false,
    textFilter = '',
    showParents = false,
    page = 1,
    parentId = '',
    onlyShared = false,
    lastReleaseVersionDetails = false,
    versionLabel = '',
    showAllDescendants = false,
    enabled = true,
    refererPageName = EMPTY_PAGE_REFERER,
  } = options ?? {}

  const queryKey = [PACKAGES_QUERY_KEY, refererPageName, kind, parentId, page, limit, onlyFavorite, textFilter, onlyShared, showAllDescendants, lastReleaseVersionDetails]
  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<Packages, Error, Packages>({
    queryKey: queryKey,
    queryFn: ({ pageParam = page }) => getPackages(kind, limit, onlyFavorite, pageParam - 1, parentId, showParents, textFilter, onlyShared, lastReleaseVersionDetails, versionLabel, showAllDescendants),
    enabled: enabled,
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
  })

  const packages = useMemo(() => (data?.pages.flat() ?? []), [data?.pages])
  return {
    packages: packages,
    isLoading: isLoading,
    isFetching: isFetching,
    fetchNextPage: fetchNextPage,
    fetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }
}
