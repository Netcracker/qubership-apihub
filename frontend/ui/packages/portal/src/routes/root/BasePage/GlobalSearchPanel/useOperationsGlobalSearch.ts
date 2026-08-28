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

import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_MCP,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import {
  type ApiContract,
  type ContractElementSearchResult,
  DDL_LEVEL,
  type Level,
  MCP_LEVEL,
  OPERATION_LEVEL,
  type SearchCriteria,
  type SearchResults,
} from '@apihub/entities/global-search'
import { getSearchResult, type FetchNextSearchResultList } from './global-search'
import { SEARCH_RESULTS_PAGE_SIZE } from './globalSearchConstants'

const GLOBAL_OPERATIONS_SEARCH_RESULT_QUERY_KEY = 'global-operations-search-result-query-key'

type ContractElementsSearchResults = Readonly<{
  contractElements: ContractElementSearchResult[]
}>

export function useOperationsGlobalSearch(options: {
  criteria: SearchCriteria
  enabled: boolean
  limit?: number
  page?: number
}): [ContractElementsSearchResults, IsLoading, FetchNextSearchResultList, IsFetchingNextPage, HasNextPage] {
  const { criteria, enabled, page = 1, limit = SEARCH_RESULTS_PAGE_SIZE } = options
  const apiContract = criteria.apiContract ?? criteria.apiType
  const level = getContractElementsSearchLevel(apiContract)

  const {
    data,
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<SearchResults, Error, SearchResults>({
    queryKey: [GLOBAL_OPERATIONS_SEARCH_RESULT_QUERY_KEY, criteria, level, apiContract],
    queryFn: ({ pageParam = page }) => getSearchResult(criteria, level, limit, pageParam - 1),
    enabled: enabled && !!criteria.searchString,
    getNextPageParam: (lastPage, allPages) => {
      if (limit && enabled) {
        return getActiveSearchResultsCount(lastPage, level) === limit ? allPages.length + 1 : undefined
      }

      return undefined
    },
  })

  const contractElements = useMemo(
    () => data?.pages.flatMap(page => getActiveSearchResults(page, level)) ?? [],
    [data?.pages, level],
  )

  return [
    {
      contractElements,
    },
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

function getContractElementsSearchLevel(apiContract?: ApiContract): Level {
  if (apiContract === CONTRACT_TYPE_MCP) {
    return MCP_LEVEL
  }
  if (apiContract === CONTRACT_TYPE_DDL) {
    return DDL_LEVEL
  }
  return OPERATION_LEVEL
}

function getActiveSearchResults(page: SearchResults, level: Level): ContractElementSearchResult[] {
  if (level === MCP_LEVEL) {
    return page.mcpContracts.map(result => ({ level: MCP_LEVEL, result: result }))
  }
  if (level === DDL_LEVEL) {
    return page.ddlContracts.map(result => ({ level: DDL_LEVEL, result: result }))
  }
  return page.operations.map(result => ({ level: OPERATION_LEVEL, result: result }))
}

function getActiveSearchResultsCount(page: SearchResults, level: Level): number {
  return getActiveSearchResults(page, level).length
}
