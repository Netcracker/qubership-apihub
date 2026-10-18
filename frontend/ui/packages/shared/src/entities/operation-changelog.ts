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

import type { ActionType, ChangeSeverity } from './change-severities'
import type { JsonPath } from '../utils/operations'
import type { DiffTypeDto, Hash} from '@netcracker/qubership-apihub-api-processor'
import { SEMI_BREAKING_CHANGE_TYPE } from '@netcracker/qubership-apihub-api-processor'
import type { DiffType} from '@netcracker/qubership-apihub-api-diff'
import { risky } from '@netcracker/qubership-apihub-api-diff'

export type OperationChangeDto = {
  description?: string
  action: ActionType
  severity: ChangeSeverity<DiffTypeDto>
  scope: string
  currentValueHash?: Hash
  currentDeclarationJsonPaths?: JsonPath[]
  previousValueHash?: Hash
  previousDeclarationJsonPaths?: JsonPath[]
  previousKey?: string
  currentKey?: string
}

export type OperationChangesDto = Readonly<{
  changes: ReadonlyArray<OperationChangeDto>
}>

export type OperationChange<T = DiffType> = {
  description: string
  action: ActionType
  severity: ChangeSeverity<T>
  scope: string
  currentValueHash?: Hash
  currentDeclarationJsonPaths?: JsonPath[]
  previousValueHash?: Hash
  previousDeclarationJsonPaths?: JsonPath[]
  previousKey?: string
  currentKey?: string
}

export type OperationChanges = ReadonlyArray<OperationChange>

export function toOperationChanges(value: OperationChangesDto): OperationChanges {
  return value.changes.map(toOperationChange)
}

export function toOperationChange(value: OperationChangeDto): OperationChange {
  return {
    ...value,
    severity: value.severity === SEMI_BREAKING_CHANGE_TYPE ? risky : value.severity,
    description: value.description ?? '',
  } as OperationChange
}
