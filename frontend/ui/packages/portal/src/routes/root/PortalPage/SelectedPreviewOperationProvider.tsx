import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageRef } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export const SelectedPreviewOperationProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [selectedOperationData, setSelectedOperationData] = useState<SelectedOperationData | undefined>(undefined)

  return (
    <SelectedPreviewOperationContext.Provider value={selectedOperationData}>
      <SetSelectedPreviewOperationContext.Provider value={setSelectedOperationData}>
        {children}
      </SetSelectedPreviewOperationContext.Provider>
    </SelectedPreviewOperationContext.Provider>
  )
})

const SelectedPreviewOperationContext = createContext<SelectedOperationData | undefined>()
const SetSelectedPreviewOperationContext = createContext<Dispatch<SetStateAction<SelectedOperationData | undefined>>>()

export function useSelectedPreviewOperation(): SelectedOperationData | undefined {
  return useContext(SelectedPreviewOperationContext)
}

export function useSetSelectedPreviewOperation(): Dispatch<SetStateAction<SelectedOperationData | undefined>> {
  return useContext(SetSelectedPreviewOperationContext)
}

type SelectedOperationData = {
  operationKey: Key
  packageRef?: PackageRef
}
