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
import { DOCUMENT_LEVEL } from '@apihub/entities/global-search'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

const GLOBAL_DOCUMENTS_SEARCH_RESULT_QUERY_KEY = 'global-documents-search-result-query-key'

export function useDocumentsGlobalSearch(options: {
  criteria: SearchCriteria
  enabled: boolean
  limit?: number
  page?: number
}): [SearchResults, IsLoading, FetchNextSearchResultList, IsFetchingNextPage, HasNextPage] {
  const { criteria, page = 1, limit = 100, enabled } = options

  const {
    data,
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<SearchResults, Error, SearchResults>({
    queryKey: [GLOBAL_DOCUMENTS_SEARCH_RESULT_QUERY_KEY, criteria, DOCUMENT_LEVEL],
    queryFn: ({ pageParam = page }) => getSearchResult(criteria, DOCUMENT_LEVEL, limit, pageParam - 1),
    enabled: enabled && !!criteria.searchString,
    getNextPageParam: (lastPage, allPages) => {
      if (limit && enabled) {
        return lastPage.documents.length === limit ? allPages.length + 1 : undefined
      }

      return undefined
    },
  })

  const documents = useMemo(() => data?.pages.flatMap(page => page.documents) ?? [], [data?.pages])

  return [
    {
      packages: [],
      documents: documents,
      operations: [],
    },
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}
