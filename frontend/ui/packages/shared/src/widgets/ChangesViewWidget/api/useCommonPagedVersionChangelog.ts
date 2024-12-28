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
import type { VersionChangelogOptions } from './getVersionChangelog'
import { getVersionChangelog } from './getVersionChangelog'
import { useMemo } from 'react'
import type {
  DifferentVersionChanges,
  PagedDiffVersionChanges,
  PagedVersionChanges,
  VersionChanges,
  VersionChangesDto,
} from '../../../entities/version-changelog'
import { toDiffVersionChanges, toVersionChanges } from '../../../entities/version-changelog'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '../../../utils/aliases'
import {
  useResolvedOperationGroupParameters,
} from '../../../hooks/operation-groups/useResolvedOperationGroupParameters'

const VERSION_CHANGELOG = 'version-changelog-query-key'

export type FetchNextPage = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<VersionChangesDto, Error>>

function useCommonPagedVersionChangelog<T>(
  options: VersionChangelogOptions,
  toChanges: (data: VersionChangesDto) => T,
): [ReadonlyArray<T>, IsLoading, FetchNextPage, IsFetchingNextPage, HasNextPage] {
  const {
    packageKey,
    versionKey,
    documentSlug,
    packageIdFilter,
    previousVersionKey,
    previousVersionPackageKey,
    tag,
    searchValue,
    apiType,
    apiKind,
    apiAudience,
    group,
    severityFilters,
    page,
    limit,
    enabled = true,
  } = options

  const { resolvedGroupName, resolvedEmptyGroup } = useResolvedOperationGroupParameters(group)

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<VersionChangesDto, Error, VersionChangesDto>({
    queryKey: [
      VERSION_CHANGELOG, packageKey, versionKey, documentSlug, packageIdFilter,
      previousVersionKey, previousVersionPackageKey, tag, searchValue, apiType, apiAudience, apiKind, group,
      page, limit, enabled, severityFilters,
    ],
    enabled: !!versionKey && !!packageKey && enabled,
    retry: false,
    queryFn: ({ pageParam = page, signal }) => getVersionChangelog({
      packageKey: packageKey,
      versionKey: versionKey,
      documentSlug: documentSlug,
      packageIdFilter: packageIdFilter,
      previousVersionKey: previousVersionKey,
      previousVersionPackageKey: previousVersionPackageKey,
      tag: tag,
      searchValue: searchValue,
      apiType: apiType,
      apiKind: apiKind,
      apiAudience: apiAudience,
      group: resolvedGroupName,
      severityFilters: severityFilters,
      emptyGroup: resolvedEmptyGroup,
      page: pageParam - 1,
      limit: limit,
    }, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (limit && enabled) {
        return lastPage.operations?.length === limit ? allPages.length + 1 : undefined
      }
      return undefined
    },
  })

  const versionChanges = useMemo(
    () => data?.pages.map(page => toChanges(page)) ?? [],
    [data?.pages, toChanges],
  )

  return [
    versionChanges,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

export function usePagedVersionChangelog(
  options: VersionChangelogOptions,
): [PagedVersionChanges, IsLoading, FetchNextPage, IsFetchingNextPage, HasNextPage] {
  return useCommonPagedVersionChangelog<VersionChanges>(options, toVersionChanges)
}

export function usePagedDetailedVersionChangelog(
  options: VersionChangelogOptions,
): [PagedDiffVersionChanges, IsLoading, FetchNextPage, IsFetchingNextPage, HasNextPage] {
  return useCommonPagedVersionChangelog<DifferentVersionChanges>(options, toDiffVersionChanges)
}
