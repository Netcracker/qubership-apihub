import { type FC, memo } from 'react'

import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'

import { LibraryOverviewNavigation } from './LibraryOverviewNavigation'

export const LibraryOverviewSidebar: FC = memo(() => (
  <SidebarPanel
    header={<PageTitle title="Overview" />}
    body={<LibraryOverviewNavigation />}
  />
))
LibraryOverviewSidebar.displayName = 'LibraryOverviewSidebar'
