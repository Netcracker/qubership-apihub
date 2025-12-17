import type { OperationPair } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext } from 'react'

type OperationPairKey = string

const HandledOperationPairsContext = createContext<Set<OperationPairKey> | undefined>(undefined)

type HandledOperationPairsProviderProps = {
  value: Set<OperationPairKey>
} & PropsWithChildren

export function useHandledOperationPairsContext(): Set<OperationPairKey> | undefined {
  return useContext(HandledOperationPairsContext)
}

export const HandledOperationPairsProvider: FC<HandledOperationPairsProviderProps> = ({ value, children }) => {
  return (
    <HandledOperationPairsContext.Provider value={value}>
      {children}
    </HandledOperationPairsContext.Provider>
  )
}

export function buildOperationPairKey(operationPair: OperationPair): OperationPairKey {
  return `${operationPair.currentOperation?.operationKey}-${operationPair.previousOperation?.operationKey}`
}
