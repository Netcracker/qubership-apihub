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

import { useMemo } from 'react'
import type {
  DashboardComparisonSummary,
  PackageComparisonSummary,
  RefComparisonSummary,
  VersionChangesSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import {
  hasNoVersionChanges,
  isDashboardComparisonSummary,
  isPackageComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { DEFAULT_TAG, EMPTY_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function useTagsFromChangesSummary(
  apiType: ApiType | undefined,
  versionChangesSummary: VersionChangesSummary | undefined,
): string[] {
  return useMemo(
    () => {
      let tagsSet = new Set<string>()
      if (!versionChangesSummary || hasNoVersionChanges(versionChangesSummary)) {
        return Array.from(tagsSet)
      }
      if (isPackageComparisonSummary(versionChangesSummary)) {
        tagsSet = new Set<string>(getTagsFromApiTypeChange(apiType, versionChangesSummary))
      } else if (isDashboardComparisonSummary(versionChangesSummary)) {
        tagsSet = new Set<string>(
          (versionChangesSummary as DashboardComparisonSummary)
            .map(ref => getTagsFromApiTypeChange(apiType, ref))
            .reduce((allTagsList, currentTagsList) => {
              allTagsList.push(...currentTagsList)
              return allTagsList
            }, []),
        )
      }
      const tagsList = Array.from(tagsSet)
      if (!tagsList.length || tagsList.includes(EMPTY_TAG)) {
        return [DEFAULT_TAG]
      }
      return tagsList
    },
    [versionChangesSummary, apiType],
  )
}

function getTagsFromApiTypeChange(
  apiType: ApiType | undefined,
  comparisonSummary: PackageComparisonSummary | RefComparisonSummary | undefined,
): string[] {
  return (comparisonSummary as PackageComparisonSummary | RefComparisonSummary)
    ?.operationTypes
    ?.find(type => type.apiType === apiType)
    ?.tags ?? []
}
