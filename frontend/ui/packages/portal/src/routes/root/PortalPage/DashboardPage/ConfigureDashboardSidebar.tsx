import type { FC } from 'react'
import { memo } from 'react'
import { ConfigureDashboardNavigation } from './ConfigureDashboardNavigation'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'

export const ConfigureDashboardSidebar: FC = memo(() => {
  return (
    <SidebarPanel
      header={<PageTitle title="Configuration"/>}
      body={<ConfigureDashboardNavigation/>}
    />
  )
})
