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
import { useChangesSummaryFromContext } from './ChangesSummaryProvider'
import type { ChangeSeverity, ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  DEPRECATED_CHANGE_SEVERITY,
  NON_BREAKING_CHANGE_SEVERITY,
  SEMI_BREAKING_CHANGE_SEVERITY,
  UNCLASSIFIED_CHANGE_SEVERITY,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { DashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import {
  calculateImpactedSummary,
  calculateTotalChangeSummary,
  calculateTotalImpactedSummary,
  EMPTY_CHANGE_SUMMARY,
} from '@netcracker/qubership-apihub-api-processor'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function useOrderedComparisonFiltersSummary(options: {
  isDashboardsComparison?: boolean
  apiType: ApiType | undefined
}): Record<ChangeSeverity, number> | undefined {
  const { isDashboardsComparison = false, apiType } = options

  const versionChangesSummary = useChangesSummaryFromContext()

  const totalVersionChanges: ChangesSummary | undefined = useMemo(() => {
    if (!versionChangesSummary) {
      return undefined
    }

    if (isDashboardComparisonSummary(versionChangesSummary)) {
      return calculateDashboardChangesSummary(versionChangesSummary, isDashboardsComparison, apiType)
    }

    const refChangesSummaries = versionChangesSummary.operationTypes
      .filter(type => type.apiType === apiType)
      .map(type => type.numberOfImpactedOperations ?? EMPTY_CHANGE_SUMMARY)

    return calculateTotalChangeSummary(refChangesSummaries)
  }, [apiType, isDashboardsComparison, versionChangesSummary])

  if (!totalVersionChanges) {
    return undefined
  }

  return {
    [BREAKING_CHANGE_SEVERITY]: totalVersionChanges[BREAKING_CHANGE_SEVERITY],
    [SEMI_BREAKING_CHANGE_SEVERITY]: totalVersionChanges[SEMI_BREAKING_CHANGE_SEVERITY],
    [DEPRECATED_CHANGE_SEVERITY]: totalVersionChanges[DEPRECATED_CHANGE_SEVERITY],
    [NON_BREAKING_CHANGE_SEVERITY]: totalVersionChanges[NON_BREAKING_CHANGE_SEVERITY],
    [ANNOTATION_CHANGE_SEVERITY]: totalVersionChanges[ANNOTATION_CHANGE_SEVERITY],
    [UNCLASSIFIED_CHANGE_SEVERITY]: totalVersionChanges[UNCLASSIFIED_CHANGE_SEVERITY],
  }
}

function calculateDashboardChangesSummary(
  versionChangesSummary: DashboardComparisonSummary,
  isDashboardsComparison: boolean,
  apiType: ApiType | undefined,
): ChangesSummary {
  if (isDashboardsComparison) {
    return calculateTotalImpactedSummary(
      versionChangesSummary.map(({ operationTypes }) => {
        const refChangesSummaries = operationTypes
          .filter(type => (apiType ? type.apiType === apiType : true))
          .map(type => type.changesSummary ?? EMPTY_CHANGE_SUMMARY)

        return calculateImpactedSummary(refChangesSummaries)
      }),
    )
  }
  const refChangesSummaries = versionChangesSummary
    .flatMap(({ operationTypes }) => operationTypes
      .filter(type => type.apiType === apiType)
      .map(type => type.numberOfImpactedOperations ?? EMPTY_CHANGE_SUMMARY))
  return calculateTotalChangeSummary(refChangesSummaries)
}
