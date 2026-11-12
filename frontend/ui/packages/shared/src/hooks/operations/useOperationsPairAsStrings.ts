import { useMemo } from 'react'
import type { OperationData } from '../../entities/operations'
import { stringifyOperation } from '../../utils/operations'

/**
 * Returns a pair of operations as a pair of strings
 * @deprecated
 * @param originOperation - OperationData or already stringified document
 * @param changedOperation - OperationData or already stringified document
 * @returns transformed to string documents pair or just the same documents if they are already strings
 */
export function useOperationsPairAsStrings(
  originOperation?: OperationData | string | null,
  changedOperation?: OperationData | string | null,
  enabled: boolean = true,
): [string, string] {
  return useMemo(
    () => {
      const originOperationString =
        typeof originOperation === 'string'
          ? originOperation
          : enabled
            ? stringifyOperation(originOperation)
            : ''
      const changedOperationString =
        typeof changedOperation === 'string'
          ? changedOperation
          : enabled
            ? stringifyOperation(changedOperation)
            : ''
      return [originOperationString, changedOperationString]
    },
    [originOperation, enabled, changedOperation],
  )
}

type StringifiedOperationsPair = {
  originOperation: string
  changedOperation: string
}

export function useOperationsPairStringified(
  alreadyStringified?: {
    originOperation?: string
    changedOperation?: string
  },
  stringifyOptions?: {
    originOperation?: OperationData
    changedOperation?: OperationData
    enabled: boolean
  },
): StringifiedOperationsPair {
  return useMemo(() => {
    let originOperationString: string | undefined
    let changedOperationString: string | undefined
    if (alreadyStringified?.originOperation) {
      originOperationString = alreadyStringified.originOperation
    }
    if (alreadyStringified?.changedOperation) {
      changedOperationString = alreadyStringified?.changedOperation
    }
    if (!originOperationString) {
      originOperationString = stringifyOptions?.enabled ? stringifyOperation(stringifyOptions?.originOperation) : undefined
    }
    if (!changedOperationString) {
      changedOperationString = stringifyOptions?.enabled ? stringifyOperation(stringifyOptions?.changedOperation) : undefined
    }
    return {
      originOperation: originOperationString ?? '',
      changedOperation: changedOperationString ?? '',
    }
  }, [alreadyStringified?.changedOperation, alreadyStringified?.originOperation, stringifyOptions?.changedOperation, stringifyOptions?.enabled, stringifyOptions?.originOperation])
}
