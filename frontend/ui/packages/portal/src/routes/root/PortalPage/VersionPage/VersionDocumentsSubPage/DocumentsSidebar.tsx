import type { FC } from 'react'
import { memo } from 'react'
import { DocNavigation } from './DocNavigation'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'

export const DocumentsSidebar: FC = memo(() => {
  return (
    <SidebarPanel
      header={<PageTitle title="Documents"/>}
      body={<DocNavigation/>}
      withDivider
    />
  )
})
