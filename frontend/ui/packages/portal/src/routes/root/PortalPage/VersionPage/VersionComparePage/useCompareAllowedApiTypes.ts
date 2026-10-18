import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

import { useApiTypesFromChangesSummary } from './useApiTypesFromChangesSummary'

export function useCompareAllowedApiTypes(
  versionChangesSummary?: VersionChangesSummary,
  refPackageKey?: Key,
): Array<ApiType | ContractType> {
  return useApiTypesFromChangesSummary(versionChangesSummary, refPackageKey)
}
