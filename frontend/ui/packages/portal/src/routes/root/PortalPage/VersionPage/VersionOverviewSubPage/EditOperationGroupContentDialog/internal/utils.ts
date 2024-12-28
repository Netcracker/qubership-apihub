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

import type { OperationListsDelta } from './types'
import type { ApiAudience, ApiKind, Operation, Operations } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationsMovementDetails } from '@apihub/routes/EventBusProvider'
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
