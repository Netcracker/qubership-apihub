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
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { useMemo } from 'react'
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
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationGroupName } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import {
  useResolvedOperationGroupParameters,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operation-groups/useResolvedOperationGroupParameters'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { isEmptyTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { portalRequestJson } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

const OPERATIONS_QUERY_KEY = 'operations-query-key'
const PAGED_OPERATIONS_QUERY_KEY = 'paged-operations-query-key'
const EMPTY_TAG_QUERY_PARAM_KEY = 'emptyTag'

export type PagedOperationsQueryState = {
  pagedData: PagedOperations
  loading: IsLoading
  fetching: IsFetching
  fetchNextPage: FetchNextOperationList
  fetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

// TODO 03.08.23 // Check is there any more optimal way to do it
export function usePagedOperations(options?: Partial<{
  packageKey: Key
  versionKey: Key
  refPackageKey: PackageKey
  deprecated: DeprecatedQueryStatus
  hashList: string[]
  ids: string[]
  includeData: boolean
  kind: ApiKind
  label: string
  tag: string
  textFilter: string
  documentId: string
  apiType: ApiType
  excludedGroupName?: OperationGroupName
  groupName?: OperationGroupName
  page: number
  limit: number
}>): PagedOperationsQueryState {
  const {
    packageKey,
    versionKey,
    refPackageKey,
    textFilter,
    documentId,
    tag,
    ids,
    includeData,
    hashList,
    label,
    deprecated,
    kind,
    apiType,
    excludedGroupName,
    groupName,
    page,
    limit,
  } = options ?? {}
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

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
    queryKey: [PAGED_OPERATIONS_QUERY_KEY, packageKey, fullVersion, refPackageKey, tag, kind, deprecated, textFilter, documentId, apiType, excludedGroupName, groupName],
    queryFn: ({ pageParam = page, signal }) => getOperations({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      refPackageKey: refPackageKey,
      deprecated: deprecated,
      hashList: hashList,
      ids: ids,
      includeData: includeData,
      kind: kind,
      label: label,
      limit: limit,
      page: pageParam - 1,
      tag: tag,
      textFilter: textFilter,
      documentId: documentId,
      apiType: apiType,
      excludedGroupName: resolvedExcludedGroupName,
      groupName: resolvedGroupName,
      emptyGroup: resolvedEmptyGroup,
    }, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
    enabled: !!packageKey && !!fullVersion,
  })

  return useMemo(() => ({
    pagedData: operationsList?.pages ?? [],
    loading: isLoading,
    fetching: isFetching,
    fetchNextPage: fetchNextPage,
    fetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
  }), [fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading, operationsList?.pages])
}

export function useOperations(options?: Partial<{
  packageKey: Key
  versionKey: Key
  deprecated: DeprecatedQueryStatus
  hashList: string[]
  ids: string[]
  includeData: boolean
  kind: ApiKind
  apiAudience: ApiAudience
  label: string
  tag: string
  textFilter: string
  apiType: ApiType
  refPackageKey?: PackageKey
  excludedGroupName?: OperationGroupName
  groupName?: OperationGroupName
  page: number
  limit: number
}>): [OperationsData, IsLoading, FetchNextOperationList, IsFetchingNextPage, HasNextPage] {
  const packageKey = options?.packageKey
  const versionKey = options?.versionKey

  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const {
    textFilter,
    tag,
    ids,
    includeData,
    hashList,
    label,
    deprecated,
    kind,
    apiAudience,
    apiType,
    excludedGroupName,
    groupName,
    page,
    limit,
    refPackageKey,
  } = options ?? {}

  const {
    resolvedExcludedGroupName,
    resolvedGroupName,
    resolvedEmptyGroup,
  } = useResolvedOperationGroupParameters(groupName, excludedGroupName)

  const {
    data: operationsList,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<OperationsData, Error, OperationsData>({
    queryKey: [OPERATIONS_QUERY_KEY, packageKey, fullVersion, tag, kind, apiAudience, deprecated, textFilter, apiType, excludedGroupName, groupName, refPackageKey],
    queryFn: ({ pageParam = page, signal }) => {
      return getOperations({
        packageKey: packageKey!,
        versionKey: fullVersion!,
        deprecated: deprecated,
        hashList: hashList,
        ids: ids,
        includeData: includeData,
        kind: kind,
        apiAudience: apiAudience,
        label: label,
        limit: limit,
        page: pageParam - 1,
        tag: tag,
        textFilter: textFilter,
        apiType: apiType,
        excludedGroupName: resolvedExcludedGroupName,
        refPackageKey: refPackageKey,
        groupName: resolvedGroupName,
        emptyGroup: resolvedEmptyGroup,
      }, signal)
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
    enabled: !!packageKey && !!fullVersion,
  })

  return [
    useMemo(() => operationsList?.pages.flat() ?? [], [operationsList?.pages]),
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

export async function getOperations(
  options: {
    packageKey: Key
    versionKey: Key
    refPackageKey?: PackageKey
    deprecated?: DeprecatedQueryStatus
    hashList?: string[]
    ids?: string[]
    includeData?: boolean
    kind?: ApiKind
    apiAudience?: ApiAudience
    label?: string
    tag?: string
    textFilter?: string
    documentId?: Key
    apiType?: ApiType
    excludedGroupName?: OperationGroupName
    groupName?: OperationGroupName
    emptyGroup?: boolean
    page?: number
    limit?: number
  },
  signal?: AbortSignal,
): Promise<OperationsData> {
  const {
    packageKey,
    versionKey,
    refPackageKey,
    deprecated = ALL_DEPRECATED_QUERY_STATUS,
    hashList,
    ids,
    includeData = false,
    kind = ALL_API_KIND,
    apiAudience = API_AUDIENCE_ALL,
    label,
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

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    documentSlug: { value: documentId },
    deprecated: { value: deprecated.toString() },
    hashList: { value: hashList ? encodeURIComponent(JSON.stringify(hashList)).toString() : '' },
    ids: { value: ids ? encodeURIComponent(ids.join()).toString() : '' },
    includeData: { value: includeData.toString() },
    kind: { value: kind },
    apiAudience: { value: apiAudience },
    label: { value: label?.toString() ?? '' },
    tag: { value: tag ?? EMPTY_TAG },
    [EMPTY_TAG_QUERY_PARAM_KEY]: { value: isEmptyTag(tag) },
    exceptGroup: { value: excludedGroupName },
    group: { value: groupName },
    emptyGroup: { value: emptyGroup },
    refPackageId: { value: refPackageKey },
    page: { value: page, toStringValue: page => `${page}` },
    limit: { value: limit },
  })

  let operations: OperationsData = await fetchOperations(packageId, versionId, queryParams, apiType, signal)

  if (tag === DEFAULT_TAG) {
    // It's possible to have operations with explicitly defined default tag, we've to load them
    queryParams.set(EMPTY_TAG_QUERY_PARAM_KEY, 'false')
    const additionalOperations: OperationsData = await fetchOperations(packageId, versionId, queryParams, apiType, signal)
    operations = [...operations, ...additionalOperations]
  }

  return operations
}

async function fetchOperations(
  packageId: string,
  versionId: string,
  queryParams: URLSearchParams,
  apiType: ApiType,
  signal?: AbortSignal,
): Promise<OperationsData> {

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations'
  return toOperations(await portalRequestJson<OperationsDto>(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'get' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  ))
}
