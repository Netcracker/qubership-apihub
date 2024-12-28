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
  RefComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { filterChangesBySeverity, hasNoChangesInSummary } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import { EMPTY_CHANGE_SUMMARY } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { calculateTotalChangeSummary } from '@netcracker/qubership-apihub-api-processor'

function changeSeverityFilter({ operationTypes }: RefComparisonSummary, filters: ChangeSeverity[]): boolean {
  const matchSeverities = operationTypes.some(apiType => filterChangesBySeverity(filters, apiType.changesSummary))
  const wholePackageChangesSummary = isNotEmpty(operationTypes)
    ? calculateTotalChangeSummary(operationTypes.map(type => type.changesSummary ?? EMPTY_CHANGE_SUMMARY))
    : EMPTY_CHANGE_SUMMARY
  return matchSeverities && !hasNoChangesInSummary(wholePackageChangesSummary)
}

function apiTypeFilter({ operationTypes }: RefComparisonSummary, apiType?: ApiType): boolean {
  return apiType
    ? !!operationTypes.find(operationType => operationType.apiType === apiType)
    : true
}

export function useFilteredDashboardChanges(
  dashboardChanges: DashboardComparisonSummary = [],
  severityFilter: ChangeSeverity[],
  apiType?: ApiType,
): DashboardComparisonSummary {
  return useMemo(
    () => dashboardChanges?.filter((refChanges) => apiTypeFilter(refChanges, apiType))?.filter((refChanges) => changeSeverityFilter(refChanges, severityFilter)) ?? [],
    [dashboardChanges, apiType, severityFilter],
  )
}
