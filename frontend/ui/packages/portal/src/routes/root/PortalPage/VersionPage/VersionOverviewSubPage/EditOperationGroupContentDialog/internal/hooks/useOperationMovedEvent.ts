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

import { useEvent } from 'react-use'
import type { OperationListsDelta } from '../types'
import type { Dispatch, SetStateAction } from 'react'
import { deepIncludes } from '../utils'
import type { Operation, Operations } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  OPERATION_MOVED,
  OPERATIONS_ADD_TO_GROUP_ACTION,
  OPERATIONS_REMOVE_FROM_GROUP_ACTION,
} from '@apihub/routes/EventBusProvider'

export function useOperationMovedEvent(options: {
  checkedOperations: Operations
  checkedGroupOperations: Operations
  operations: Operations
  groupOperations: Operations
  operationListsDelta: OperationListsDelta
  setOperationListsDelta: Dispatch<SetStateAction<OperationListsDelta>>
  resetCheckedAllOperations: () => void
}): void {
  const {
    checkedOperations,
    checkedGroupOperations,
    operations,
    groupOperations,
    operationListsDelta,
    setOperationListsDelta,
    resetCheckedAllOperations,
  } = options

  useEvent(
    OPERATION_MOVED,
    (e) => {
      const action = e.detail as string
      if (action === OPERATIONS_ADD_TO_GROUP_ACTION) {
        const addedOperations: OperationListsDelta = []
        const returnedBackOperationsIds: Operation[] = []
        checkedOperations.forEach(checkedOperation => {
          const operationFromInitialList = deepIncludes(operations, checkedOperation)
          const groupOperationFromInitialList = deepIncludes(groupOperations, checkedOperation)
          if (!operationFromInitialList && groupOperationFromInitialList) {
            returnedBackOperationsIds.push(checkedOperation)
          } else if (!groupOperationFromInitialList && operationFromInitialList) {
            addedOperations.push({
              operation: checkedOperation,
              action: OPERATIONS_ADD_TO_GROUP_ACTION,
            })
          }
        })
        let newDelta = operationListsDelta.filter(deltaOperation => !returnedBackOperationsIds.includes(deltaOperation.operation))
        newDelta = [...newDelta, ...addedOperations]
        setOperationListsDelta(newDelta)
      } else if (action === OPERATIONS_REMOVE_FROM_GROUP_ACTION) {
        const removedOperations: OperationListsDelta = []
        const returnedBackOperations: Operation[] = []
        checkedGroupOperations.forEach(checkedOperation => {
          const operationFromInitialList = deepIncludes(operations, checkedOperation)
          const groupOperationFromInitialList = deepIncludes(groupOperations, checkedOperation)
          if (!groupOperationFromInitialList && operationFromInitialList) {
            returnedBackOperations.push(checkedOperation)
          } else if (!operationFromInitialList && groupOperationFromInitialList) {
            removedOperations.push({
              operation: checkedOperation,
              action: OPERATIONS_REMOVE_FROM_GROUP_ACTION,
            })
          }
        })
        let newDelta = operationListsDelta.filter(deltaOperation => !returnedBackOperations.includes(deltaOperation.operation))
        newDelta = [...newDelta, ...removedOperations]
        setOperationListsDelta(newDelta)
      }

      resetCheckedAllOperations()
    },
  )
}
