import type { Dispatch, FC, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { ConfigureDashboardBody } from './ConfigureDashboardBody'
import { ConfigureDashboardSidebar } from './ConfigureDashboardSidebar'
import type { ConfigureDashboardTabs } from './configure-dashboard'
import { PACKAGES_CONFIGURE_DASHBOARD_TAB } from './configure-dashboard'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

export const ConfigureDashboardSubPage: FC = memo(() => {
  const [activeTab, setActiveTab] = useState<ConfigureDashboardTabs>(PACKAGES_CONFIGURE_DASHBOARD_TAB)
  return (
    <ActiveTabConfigureDashboard.Provider value={activeTab}>
      <SetActiveTabConfigureDashboard.Provider value={setActiveTab}>
        <PageLayout
          navigation={<ConfigureDashboardSidebar/>}
          body={<ConfigureDashboardBody/>}
          nestedPage
        />
      </SetActiveTabConfigureDashboard.Provider>
    </ActiveTabConfigureDashboard.Provider>
  )
})

const ActiveTabConfigureDashboard = createContext<ConfigureDashboardTabs>()
const SetActiveTabConfigureDashboard = createContext<Dispatch<SetStateAction<ConfigureDashboardTabs>>>()

export function useActiveTabConfigureDashboard(): ConfigureDashboardTabs {
  return useContext(ActiveTabConfigureDashboard)
}

export function useSetActiveTabConfigureDashboard(): Dispatch<SetStateAction<ConfigureDashboardTabs>> {
  return useContext(SetActiveTabConfigureDashboard)
}
