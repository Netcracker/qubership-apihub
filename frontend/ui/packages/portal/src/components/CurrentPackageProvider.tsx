import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext } from 'react'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

type CurrentPackageProviderProps = PropsWithChildren & {
  value: Package | null
}

const CurrentPackageContext = createContext<Package | null>(null)

export function useCurrentPackage(): Package | null {
  return useContext(CurrentPackageContext)
}

export const CurrentPackageProvider: FC<CurrentPackageProviderProps> = ({ children, value }) => {
  return (
    <CurrentPackageContext.Provider value={value}>
      {children}
    </CurrentPackageContext.Provider>
  )
}
