import type { OperationType } from '@netcracker/qubership-apihub-api-processor'

import { CONTRACT_TYPE_DDL } from './contract-types'
import {
  type DdlComparisonSummary,
  type DdlComparisonSummaryDto,
  hasDdlComparisonChanges,
  toDdlComparisonSummary,
} from './contracts-ddl'

export type VersionComparisonContractsSummaryDto = Readonly<{
  ddl?: DdlComparisonSummaryDto
}>

export type VersionComparisonContractsSummary = Readonly<{
  ddl?: DdlComparisonSummary
}>

export function toVersionComparisonContractsSummary(
  dto: VersionComparisonContractsSummaryDto | undefined,
): VersionComparisonContractsSummary | undefined {
  if (!dto?.ddl) {
    return undefined
  }

  const ddl = toDdlComparisonSummary(dto.ddl)
  return ddl ? { ddl: ddl } : undefined
}

export function getComparisonApiTypesFromSummary(
  operationTypes: ReadonlyArray<OperationType> | undefined,
  contractsChangesSummary?: VersionComparisonContractsSummary,
): Array<typeof CONTRACT_TYPE_DDL | OperationType['apiType']> {
  const apiTypes: Array<typeof CONTRACT_TYPE_DDL | OperationType['apiType']> = operationTypes?.map(type => type.apiType) ??
    []

  if (hasDdlComparisonChanges(contractsChangesSummary?.ddl)) {
    apiTypes.push(CONTRACT_TYPE_DDL)
  }

  return apiTypes
}

export function getDashboardComparisonApiTypes(
  refs: ReadonlyArray<{
    operationTypes: ReadonlyArray<OperationType>
    contractsChangesSummary?: VersionComparisonContractsSummary
  }>,
): Array<typeof CONTRACT_TYPE_DDL | OperationType['apiType']> {
  const apiTypes: Array<typeof CONTRACT_TYPE_DDL | OperationType['apiType']> = []
  const seen = new Set<string>()

  for (const ref of refs) {
    for (const apiType of getComparisonApiTypesFromSummary(ref.operationTypes, ref.contractsChangesSummary)) {
      if (!seen.has(apiType)) {
        seen.add(apiType)
        apiTypes.push(apiType)
      }
    }
  }

  return apiTypes
}
