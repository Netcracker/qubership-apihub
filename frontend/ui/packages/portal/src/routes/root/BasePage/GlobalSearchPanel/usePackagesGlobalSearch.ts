/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import type { FetchNextSearchResultList } from './global-search'
import { getSearchResult } from './global-search'
import { useMemo } from 'react'
import type { SearchCriteria, SearchResults } from '@apihub/entities/global-search'
import { PACKAGE_LEVEL } from '@apihub/entities/global-search'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

const GLOBAL_PACKAGES_SEARCH_RESULT_QUERY_KEY = 'global-packages-search-result-query-key'

export function usePackagesGlobalSearch(options: {
  criteria: SearchCriteria
  enabled: boolean
  limit?: number
  page?: number
}): [SearchResults, IsLoading, FetchNextSearchResultList, IsFetchingNextPage, HasNextPage] {
  const { criteria, enabled, page = 1, limit = 100 } = options

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
    },
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}
