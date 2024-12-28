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

import type { OperationsApiType } from '@netcracker/qubership-apihub-api-processor'
import { useMemo } from 'react'
import { useOperationChangelog } from './useOperationChangelog'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { SEMI_BREAKING_CHANGE_SEVERITY } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ChangelogAvailable } from '@apihub/routes/root/PortalPage/VersionPage/common-props'
import {
  useVersionsComparisonGlobalParams,
} from '@apihub/routes/root/PortalPage/VersionPage/VersionsComparisonGlobalParams'
import type { OperationChange } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'

export function useSemiBreakingChanges(options: UseSemiBreakingChangesOptions): [OperationChange[], IsLoading, IsSuccess] {
  const {
    operationKey,
    comparisonMode,
    needToCheckSemiBreaking,
    isChangelogAvailable = false,
  } = options

  const {
    originPackageKey,
    originVersionKey,
    changedPackageKey,
    changedVersionKey,
    apiType,
  } = useVersionsComparisonGlobalParams()

  const [changes, isChangesLoading, isSuccess] = useOperationChangelog({
    versionKey: changedVersionKey!,
    packageKey: changedPackageKey!,
    operationKey: operationKey!,
    apiType: apiType,
    previousVersion: originVersionKey,
    previousVersionPackageId: originPackageKey,
    severity: [SEMI_BREAKING_CHANGE_SEVERITY],
    enable: comparisonMode && needToCheckSemiBreaking && !!originPackageKey && !!originVersionKey && isChangelogAvailable,
  })

  // TODO: Remove filter after "Filter for operation changes works incorrect"
  const filteredChanges = useMemo(() => (
    changes.filter(change => change.severity === SEMI_BREAKING_CHANGE_SEVERITY)
  ), [changes])

  return useMemo(() => [
    filteredChanges,
    isChangesLoading,
    isSuccess,
  ], [filteredChanges, isChangesLoading, isSuccess])
}

export type UseSemiBreakingChangesOptions = Partial<{
  changedPackageKey: Key
  changedVersionKey: VersionKey
  originPackageKey: Key
  originVersionKey: VersionKey
  operationKey: Key
  apiType: OperationsApiType
  previousVersion: VersionKey
  previousVersionPackageId: Key
  comparisonMode?: boolean
  needToCheckSemiBreaking?: boolean
}> & ChangelogAvailable
