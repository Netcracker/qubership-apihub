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
import { useVersionWithRevision } from '../../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  VersionDeprecatedSummary,
  VersionDeprecatedSummaryDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import { isDashboardDeprecatedSummaryDto } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { toPackageRef } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { toApiTypeMap } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

const DEPRECATED_SUMMARY_QUERY_KEY = 'deprecated-summary-query-key'

export function useDeprecatedSummary(options: {
  packageKey: Key | undefined
  versionKey: Key | undefined
}): {
  deprecatedSummary: VersionDeprecatedSummary | null
  isLoading: IsLoading
  error: Error | null
} {
  const { packageKey, versionKey } = options ?? {}
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const { data, isLoading, error } = useQuery<VersionDeprecatedSummaryDto, Error, VersionDeprecatedSummary>({
    queryKey: [DEPRECATED_SUMMARY_QUERY_KEY, packageKey, fullVersion],
    queryFn: ({ signal }) => getDeprecatedSummary(packageKey!, fullVersion!, signal),
    enabled: !!packageKey && !!fullVersion,
    select: toDeprecatedSummary,
  })

  return { deprecatedSummary: data ?? null, isLoading: isLoading, error: error }
}

export async function getDeprecatedSummary(
  packageKey: Key,
  versionKey: Key,
  signal?: AbortSignal,
): Promise<VersionDeprecatedSummaryDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/deprecated/summary'
  return await portalRequestJson<VersionDeprecatedSummaryDto>(
    generatePath(pathPattern, { packageId, versionId }),
    { method: 'GET' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}

export function toDeprecatedSummary(value: VersionDeprecatedSummaryDto): VersionDeprecatedSummary {
  if (isDashboardDeprecatedSummaryDto(value)) {
    return value.refs.map((ref) => {
      const packageRef = toPackageRef(ref.packageRef, value.packages)
      return {
        refKey: packageRef?.refId || packageRef?.refId,
        operationTypes: toApiTypeMap(ref.operationTypes)!,
      }
    })
  } else {
    return {
      operationTypes: toApiTypeMap(value.operationTypes),
    }
  }
}


