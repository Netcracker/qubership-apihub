import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'
import type { PackageReferenceWithStatus } from './configure-dashboard'

const DashboardReferencesContext = createContext<PackageReferenceWithStatus[]>()
const SetDashboardReferencesContext = createContext<Dispatch<SetStateAction<PackageReferenceWithStatus[]>>>()

export function useDashboardReferences(): PackageReferenceWithStatus[] {
  return useContext(DashboardReferencesContext)
}

export function useSetDashboardReferences(): Dispatch<SetStateAction<PackageReferenceWithStatus[]>> {
  return useContext(SetDashboardReferencesContext)
}

export const DashboardReferencesContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [references, setReferences] = useState<PackageReferenceWithStatus[]>([])

  return <DashboardReferencesContext.Provider value={references}>
    <SetDashboardReferencesContext.Provider value={setReferences}>
      {children}
    </SetDashboardReferencesContext.Provider>
  </DashboardReferencesContext.Provider>
}
