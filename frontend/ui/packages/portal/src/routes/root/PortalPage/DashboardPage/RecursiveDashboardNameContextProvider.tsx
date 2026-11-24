import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'

const RecursiveDashboardNameContext = createContext<string | undefined>()
const SetRecursiveDashboardNameContext = createContext<Dispatch<SetStateAction<string | undefined>>>()

export function useRecursiveDashboardName(): string | undefined {
  return useContext(RecursiveDashboardNameContext)
}

export function useSetRecursiveDashboardName(): Dispatch<SetStateAction<string | undefined>> {
  return useContext(SetRecursiveDashboardNameContext)
}

export const RecursiveDashboardNameContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [key, setKey] = useState<string | undefined>()

  return <RecursiveDashboardNameContext.Provider value={key}>
    <SetRecursiveDashboardNameContext.Provider value={setKey}>
      {children}
    </SetRecursiveDashboardNameContext.Provider>
  </RecursiveDashboardNameContext.Provider>
}
