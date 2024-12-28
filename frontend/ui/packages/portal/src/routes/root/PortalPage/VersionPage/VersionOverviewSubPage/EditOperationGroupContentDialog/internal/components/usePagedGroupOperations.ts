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

import type { InfiniteData } from '@tanstack/react-query'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { useVersionWithRevision } from '../../../../../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type {
  ApiAudience,
  ApiKind,
  DeprecatedQueryStatus,
  FetchNextOperationList,
  OperationsData,
  OperationsDto,
  PagedOperations,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  ALL_API_KIND,
  ALL_DEPRECATED_QUERY_STATUS,
  API_AUDIENCE_ALL,
  DEFAULT_API_TYPE,
  DEFAULT_TAG,
  EMPTY_TAG,
  toOperations,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { HasNextPage, IsFetching, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { OperationGroupName } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  useResolvedOperationGroupParameters,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operation-groups/useResolvedOperationGroupParameters'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { isEmptyTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { portalRequestJson } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { QueryKey } from '@tanstack/query-core/src/types'

const PAGED_GROUP_OPERATIONS_QUERY_KEY = 'paged-group-operations-query-key'
const EMPTY_TAG_QUERY_PARAM_KEY = 'emptyTag'

export type PagedOperationsQueryState = {
  pagedData: PagedOperations
  loading: IsLoading
  fetching: IsFetching
  fetchNextPage: FetchNextOperationList
  fetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

export type PagedGroupOperationsOptions = Partial<{
  apiType: ApiType
  packageKey: Key
  versionKey: Key
  refPackageKey: PackageKey
  deprecated: DeprecatedQueryStatus
  kind: ApiKind
  apiAudience: ApiAudience
  tag: string
  textFilter: string
  documentId: string
  excludedGroupName: OperationGroupName
  groupName: OperationGroupName
  page: number
  limit: number
}>

function usePagedGroupOperationsQueryKey({
  packageKey,
  versionKey,
  refPackageKey,
  textFilter,
  documentId,
  tag,
  deprecated,
  kind,
  apiAudience,
  apiType,
  excludedGroupName,
  groupName,
}: PagedGroupOperationsOptions): QueryKey {
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)
  return [PAGED_GROUP_OPERATIONS_QUERY_KEY, packageKey, fullVersion, refPackageKey, tag, kind, apiAudience, deprecated, textFilter, documentId, apiType, excludedGroupName, groupName]
}

// TODO 03.08.23 // Check is there any more optimal way to do it
export function usePagedGroupOperations(options: PagedGroupOperationsOptions): PagedOperationsQueryState {
  const {
    packageKey,
    versionKey,
    refPackageKey,
    textFilter,
    documentId,
    tag,
    deprecated,
    kind,
    apiAudience,
    apiType,
    excludedGroupName,
    groupName,
    page = 1,
    limit = 500,
  } = options

  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)
  const queryKey = usePagedGroupOperationsQueryKey(options)

  const {
    resolvedExcludedGroupName,
    resolvedGroupName,
    resolvedEmptyGroup,
  } = useResolvedOperationGroupParameters(groupName, excludedGroupName)

  const {
    data: operationsList,
    isLoading,
    isFetching,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<OperationsData, Error, OperationsData>({
    queryKey: queryKey,
    queryFn: ({ pageParam = page }) => getOperations({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      refPackageKey: refPackageKey,
      deprecated: deprecated,
      kind: kind,
      apiAudience: apiAudience,
      limit: limit,
      page: pageParam - 1,
      tag: tag,
      textFilter: textFilter,
      documentId: documentId,
      apiType: apiType,
      excludedGroupName: resolvedExcludedGroupName,
      groupName: resolvedGroupName!,
      emptyGroup: resolvedEmptyGroup,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
    enabled: !!packageKey && !!fullVersion,
  })

  return {
    pagedData: operationsList?.pages ?? [],
    loading: isLoading,
    fetching: isFetching,
    fetchNextPage: fetchNextPage,
    fetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }
}

async function getOperations(options: {
  packageKey: Key
  versionKey: Key
  groupName: OperationGroupName
  refPackageKey?: PackageKey
  deprecated?: DeprecatedQueryStatus
  kind?: ApiKind
  apiAudience?: ApiAudience
  tag?: string
  textFilter?: string
  documentId?: Key
  apiType?: ApiType
  excludedGroupName?: OperationGroupName
  emptyGroup?: boolean
  page?: number
  limit?: number
}): Promise<OperationsData> {
  const {
    packageKey,
    versionKey,
    refPackageKey,
    deprecated = ALL_DEPRECATED_QUERY_STATUS,
    kind = ALL_API_KIND,
    apiAudience = API_AUDIENCE_ALL,
    limit,
    page,
    tag,
    textFilter,
    documentId,
    apiType = DEFAULT_API_TYPE,
    excludedGroupName,
    groupName,
    emptyGroup,
  } = options

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    documentSlug: { value: documentId },
    deprecated: { value: deprecated.toString() },
    kind: { value: kind },
    apiAudience: { value: apiAudience },
    tag: { value: tag ?? EMPTY_TAG },
    [EMPTY_TAG_QUERY_PARAM_KEY]: { value: isEmptyTag(tag) },
    onlyAddable: { value: !!excludedGroupName },
    emptyGroup: { value: emptyGroup },
    refPackageId: { value: refPackageKey },
    page: { value: page, toStringValue: page => `${page}` },
    limit: { value: limit },
  })

  let operations: OperationsData = await fetchOperations(packageKey, versionKey, queryParams, apiType, excludedGroupName || groupName)

  if (tag === DEFAULT_TAG) {
    // It's possible to have operations with explicitly defined default tag, we've to load them
    queryParams.set(EMPTY_TAG_QUERY_PARAM_KEY, 'false')
    const additionalOperations: OperationsData = await fetchOperations(packageKey, versionKey, queryParams, apiType, excludedGroupName || groupName)
    operations = [...operations, ...additionalOperations]
  }

  return operations
}

async function fetchOperations(
  packageKey: string,
  versionKey: string,
  queryParams: URLSearchParams,
  apiType: ApiType,
  groupName: string,
): Promise<OperationsData> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const encodedApiType = encodeURIComponent(apiType)
  const encodedGroupName = encodeURIComponent(groupName)

  const pathPattern = '/packages/:packageId/versions/:versionId/:encodedApiType/groups/:encodedGroupName'
  return toOperations(await portalRequestJson<OperationsDto>(
    `${generatePath(pathPattern, { packageId, versionId, encodedApiType, encodedGroupName })}?${queryParams}`,
    {
      method: 'get',
    }, {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  ))
}

export function useClearExcessivePagedGroupOperations(options: PagedGroupOperationsOptions): () => void {
  const client = useQueryClient()
  const queryKey = usePagedGroupOperationsQueryKey(options)

  return () => {
    client.setQueryData(
      queryKey,
      (data: InfiniteData<OperationsData> | undefined): InfiniteData<OperationsData> | undefined => {
        if (!data) {
          return data
        }
        return {
          pages: data.pages.slice(0, 1),
          pageParams: data.pageParams.slice(0, 1),
        }
      },
    )
  }
}
