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

import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import { useVersionWithRevision } from '../useVersionWithRevision'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageVersionConfig, PackageVersionConfigDto } from '@apihub/entities/package-version-config'
import { toPackageVersionConfig } from '@apihub/entities/package-version-config'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@apihub/utils/requests'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

const PACKAGE_VERSION_CONFIG_QUERY_KEY = 'package-version-config-query-key'

export function usePackageVersionConfig(
  packageKey?: Key,
  versionKey?: Key,
): [PackageVersionConfig | null, IsLoading] {

  const { fullVersion, isInitialLoading: isFullVersionLoading } = useVersionWithRevision(versionKey, packageKey)
  const { data, isInitialLoading } = useQuery<PackageVersionConfigDto, Error, PackageVersionConfig>({
    queryKey: [PACKAGE_VERSION_CONFIG_QUERY_KEY, packageKey, fullVersion],
    queryFn: ({ signal }) => getConfig(packageKey!, fullVersion!, signal),
    enabled: !!packageKey && !!fullVersion,
    select: toPackageVersionConfig,
  })

  return [data ?? null, isInitialLoading || isFullVersionLoading]
}

async function getConfig(
  packageKey: Key,
  versionKey: Key,
  signal?: AbortSignal,
): Promise<PackageVersionConfigDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/config'
  return await portalRequestJson<PackageVersionConfigDto>(
    generatePath(pathPattern, { packageId, versionId }),
    { method: 'GET' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}
