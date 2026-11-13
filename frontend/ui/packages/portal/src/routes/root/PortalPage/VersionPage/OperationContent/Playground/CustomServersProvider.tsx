import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import type { CustomServersPackageMap } from './hooks/useCustomServersPackageMap'
import { getCustomServersPackageMapFromLocalStorage } from './hooks/useCustomServersPackageMap'

export const CustomServersProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [customServers, setCustomServers] = useState<CustomServersPackageMap | null>(getCustomServersPackageMapFromLocalStorage)

  return (
    <CustomServersContext.Provider value={customServers}>
      <SetCustomServersContext.Provider value={setCustomServers}>
        {children}
      </SetCustomServersContext.Provider>
    </CustomServersContext.Provider>
  )
})

const CustomServersContext = createContext<CustomServersPackageMap | null>(null)
const SetCustomServersContext = createContext<Dispatch<SetStateAction<CustomServersPackageMap | null>>>()

export function useCustomServersContext(): CustomServersPackageMap | null {
  return useContext(CustomServersContext)
}

export function useSetCustomServersContext(): Dispatch<SetStateAction<CustomServersPackageMap | null>> {
  return useContext(SetCustomServersContext)
}
