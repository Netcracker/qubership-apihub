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

import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { portalRequestJson } from '@apihub/utils/requests'
import { generatePath } from 'react-router-dom'
import type {
  HasNextPage,
  InvalidateQuery,
  IsFetchingNextPage,
  IsLoading,
} from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import type { Revisions, RevisionsDto } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'
import { toRevisions } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'

const REVISIONS_QUERY_KEY = 'revisions-query-key'
export type FetchNextRevisionList = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<Revisions, Error>>

type PagedRevisionsQueryState = {
  data: Revisions
  isLoading: IsLoading
  fetchNextPage: FetchNextRevisionList
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

type AllRevisionsQueryState = {
  data: Revisions
  hasNextPage: HasNextPage
}

export function usePagedRevisions(options: {
  packageKey: Key | undefined
  versionKey: Key | undefined
  textFilter?: string
  page?: number
  limit?: number
}): PagedRevisionsQueryState {

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useRevisions(options)

  return {
    data: data,
    isLoading: isLoading,
    fetchNextPage: fetchNextPage,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }
}

export function useAllRevisions(options: {
  packageKey: Key | undefined
  versionKey: Key | undefined
  textFilter?: string
}): AllRevisionsQueryState {
  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useRevisions(options)

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage?.()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return {
    data: data,
    hasNextPage: hasNextPage,
  }
}

function useRevisions(options: {
  packageKey: Key | undefined
  versionKey: Key | undefined
  textFilter?: string
  page?: number
  limit?: number
}): PagedRevisionsQueryState {
  const { packageKey, versionKey, textFilter, page = 1, limit = 100 } = options

  const {
    data,
    isInitialLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<Revisions, Error, Revisions>({
    queryKey: [REVISIONS_QUERY_KEY, packageKey, versionKey, limit, textFilter, page],
    queryFn: ({ pageParam = page, signal }) =>
      getRevisions(packageKey!, versionKey!, pageParam - 1, limit, textFilter, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
    enabled: !!packageKey && !!versionKey,
  })

  return {
    data: useMemo(() => data?.pages.flat() ?? [], [data?.pages]),
    isLoading: isInitialLoading,
    fetchNextPage: fetchNextPage,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }
}

export async function getRevisions(
  packageKey: Key,
  versionKey: Key,
  page?: number,
  limit?: number,
  textFilter?: string,
  signal?: AbortSignal,
): Promise<Revisions> {
  const queryParams = optionalSearchParams({
    limit: { value: limit },
    page: { value: page, toStringValue: page => `${page}` },
    textFilter: { value: textFilter },
  })

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/revisions'
  const revisionsDto = await portalRequestJson<RevisionsDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'GET' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      basePath: API_V3,
    },
    signal,
  )

  return toRevisions(revisionsDto)
}

export function useInvalidateRevisions(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([REVISIONS_QUERY_KEY]).then()
  }
}

