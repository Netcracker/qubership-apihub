import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useContext } from 'react'
import { usePortalPageSettings } from '@portal/routes/usePortalPageSettings'
import type { ExtendedPageSettingsState } from '@netcracker/qubership-apihub-ui-shared/hooks/storages/usePageSettingsState'

export const PortalPageSettingsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const content = usePortalPageSettings()

  return (
    <PortalPageSettings.Provider value={content}>
      {children}
    </PortalPageSettings.Provider>
  )
})

export function usePortalPageSettingsContext(): ExtendedPageSettingsState {
  return useContext(PortalPageSettings)
}

const PortalPageSettings = createContext<ExtendedPageSettingsState>()
