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
import { useInfiniteQuery } from '@tanstack/react-query'

import { usePackageParamsWithRef } from '../usePackageParamsWithRef'
import { portalRequestJson } from '@apihub/utils/requests'
import { generatePath } from 'react-router-dom'
import type {
  ApiAudience,
  ApiKind,
  OperationTags,
  OperationTagsDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  ALL_API_KIND,
  API_AUDIENCE_ALL,
  DEFAULT_API_TYPE,
  DEFAULT_TAG,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { HasNextPage, IsFetching, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useMemo } from 'react'
import { useVersionWithRevision } from '../../useVersionWithRevision'

const TAGS_QUERY_KEY = 'tags-query-key'

export type FetchNextTags = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<OperationTags, Error>>

export type TagsQueryState = {
  data: OperationTags
  loading: IsLoading
  fetching: IsFetching
  fetchNextPage: FetchNextTags
  fetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

export function useTags(options?: Partial<{
  packageKey: Key
  versionKey: Key
  textFilter: string
  apiKind: ApiKind
  apiAudience: ApiAudience
  apiType: ApiType
  page: number
  limit: number
}>): TagsQueryState {
  const {
    packageKey: providedPackageKey,
    versionKey: providedVersionKey,
    textFilter,
    apiKind,
    apiAudience,
    apiType,
    page,
    limit,
  } = options ?? {}
  const [parsedPackageKey, parsedVersionKey] = usePackageParamsWithRef()

  const packageKey = providedPackageKey || parsedPackageKey
  const versionKey = providedVersionKey || parsedVersionKey

  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const {
    data: tagsList,
    isLoading,
    isFetching,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<OperationTags, Error, OperationTags>({
    queryKey: [TAGS_QUERY_KEY, packageKey, fullVersion, apiKind, apiAudience, apiType, textFilter],
    queryFn: ({
      pageParam = page,
      signal,
    }) => getTags({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      textFilter: textFilter,
      apiKind: apiKind,
      apiAudience: apiAudience,
      apiType: apiType,
      page: pageParam - 1,
      limit: limit,
      signal: signal,
    }),
    enabled: !!packageKey && !!fullVersion,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
  })

  const tags = useMemo(() => (tagsList?.pages.flat() ?? []), [tagsList?.pages])
  return {
    data: tags,
    loading: isLoading,
    fetching: isFetching,
    fetchNextPage: fetchNextPage,
    fetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }
}

async function mergeDefaultTags(operationTagsDto: OperationTagsDto): Promise<OperationTags> {
  const { tags } = await operationTagsDto
  if (!tags) {
    return []
  }
  return Array.from(
    tags.reduce(
      (tagsSet, value) => tagsSet.add(value || DEFAULT_TAG),
      new Set<string>(),
    ),
  )
}

async function getTags(options: {
  packageKey: Key
  versionKey: Key
  textFilter?: string
  apiKind?: ApiKind
  apiAudience?: ApiAudience
  apiType?: ApiType
  page: number
  limit?: number
  signal?: AbortSignal
}): Promise<OperationTags> {
  const {
    packageKey,
    versionKey,
    textFilter,
    apiKind = ALL_API_KIND,
    apiAudience = API_AUDIENCE_ALL,
    apiType = DEFAULT_API_TYPE,
    page = 0,
    limit = 100,
    signal,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    kind: { value: apiKind !== ALL_API_KIND ? apiKind : undefined },
    apiAudience: { value: apiAudience },
    page: { value: page },
    limit: { value: limit },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/tags'
  return mergeDefaultTags(await portalRequestJson<OperationTagsDto>(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'get' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  ))
}
