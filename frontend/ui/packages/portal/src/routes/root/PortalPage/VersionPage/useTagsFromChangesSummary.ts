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
