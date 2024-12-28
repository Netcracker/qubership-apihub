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
import type { OperationListsDelta } from '../types'
import { OPERATIONS_ADD_TO_GROUP_ACTION, OPERATIONS_REMOVE_FROM_GROUP_ACTION } from '@apihub/routes/EventBusProvider'

export function useGroupOperationsActualCount(
  initialCount: number,
  delta: OperationListsDelta,
): number {
  return useMemo(
    () => getGroupOperationsActualCount(initialCount, delta),
    [initialCount, delta],
  )
}

export function getGroupOperationsActualCount(
  initialCount: number,
  delta: OperationListsDelta,
): number {
  let removedCount = 0, addedCount = 0
  delta.forEach(delta => {
    if (delta.action === OPERATIONS_ADD_TO_GROUP_ACTION) {
      addedCount++
    }
    if (delta.action === OPERATIONS_REMOVE_FROM_GROUP_ACTION) {
      removedCount++
    }
  })
  return initialCount - removedCount + addedCount
}
