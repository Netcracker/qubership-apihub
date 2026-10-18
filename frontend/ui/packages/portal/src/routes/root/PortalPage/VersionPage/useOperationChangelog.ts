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
import type {
  UseOperationChangelogOptions,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import { getOperationChangeLog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import type { OperationChanges, OperationChangesDto } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import { toOperationChanges } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMemo } from 'react'

const OPERATION_CHANGELOG = 'operation-changelog-query-key'

export function useOperationChangelog(options: UseOperationChangelogOptions): [OperationChanges, IsLoading, IsSuccess] {
  const {
    packageKey,
    versionKey,
    operationKey,
    apiType,
    previousVersion,
    previousVersionPackageId,
    severity,
    enable = false,
  } = options

  const { data, isInitialLoading, isSuccess } = useQuery<OperationChangesDto, Error, OperationChanges>({
    queryKey: [OPERATION_CHANGELOG, versionKey, packageKey, operationKey, apiType, previousVersion, previousVersionPackageId, severity],
    enabled: enable && !!versionKey && !!packageKey && !!operationKey,
    retry: false,
    queryFn: ({ signal }) => getOperationChangeLog({
      versionKey,
      packageKey,
      operationKey,
      apiType,
      previousVersion,
      previousVersionPackageId,
      severity,
    }, signal),
    select: toOperationChanges,
  })

  return useMemo(() => [
    data ?? [],
    isInitialLoading,
    isSuccess,
  ], [data, isInitialLoading, isSuccess])
}
