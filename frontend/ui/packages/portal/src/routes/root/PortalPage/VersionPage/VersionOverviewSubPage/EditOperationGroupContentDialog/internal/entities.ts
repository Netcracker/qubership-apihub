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
