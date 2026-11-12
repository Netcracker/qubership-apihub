import type { FC } from 'react'
import { memo } from 'react'
import { OverviewNavigation } from './OverviewNavigation'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'

export const OverviewSidebar: FC = memo(() => {
  return (
    <SidebarPanel
      header={<PageTitle title="Overview"/>}
      body={<OverviewNavigation/>}
    />
  )
})
