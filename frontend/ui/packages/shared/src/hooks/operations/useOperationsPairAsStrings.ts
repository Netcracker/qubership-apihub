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

import { useMemo } from 'react'
import type { OperationData } from '../../entities/operations'
import { stringifyOperation } from '../../utils/operations'

/**
 * Returns pair of operations as pair of strings
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
