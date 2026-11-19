import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export type OperationTypeForm =
  | ReadonlyArray<ApiType | ContractType>
  | Record<ApiType | ContractType, unknown>
  | undefined
  | null

export function isApiTypeSelectorShown(operationTypes: OperationTypeForm): boolean {
  if (!operationTypes) {
    return false
  }
  return Array.isArray(operationTypes)
    ? operationTypes.length > 1
    : Object.keys(operationTypes).length > 1
}

export function getDefaultApiType(operationTypes: OperationTypeForm): ApiType | ContractType {
  if (!operationTypes) {
    return DEFAULT_API_TYPE
  }

  const types = Array.isArray(operationTypes)
    ? operationTypes
    : Object.keys(operationTypes!) as Array<ApiType | ContractType>
  if (isEmpty(types)) {
    return DEFAULT_API_TYPE
  }
  if (types.length === 1) {
    return types[0]
  }

  return types.includes(DEFAULT_API_TYPE) ? DEFAULT_API_TYPE : types[0]
}
