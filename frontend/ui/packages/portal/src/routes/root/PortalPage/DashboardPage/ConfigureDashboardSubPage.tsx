/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
