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

import type { QueryKey, UseQueryOptions } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  PackageVersionContent,
  PackageVersionContentDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import type { InvalidateQuery, IsLoading, RefetchQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { DEFAULT_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  getPackageVersionContent, PACKAGE_VERSION_CONTENT_QUERY_KEY,
  toPackageVersionContent,
} from '@netcracker/qubership-apihub-ui-shared/hooks/package-version-content/usePackageVersionContent'

type InvalidateVersion = {
  packageKey: Key
  versionKey: Key
}

type PackageVersionContentQueryState = {
  versionContent: PackageVersionContent | null
  isLoading: IsLoading
  error: Error | null
  refetch: RefetchQuery<PackageVersionContent, Error>
  isRefetching: IsLoading
  isInitialLoading: IsLoading
}

type InvalidateQueryByVersionCallback = (versionKey: Key) => Promise<void>

export function usePackageVersionContent(options: {
  packageKey: Key | undefined
  versionKey: VersionKey | undefined
  includeSummary?: boolean
  includeOperations?: boolean
  includeGroups?: boolean
  enabled?: boolean
}): PackageVersionContentQueryState {
  const packageKey = options?.packageKey
  const versionKey = options?.versionKey
  const includeSummary = options?.includeSummary ?? false
  const includeOperations = options?.includeOperations ?? false
  const includeGroups = options?.includeGroups ?? false
  const enabled = options?.enabled ?? true

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    isInitialLoading,
  } = useQuery<PackageVersionContentDto, Error, PackageVersionContent>({
    queryKey: [PACKAGE_VERSION_CONTENT_QUERY_KEY, packageKey, versionKey, includeSummary, includeOperations, includeGroups, enabled],
    queryFn: ({ signal }) => getPackageVersionContent(packageKey!, versionKey!, signal, includeSummary, includeOperations, includeGroups),
    enabled: enabled && !!packageKey && !!versionKey && versionKey !== SPECIAL_VERSION_KEY,
    select: toPackageVersionContent,
  })

  return {
    versionContent: data ?? null,
    isLoading: isLoading,
    error: error,
    refetch: refetch,
    isRefetching: isRefetching,
    isInitialLoading: isInitialLoading,
  }
}

export function useAsyncInvalidateVersionContent(): (version: InvalidateVersion) => Promise<void> {
  const client = useQueryClient()
  return (invalidateVersion: InvalidateVersion) =>
    client.invalidateQueries({
      queryKey: [PACKAGE_VERSION_CONTENT_QUERY_KEY, invalidateVersion.packageKey, invalidateVersion.versionKey],
      refetchType: 'all',
    })
}

export function useInvalidateVersionContent(): InvalidateQuery<InvalidateVersion> {
  const client = useQueryClient()
  return (invalidateVersion: InvalidateVersion) =>
    client.invalidateQueries({
      queryKey: [PACKAGE_VERSION_CONTENT_QUERY_KEY, invalidateVersion.packageKey, invalidateVersion.versionKey],
      refetchType: 'all',
    }).then()
}

export function useAsyncInvalidateAllByVersion(): InvalidateQueryByVersionCallback {
  const client = useQueryClient()
  return (versionKey: Key) => client.invalidateQueries({
    predicate: ({ queryKey }) => (
      hasVersionKeyIn(queryKey, versionKey)
    ),
    refetchType: 'all',
  })
}

export function useAsyncInvalidatePackageVersionContentByVersion(): InvalidateQueryByVersionCallback {
  const client = useQueryClient()
  return (versionKey: Key) => client.invalidateQueries({
    predicate: ({ queryKey }) => (
      queryKey[0] === PACKAGE_VERSION_CONTENT_QUERY_KEY &&
      hasVersionKeyIn(queryKey, versionKey)
    ),
    refetchType: 'all',
  })
}

function hasVersionKeyIn(queryKey: QueryKey, versionKey: Key): boolean {
  return queryKey.some(queryKeyPart => queryKeyPart === versionKey)
}

export function getCurrentPackageVersionContent(
  packageKey: Key,
  versionKey: Key,
): UseQueryOptions<PackageVersionContentDto, Error, PackageVersionContent> {
  return {
    queryKey: [PACKAGE_VERSION_CONTENT_QUERY_KEY],
    queryFn: ({ signal }) => getPackageVersionContent(packageKey, versionKey, signal),
    select: toPackageVersionContent,
    enabled: !!packageKey && !!versionKey && versionKey !== SPECIAL_VERSION_KEY,
    refetchInterval: DEFAULT_REFETCH_INTERVAL,
  }
}
