import type { OperationListsDelta } from './types'
import type { ApiAudience, ApiKind, Operation, Operations } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationsMovementDetails } from '@portal/routes/EventBusProvider'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'

// TODO 06.10.23 // Can I optimize it?
export function isOperationMovedWithAction(
  operation: Operation,
  action: OperationsMovementDetails,
  delta: OperationListsDelta,
): boolean {
  return delta.some(({ operation: movedOperation, action: movedOperationAction }) => {
    return deepCompare(movedOperation, operation) && movedOperationAction === action
  })
}

export function areFiltersApplied(filters: {
  selectedRefPackage?: PackageReference | null
  selectedApiKind?: ApiKind
  selectedApiAudience?: ApiAudience
  selectedTag?: string
  operationTextFilter?: string
}): boolean {
  const { selectedRefPackage, selectedApiKind, selectedTag, operationTextFilter, selectedApiAudience } = filters
  return !!selectedRefPackage || !!selectedApiKind || !!selectedTag || !!operationTextFilter || !!selectedApiAudience
}

function deepCompare(operation1: Operation | null | undefined, operation2?: Operation | null | undefined): boolean {
  if (operation1 === operation2) {
    return true
  }

  if (!operation1 || !operation2) {
    return false
  }

  return operation1.operationKey === operation2.operationKey &&
    operation1.packageRef?.refId === operation2.packageRef?.refId
}

export function deepIncludes(array: Operations, item: Operation): boolean {
  for (const operation of array) {
    if (deepCompare(operation, item)) {
      return true
    }
  }
  return false
}

export function intersection(a: Operations, b: Operations): Operations {
  return a.filter((value) => deepIncludes(b, value))
}
