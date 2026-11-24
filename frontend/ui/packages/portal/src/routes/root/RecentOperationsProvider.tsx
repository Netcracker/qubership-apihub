import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export const RecentOperationsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [operations, setOperations] = useState<OperationData[]>([])

  return (
    <RecentOperationsContext.Provider value={operations}>
      <SetRecentOperationsContext.Provider value={setOperations}>
        {children}
      </SetRecentOperationsContext.Provider>
    </RecentOperationsContext.Provider>
  )
})

const RecentOperationsContext = createContext<OperationData[]>()
const SetRecentOperationsContext = createContext<Dispatch<SetStateAction<OperationData[]>>>()

export function useRecentOperations(): OperationData[] {
  return useContext(RecentOperationsContext)
}

export function useSetRecentOperations(): Dispatch<SetStateAction<OperationData[]>> {
  return useContext(SetRecentOperationsContext)
}
