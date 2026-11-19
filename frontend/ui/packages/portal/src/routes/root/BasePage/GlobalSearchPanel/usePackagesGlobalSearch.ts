import { useInfiniteQuery } from '@tanstack/react-query'
import type { FetchNextSearchResultList } from './global-search'
import { getSearchResult } from './global-search'
import { useMemo } from 'react'
import type { SearchCriteria, SearchResults } from '@portal/entities/global-search'
import { PACKAGE_LEVEL } from '@portal/entities/global-search'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { SEARCH_RESULTS_PAGE_SIZE } from './globalSearchConstants'

const GLOBAL_PACKAGES_SEARCH_RESULT_QUERY_KEY = 'global-packages-search-result-query-key'

export function usePackagesGlobalSearch(options: {
  criteria: SearchCriteria
  enabled: boolean
  limit?: number
  page?: number
}): [SearchResults, IsLoading, FetchNextSearchResultList, IsFetchingNextPage, HasNextPage] {
  const { criteria, enabled, page = 1, limit = SEARCH_RESULTS_PAGE_SIZE } = options

  const {
    data,
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<SearchResults, Error, SearchResults>({
    queryKey: [GLOBAL_PACKAGES_SEARCH_RESULT_QUERY_KEY, criteria, PACKAGE_LEVEL],
    queryFn: ({ pageParam = page }) => getSearchResult(criteria, PACKAGE_LEVEL, limit, pageParam - 1),
    enabled: enabled && !!criteria.searchString,
    getNextPageParam: (lastPage, allPages) => {
      if (limit && enabled) {
        return lastPage.packages.length === limit ? allPages.length + 1 : undefined
      }

      return undefined
    },
  })

  const packages = useMemo(() => data?.pages.flatMap(page => page.packages) ?? [], [data?.pages])

  return [
    {
      packages: packages,
      documents: [],
      operations: [],
      mcpContracts: [],
      ddlContracts: [],
    },
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}
