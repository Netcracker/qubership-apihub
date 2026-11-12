import type { OperationData, OptionalOperationPair } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { createContext, useContext } from 'react'

export const ComparedOperationsContext = createContext<OptionalOperationPair<OperationData>>({
  previousOperation: undefined,
  currentOperation: undefined,
  isLoading: true,
})

export function useComparedOperationsPair(): OptionalOperationPair<OperationData> {
  return useContext(ComparedOperationsContext)
}
