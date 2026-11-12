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
