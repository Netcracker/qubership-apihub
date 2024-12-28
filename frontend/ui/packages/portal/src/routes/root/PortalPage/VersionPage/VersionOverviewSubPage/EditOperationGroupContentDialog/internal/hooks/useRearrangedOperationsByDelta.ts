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

import type { OperationListsDelta } from '../types'
import { deepIncludes, isOperationMovedWithAction } from '../utils'
import { useMemo } from 'react'
import type { Operations } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationsMovementDetails } from '@apihub/routes/EventBusProvider'

export type RearrangeOperationsOptions = {
  sourceOperations: Operations | undefined
  oppositeOperations: Operations | undefined
  delta: OperationListsDelta
  excludeFromSourceByAction: OperationsMovementDetails
  includeToDeltaByAction: OperationsMovementDetails
  filtersApplied: boolean
}

export function useRearrangedOperationsByDelta(options: RearrangeOperationsOptions): Operations | undefined {
  const {
    sourceOperations,
    oppositeOperations,
    delta,
    excludeFromSourceByAction,
    includeToDeltaByAction,
    filtersApplied,
  } = options

  return useMemo(() => {
    if (!sourceOperations) {
      return undefined
    }
    return rearrangeOperations(
      sourceOperations,
      oppositeOperations,
      delta,
      excludeFromSourceByAction,
      includeToDeltaByAction,
      filtersApplied,
    )
  }, [sourceOperations, oppositeOperations, delta, excludeFromSourceByAction, includeToDeltaByAction, filtersApplied])
}

export function rearrangeOperations(
  // Parameters are extracted from object due to memoization which is necessary here
  sourceOperations: Operations,
  oppositeOperations: Operations | undefined,
  delta: OperationListsDelta,
  excludeFromSourceByAction: OperationsMovementDetails,
  includeToDeltaByAction: OperationsMovementDetails,
  filtersApplied: boolean,
): Operations {
  return [
    ...sourceOperations
      .filter(operation => {
        return !isOperationMovedWithAction(operation, excludeFromSourceByAction, delta)
      }),
    ...delta
      .filter(delta => {
        const uiFiltersCriteria = !oppositeOperations || !filtersApplied || deepIncludes(oppositeOperations, delta.operation)
        return delta.action === includeToDeltaByAction && uiFiltersCriteria
      })
      .map(delta => delta.operation),
  ]
}
