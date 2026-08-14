import type { DdlContractEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { createContext, useContext } from 'react'

export type DdlContractPair = {
  currentDdlContract?: DdlContractEntity
  previousDdlContract?: DdlContractEntity
}

export type OptionalDdlContractPair = DdlContractPair & {
  isLoading: boolean
}

export const ComparedDdlContractsContext = createContext<OptionalDdlContractPair>({
  previousDdlContract: undefined,
  currentDdlContract: undefined,
  isLoading: true,
})

export function useComparedDdlContractsPair(): OptionalDdlContractPair {
  return useContext(ComparedDdlContractsContext)
}
