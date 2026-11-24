import type { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { printGraphApi as stringifyGraphQl } from '@netcracker/qubership-apihub-graphapi'
import type { Key } from '../entities/keys'
import type { OperationData } from '../entities/operations'
import { isAsyncApiOperation, isRestOperation } from '../entities/operations'
import type { ActionType} from '@netcracker/qubership-apihub-api-diff'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'

export function stringifyOperation(operationData?: OperationData | null): string {
  if (!operationData) {
    return ''
  }

  if (isRestOperation(operationData) || isAsyncApiOperation(operationData)) {
    return JSON.stringify(operationData.data)
  }

  return stringifyGraphQl((operationData.data ?? {}) as GraphApiSchema)
}

export function joinedJsonPath(data: JsonPath): string {
  return data.join('/')
}

export type JsonPath = PropertyKey[]

type OperationKeysPair = {
  previousOperationKey: Key | undefined
  currentOperationKey: Key | undefined
}

export function safeOperationKeysPair(
  operationKeysPair: OperationKeysPair,
  diffAction: ActionType | undefined,
): OperationKeysPair {
  if (diffAction === DiffAction.remove) {
    return {
      previousOperationKey: operationKeysPair.previousOperationKey ?? operationKeysPair.currentOperationKey!,
      currentOperationKey: undefined,
    }
  }

  if (diffAction === DiffAction.add) {
    return {
      previousOperationKey: undefined,
      currentOperationKey: operationKeysPair.currentOperationKey,
    }
  }

  return operationKeysPair
}
