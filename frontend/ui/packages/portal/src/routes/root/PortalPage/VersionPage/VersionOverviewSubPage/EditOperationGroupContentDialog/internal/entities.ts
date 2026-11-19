import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationKey } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import type { Operation, Operations } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export type UpdatingOperation = Readonly<{
  packageId?: PackageKey
  version?: VersionKey
  operationId: OperationKey
}>

export type UpdatingOperations = ReadonlyArray<UpdatingOperation>

export function toUpdatingOperations(operations: Operations): UpdatingOperations {
  return operations.map(toUpdatingOperation)
}

function toUpdatingOperation(operation: Operation): UpdatingOperation {
  return {
    packageId: operation.packageRef?.key,
    version: operation.packageRef?.version,
    operationId: operation.operationKey,
  }
}
