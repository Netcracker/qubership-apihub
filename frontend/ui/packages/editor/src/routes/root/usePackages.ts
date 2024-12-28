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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toPackage } from './usePackage'
import type { InvalidatePackagesProps, Packages, PackagesDto } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestJson } from '@apihub/utils/requests'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const PACKAGES_QUERY_KEY = 'packages-query-key'

export function usePackages(options: {
  kind: string
  onlyFavorite?: boolean
  showParents?: boolean
  onlyShared?: boolean
  textFilter?: string
  page?: number
  limit?: number
  parentId?: string
  lastReleaseVersionDetails?: boolean
  versionLabel?: string
}): [Packages, IsLoading, Error | null] {
  const {
    kind,
    onlyFavorite,
    onlyShared,
    showParents,
    textFilter,
    page,
    limit,
    parentId,
    lastReleaseVersionDetails,
    versionLabel,
  } = options

  const { data, isLoading, error } = useQuery<PackagesDto, Error, Packages>({
    queryKey: [PACKAGES_QUERY_KEY, kind, limit, onlyFavorite, textFilter, page, parentId, onlyShared],
    queryFn: () => getPackages(kind, limit, onlyFavorite, page, parentId, showParents, textFilter, onlyShared, lastReleaseVersionDetails, versionLabel),
    select: toPackages,
  })

  return [data ?? [], isLoading, error]
}

export function useChildPackages(
  kind: string,
  parentKey: Key = '',
  enabled = true,
  onlyFavorite: boolean = false,
  onlyShared: boolean = false,
): Packages {
  const { data } = useQuery<PackagesDto, Error, Packages>({
    queryKey: [PACKAGES_QUERY_KEY, kind, parentKey, onlyFavorite, onlyShared],
    queryFn: () => getPackages(kind, undefined, onlyFavorite, null, parentKey, false, '', onlyShared, true, ''),
    enabled: enabled && !!parentKey,
    select: toPackages,
  })

  return data ?? []
}

export async function getPackages(
  kind: string = '',
  limit: number | null = null,
  onlyFavorite: boolean = false,
  page: number | null = null,
  parentId: string = '',
  showParents: boolean = false,
  textFilter: string = '',
  onlyShared: boolean = false,
  lastReleaseVersionDetails: boolean = true,
  versionLabel: string = '',
): Promise<PackagesDto> {
  const searchParam = new URLSearchParams({
    kind: encodeURIComponent(kind),
    limit: (limit ?? '').toString(),
    onlyFavorite: onlyFavorite.toString(),
    onlyShared: onlyShared.toString(),
    page: (page ?? '').toString(),
    parentId: encodeURIComponent(parentId),
    showParents: showParents.toString(),
    textFilter: textFilter,
    lastReleaseVersionDetails: lastReleaseVersionDetails.toString(),
    versionLabel: encodeURIComponent(versionLabel),
  })

  return await editorRequestJson<PackagesDto>(`/packages?${searchParam}`, {
      method: 'GET',
    },
    { basePath: API_V2 },
  )
}

export function toPackages(value: PackagesDto): Packages {
  return value?.packages.map((pack) => toPackage(pack))
}

export function useInvalidatePackagesByParams(): InvalidateQuery<InvalidatePackagesProps> {
  const client = useQueryClient()
  return ({ kind, parentId, limit, onlyFavorite, page, onlyShared, textFilter }) => {
    client.invalidateQueries([PACKAGES_QUERY_KEY, kind, limit, onlyFavorite, textFilter, page, parentId, onlyShared]).then()
  }
}

export function useInvalidatePackages(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([PACKAGES_QUERY_KEY]).then()
  }
}
