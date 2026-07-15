import { useMemo } from 'react'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { CONTRACT_TYPE_DDL } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { getComparisonApiTypesFromSummary } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-changes-summary'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import {
  isDashboardComparisonSummary,
  isPackageComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

export function useApiTypesFromChangesSummary(
  versionChangesSummary?: VersionChangesSummary,
  refPackageKey?: Key,
): Array<ApiType | ContractType> {
  return useMemo(
    () => {
      if (!versionChangesSummary) {
        return []
      }

      if (isDashboardComparisonSummary(versionChangesSummary)) {
        const refSummary = versionChangesSummary.find(summary => summary.refKey === refPackageKey)
        return excludeTemporarilyDisabledComparisonApiTypes(getComparisonApiTypesFromSummary(
          refSummary?.operationTypes,
          refSummary?.contractsChangesSummary,
        ))
      }

      if (isPackageComparisonSummary(versionChangesSummary)) {
        return excludeTemporarilyDisabledComparisonApiTypes(getComparisonApiTypesFromSummary(
          versionChangesSummary.operationTypes,
          versionChangesSummary.contractsChangesSummary,
        ))
      }

      return []
    },
    [refPackageKey, versionChangesSummary],
  )
}

// TODO: remove filter when full version compare support for DDL is ready.
function excludeTemporarilyDisabledComparisonApiTypes(
  apiTypes: Array<ApiType | ContractType>,
): Array<ApiType | ContractType> {
  return apiTypes.filter(apiType => apiType !== CONTRACT_TYPE_DDL)
}
