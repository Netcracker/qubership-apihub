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

import { useGroupComparisons } from './VersionPage/useGroupComparisons'
import type { VersionsComparisonDto } from '@netcracker/qubership-apihub-api-processor'
import { useVersionWithRevision } from '../useVersionWithRevision'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useChangesSummaryContext } from '@apihub/routes/root/PortalPage/VersionPage/ChangesSummaryProvider'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

export type UseCompareGroupsOptions = Partial<{
  changedPackageKey: Key
  changedVersionKey: VersionKey
  originPackageKey: Key
  originVersionKey: VersionKey
  currentGroup: Key
  previousGroup: Key
}>

export function useCompareGroups(options: UseCompareGroupsOptions): [VersionsComparisonDto, IsLoading] {
  const {
    originPackageKey,
    changedVersionKey,
    currentGroup,
    previousGroup,
  } = options

  const [changesSummary, isContextValid, setChangesSummary] = useChangesSummaryContext(options)

  const { fullVersion } = useVersionWithRevision(changedVersionKey, originPackageKey)
  const [groupsComparisons, isLoading] = useGroupComparisons({
    packageKey: originPackageKey,
    versionKey: fullVersion,
    currentGroup: currentGroup,
    previousGroup: previousGroup,
  })

  if (groupsComparisons && !changesSummary && isContextValid) {
    setChangesSummary({ operationTypes: groupsComparisons[0].operationTypes } as VersionChangesSummary)
  }

  return [groupsComparisons ? groupsComparisons[0] : EMPTY_VERSIONS_COMPARISON, isLoading]
}

export const EMPTY_VERSIONS_COMPARISON: VersionsComparisonDto = {
  comparisonFileId: '',
  packageId: '',
  version: '',
  revision: 0,
  previousVersion: '',
  previousVersionPackageId: '',
  fromCache: false,
  operationTypes: [],
  data: [],
}
