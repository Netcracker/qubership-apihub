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

import { calculateTotalChangeSummary } from '@netcracker/qubership-apihub-api-processor'
import type { ChangeSeverity, ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { CONTRACT_TYPE_DDL } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { hasDdlComparisonChanges } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { EMPTY_CHANGE_SUMMARY } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type {
  DashboardComparisonSummary,
  RefComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  filterChangesBySeverity,
  hasNoChangesInSummary,
} from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'

import type { CompareSupportedApiType } from './compareApiTypeFilter'

export function useFilteredDashboardChanges(
  dashboardChanges: DashboardComparisonSummary = [],
  severityFilter: ChangeSeverity[],
  apiType?: CompareSupportedApiType,
): DashboardComparisonSummary {
  return useMemo(
    () =>
      dashboardChanges
        ?.filter(refChanges => matchesDashboardRefChanges(refChanges, severityFilter, apiType)) ??
        [],
    [dashboardChanges, apiType, severityFilter],
  )
}

function matchesDashboardRefChanges(
  refChanges: RefComparisonSummary,
  severityFilter: ChangeSeverity[],
  apiType?: CompareSupportedApiType,
): boolean {
  const scopedSummaries = getScopedChangeSummaries(refChanges, apiType)
  if (!isNotEmpty(scopedSummaries)) {
    return false
  }

  const matchSeverities = scopedSummaries.some(summary => filterChangesBySeverity(severityFilter, summary))
  const totalSummary = scopedSummaries.length === 1
    ? scopedSummaries[0]
    : calculateTotalChangeSummary(scopedSummaries)

  return matchSeverities && !hasNoChangesInSummary(totalSummary)
}

function getScopedChangeSummaries(
  { operationTypes, contractsChangesSummary }: RefComparisonSummary,
  apiType?: CompareSupportedApiType,
): ChangesSummary[] {
  const ddl = contractsChangesSummary?.ddl
  const ddlChangesSummary = ddl?.changesSummary

  if (apiType === CONTRACT_TYPE_DDL) {
    if (!hasDdlComparisonChanges(ddl) || !ddlChangesSummary) {
      return []
    }
    return [ddlChangesSummary]
  }

  if (apiType) {
    const operationType = operationTypes.find(type => type.apiType === apiType)
    if (!operationType) {
      return []
    }
    return [operationType.changesSummary ?? EMPTY_CHANGE_SUMMARY]
  }

  const summaries = operationTypes.map(type => type.changesSummary ?? EMPTY_CHANGE_SUMMARY)
  if (hasDdlComparisonChanges(ddl) && ddlChangesSummary) {
    summaries.push(ddlChangesSummary)
  }
  return summaries
}
