import { useMemo } from 'react'
import type { OperationListsDelta } from '../types'
import { OPERATIONS_ADD_TO_GROUP_ACTION, OPERATIONS_REMOVE_FROM_GROUP_ACTION } from '@portal/routes/EventBusProvider'

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
