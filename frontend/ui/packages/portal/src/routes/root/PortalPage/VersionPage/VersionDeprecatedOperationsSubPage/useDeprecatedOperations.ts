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
import { useVersionWithRevision } from '../../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  ApiAudience,
  ApiKind,
  FetchNextOperationList,
  OperationsData,
  OperationsDto,
  OperationsWithDeprecations,
  OperationsWithDeprecationsDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  ALL_API_KIND,
  API_AUDIENCE_ALL,
  DEFAULT_API_TYPE,
  DEFAULT_TAG,
  EMPTY_TAG,
  toOperations,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationGroupName } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  useResolvedOperationGroupParameters,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operation-groups/useResolvedOperationGroupParameters'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { portalRequestJson } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

const DEPRECATED_OPERATIONS_QUERY_KEY = 'deprecated-operations-query-key'
const EMPTY_TAG_QUERY_PARAM_KEY = 'emptyTag'

export function useDeprecatedOperations(options?: Partial<{
  packageKey: Key
  versionKey: Key
  ids: string[]
  apiKind: ApiKind
  apiAudience: ApiAudience
  label: string
  tag: string
  textFilter: string
  apiType: ApiType
  excludedGroupName: OperationGroupName
  groupName: OperationGroupName
  refPackageKey: PackageKey
  page: number
  limit: number
}>): [OperationsData, IsLoading, FetchNextOperationList, IsFetchingNextPage, HasNextPage] {
  const {
    packageKey,
    versionKey,
    textFilter,
    tag,
    ids,
    label,
    apiKind,
    apiAudience,
    apiType,
    excludedGroupName,
    groupName,
    refPackageKey,
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
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<OperationsData, Error, OperationsData>({
    queryKey: [DEPRECATED_OPERATIONS_QUERY_KEY, packageKey, fullVersion, tag, apiKind, apiAudience, textFilter, apiType, excludedGroupName, groupName, refPackageKey],
    queryFn: ({ pageParam = page, signal }) => {
      return getDeprecatedOperations({
        packageKey: packageKey!,
        versionKey: fullVersion!,
        ids: ids,
        apiKind: apiKind,
        apiAudience: apiAudience,
        label: label,
        tag: tag,
        textFilter: textFilter,
        apiType: apiType,
        excludedGroupName: resolvedExcludedGroupName,
        groupName: resolvedGroupName,
        refPackageKey: refPackageKey,
        emptyGroup: resolvedEmptyGroup,
        page: pageParam - 1,
        limit: limit,
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
    operationsList?.pages.flat() ?? [],
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

async function getDeprecatedOperations(
  options: {
    packageKey: Key
    versionKey: Key
    ids?: string[]
    apiKind?: ApiKind
    apiAudience?: ApiAudience
    label?: string
    tag?: string
    textFilter?: string
    documentId?: Key
    apiType?: ApiType
    excludedGroupName?: OperationGroupName
    groupName?: OperationGroupName
    refPackageKey?: PackageKey
    emptyGroup?: boolean
    page?: number
    limit?: number
  },
  signal?: AbortSignal,
): Promise<OperationsData> {
  const {
    packageKey,
    versionKey,
    ids,
    apiKind = ALL_API_KIND,
    apiAudience = API_AUDIENCE_ALL,
    label,
    tag,
    textFilter,
    documentId,
    apiType = DEFAULT_API_TYPE,
    excludedGroupName,
    groupName,
    emptyGroup,
    refPackageKey,
    page,
    limit,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    documentSlug: { value: documentId },
    ids: { value: ids ? encodeURIComponent(JSON.stringify(ids)).toString() : '' },
    apiKind: { value: apiKind.toString() },
    apiAudience: { value: apiAudience },
    label: { value: label?.toString() ?? '' },
    tag: { value: tag ?? EMPTY_TAG },
    [EMPTY_TAG_QUERY_PARAM_KEY]: { value: tag === DEFAULT_TAG },
    exceptGroup: { value: excludedGroupName },
    group: { value: groupName },
    emptyGroup: { value: emptyGroup },
    refPackageId: { value: refPackageKey },
    page: { value: page, toStringValue: page => `${page}` },
    limit: { value: limit },
  })

  let operations: OperationsWithDeprecations = await fetchDeprecatedOperations(packageId, versionId, queryParams, apiType, signal)

  if (tag === DEFAULT_TAG) {
    // It's possible to have operations with explicitly defined default tag, we've to load them
    queryParams.set(EMPTY_TAG_QUERY_PARAM_KEY, 'false')
    const additionalOperations: OperationsWithDeprecations = await fetchDeprecatedOperations(packageId, versionId, queryParams, apiType, signal)
    operations = [...operations, ...additionalOperations]
  }

  return operations
}

async function fetchDeprecatedOperations(
  packageId: string,
  versionId: string,
  queryParams: URLSearchParams,
  apiType: ApiType,
  signal?: AbortSignal,
): Promise<OperationsWithDeprecations> {
  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/deprecated'
  return toOperations(await portalRequestJson<OperationsWithDeprecationsDto>(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'get' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  ) as OperationsDto)
}
