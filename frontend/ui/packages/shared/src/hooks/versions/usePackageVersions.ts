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
import { generatePath, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import type { Key } from '../../entities/keys'
import type { VersionStatus } from '../../entities/version-status'
import { PUBLISH_STATUSES } from '../../entities/version-status'
import type {
  PackageVersion,
  PackageVersionDto,
  PackageVersions,
  PackageVersionsDto,
  PagedPackageVersions,
} from '../../entities/versions'
import type { HasNextPage, InvalidateQuery, IsFetchingNextPage, IsLoading } from '../../utils/aliases'
import { optionalSearchParams } from '../../utils/search-params'
import { API_V2, API_V3, requestJson, requestVoid } from '../../utils/requests'
import { getPackageRedirectDetails } from '../../utils/redirects'
import type { VersionKey } from '../../utils/types'
import { handleVersionsRevision } from '../../utils/versions'
import type { PackageVersionsSortBy, SortOrder } from '../../types/sorting'
import { getPatchedBody } from '../../utils/request-bodies'

const PACKAGE_VERSIONS_QUERY_KEY = 'package-versions-query-key'

type FetchNextVersionsList = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<PackageVersions, Error>>

// TODO 13.07.23 // Is there any more optimal way to do paged/flatten result?
export function usePagedPackageVersions(options?: Partial<{
  packageKey: Key
  status: VersionStatus
  textFilter: string
  sortBy: PackageVersionsSortBy
  sortOrder: SortOrder
  limit: number
  page: number
  reloadQuery: boolean
}>): [PagedPackageVersions, IsLoading, FetchNextVersionsList, boolean | undefined] {
  const { status, textFilter, limit, page, reloadQuery = false, sortBy, sortOrder } = options ?? {}
  const packageKey = options?.packageKey

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PackageVersions, Error, PackageVersions>({
    queryKey: [PACKAGE_VERSIONS_QUERY_KEY, packageKey, status, textFilter, sortBy, sortOrder, reloadQuery],
    queryFn: ({ pageParam = 0, signal }) =>
      getPackageVersionsList(packageKey!, status, textFilter, sortBy, sortOrder, limit, pageParam ?? page, signal),
    enabled: !!packageKey,
  })

  return [
    data?.pages ?? [],
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
  ]
}

export function usePackageVersions(options?: Partial<{
  packageKey: Key
  status: VersionStatus
  textFilter: string
  sortBy: PackageVersionsSortBy
  sortOrder: SortOrder
  limit: number
  page: number
  enabled: boolean
}>): [PackageVersions, IsLoading, FetchNextVersionsList, IsFetchingNextPage, HasNextPage] {
  const { packageId } = useParams()

  const { status, textFilter, limit = 100, page = 1, enabled = true, sortBy, sortOrder } = options ?? {}

  const packageKey = options?.packageKey ?? packageId

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<PackageVersions, Error, PackageVersions>({
    queryKey: [PACKAGE_VERSIONS_QUERY_KEY, packageKey, status, textFilter, sortBy, sortOrder, limit, page, enabled],
    queryFn: ({ pageParam = page, signal }) =>
      getPackageVersionsList(packageKey!, status, textFilter, sortBy, sortOrder, limit, pageParam - 1, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }

      return lastPage.length === limit ? allPages.length + 1 : undefined
    },
    enabled: !!packageKey && enabled,
  })

  const versions = useMemo(() => (data?.pages.flat() ?? []), [data?.pages])

  return [
    versions,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

export async function getPackageVersionsList(
  packageKey: Key,
  status?: VersionStatus,
  textFilter?: string,
  sortBy?: PackageVersionsSortBy,
  sortOrder?: SortOrder,
  limit: number = 100,
  page: number = 0,
  signal?: AbortSignal,
): Promise<PackageVersions> {

  const packageId = encodeURIComponent(packageKey)

  const queryParams = optionalSearchParams({
    status: { value: status, toStringValue: (value) => PUBLISH_STATUSES.get(value.toString())!.toLowerCase() },
    limit: { value: limit },
    page: { value: page },
    textFilter: { value: textFilter },
    sortBy: { value: sortBy },
    sortOrder: { value: sortOrder },
  })

  const pathPattern = '/packages/:packageId/versions'
  const result = await requestJson<PackageVersionsDto>(
    `${generatePath(pathPattern, { packageId })}?${queryParams}`,
    { method: 'GET' },
    {
      customRedirectHandler: (response: Response) => getPackageRedirectDetails(response, pathPattern),
      basePath: API_V3,
    },
    signal,
  )
  return toPackageVersions(result)
}

export function useAsyncInvalidatePackageVersions(): () => Promise<void> {
  const client = useQueryClient()
  return () => client.invalidateQueries([PACKAGE_VERSIONS_QUERY_KEY])
}

export function useInvalidatePackageVersions(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([PACKAGE_VERSIONS_QUERY_KEY]).then()
  }
}

export async function deletePackageVersion(
  packageKey: Key,
  versionKey: Key,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId'
  return await requestVoid(generatePath(pathPattern, { packageId, versionId }), {
    method: 'DELETE',
  }, {
    customRedirectHandler: (response: Response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V2,
  })
}

export async function editPackageVersion(
  packageKey: Key,
  version: VersionKey,
  value: Partial<PackageVersionDto>,
  oldValue: Partial<PackageVersionDto>,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)

  const pathPattern = '/packages/:packageId/versions/:versionId'
  return await requestVoid(generatePath(pathPattern, { packageId, versionId }), {
    method: 'PATCH',
    body: JSON.stringify(getPatchedBody(value, oldValue)),
  }, {
    customRedirectHandler: (response: Response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V2,
  })
}

export function usePackageVersionKeys(): [VersionKey[], IsLoading] {
  const [data, isLoading] = usePackageVersions()
  const versions = handleVersionsRevision(data)
  return useMemo(
    () => [versions.map(({ key }) => key), isLoading],
    [isLoading, versions],
  )
}

function toPackageVersions({ versions }: PackageVersionsDto): PackageVersions {
  return versions.map(version => toPackageVersion(version))
}

function toPackageVersion(value: PackageVersionDto): PackageVersion {
  return {
    key: value.version,
    status: value.status,
    createdAt: value.createdAt,
    versionLabels: value.versionLabels ?? [],
    previousVersion: value?.previousVersion,
    createdBy: value.createdBy,
    latestRevision: !value.notLatestRevision,
  }
}
