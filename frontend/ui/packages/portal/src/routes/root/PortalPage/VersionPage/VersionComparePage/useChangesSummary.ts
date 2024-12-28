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
import type {
  VersionChangesSummary,
  VersionChangesSummaryDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { toVersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { useVersionWithRevision } from '../../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { InvalidateQuery, IsFetching, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { portalRequestJson } from '@apihub/utils/requests'

const CHANGES_SUMMARY_QUERY_KEY = 'changes-summary-query-key'

export function useChangesSummary(options: {
  packageKey: Key
  versionKey: Key
  previousVersionPackageKey: Key
  previousVersionKey: Key
  enabled?: boolean
}): [VersionChangesSummary | undefined, IsLoading, IsFetching, Error | null] {
  const {
    packageKey,
    versionKey,
    previousVersionPackageKey,
    previousVersionKey,
    enabled = true,
  } = options ?? {}
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)
  const { fullVersion: fullPreviousVersion } = useVersionWithRevision(previousVersionKey, previousVersionPackageKey)

  const { data, isLoading, isFetching, error } = useQuery<VersionChangesSummaryDto, Error, VersionChangesSummary>({
    queryKey: [CHANGES_SUMMARY_QUERY_KEY, packageKey, fullVersion, previousVersionPackageKey, previousVersionKey, fullPreviousVersion],
    enabled: !!packageKey && !!fullVersion && !!previousVersionPackageKey && !!fullPreviousVersion && enabled,
    retry: 1,
    queryFn: ({ signal }) =>
      getChangesSummary(packageKey, fullVersion, previousVersionPackageKey, fullPreviousVersion, signal),
    select: toVersionChangesSummary,
  })

  return [data, isLoading, isFetching, error]
}

export async function getChangesSummary(
  packageKey: Key,
  versionKey: Key,
  previousVersionPackageKey: Key,
  previousVersionKey: Key,
  signal?: AbortSignal,
): Promise<VersionChangesSummaryDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    previousVersionPackageId: { value: previousVersionPackageKey },
    previousVersion: { value: previousVersionKey },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/changes/summary'
  return await portalRequestJson<VersionChangesSummaryDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'get' },
    {
      customErrorHandler: triggerBuilderBySummaryAbsence,
    },
    signal,
  )
}

async function triggerBuilderBySummaryAbsence(response: Response): Promise<void> {
  const responseJson = await response.json()
  if (responseJson.status === 404) {
    // Dispatch event to invoke builder
  }
}

export function useRefetchChangesSummary(): InvalidateQuery<void> {
  const queryClient = useQueryClient()
  return () => queryClient.refetchQueries({
    queryKey: [CHANGES_SUMMARY_QUERY_KEY],
  })
}
