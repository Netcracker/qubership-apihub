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

import type { QueryKey } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PackageKind, Packages } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { InvalidateQuery, IsFetching, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { EMPTY_PAGE_REFERER } from '@netcracker/qubership-apihub-ui-shared/entities/referer-pages-names'
import { getPackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'

const PACKAGES_QUERY_KEY = 'packages-query-key'

export function usePackages(options: {
  kind: PackageKind | PackageKind[]
  limit?: number
  onlyFavorite?: boolean
  textFilter?: string
  showParents?: boolean
  page?: number
  parentId?: string
  onlyShared?: boolean
  lastReleaseVersionDetails?: boolean
  versionLabel?: string
  showAllDescendants?: boolean
  enabled?: boolean
  refererPageKey?: string
}): [Packages, IsLoading, IsFetching, Error | null] {
  const {
    kind,
    limit = 100,
    onlyFavorite = false,
    textFilter = '',
    showParents = false,
    page = 0,
    parentId = '',
    onlyShared = false,
    lastReleaseVersionDetails = false,
    versionLabel = '',
    showAllDescendants = false,
    enabled = true,
    refererPageKey = EMPTY_PAGE_REFERER,
  } = options ?? {}

  const queryKey = [PACKAGES_QUERY_KEY, refererPageKey, kind, parentId, page, limit, onlyFavorite, textFilter, onlyShared, showAllDescendants, lastReleaseVersionDetails]
  const { data, isLoading, isFetching, error } = useQuery<Packages, Error, Packages>({
    queryKey: queryKey,
    queryFn: () => getPackages(kind, limit, onlyFavorite, page, parentId, showParents, textFilter, onlyShared, lastReleaseVersionDetails, versionLabel, showAllDescendants),
    enabled: enabled,
  })

  return [data ?? [], isLoading, isFetching, error]
}

export function useRefetchPackages(options: Partial<{
  queryKey: QueryKey
  refererPageName: string
}>): InvalidateQuery<void> {
  const {
    refererPageName = EMPTY_PAGE_REFERER,
    queryKey = [PACKAGES_QUERY_KEY, refererPageName],
  } = options
  const client = useQueryClient()
  return () => client.refetchQueries({ queryKey }).then()
}
