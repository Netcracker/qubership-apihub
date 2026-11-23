import { List } from '@mui/material'
import { type FC, memo } from 'react'
import { useParams } from 'react-router-dom'

import type { SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'

import { OverviewNavigationItem } from '@portal/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/OverviewNavigationItem'
import { ACTIVITY_HISTORY_PAGE, OVERVIEW_PAGE, SUMMARY_PAGE } from '../../../../../routes'
import { getLibraryVersionPath } from '../libraryVersion'

export const LibraryOverviewNavigation: FC = memo(() => {
  const { libraryId = '', versionId = '' } = useParams()
  const [, sidebarItem] = useActiveTabs()

  return (
    <List>
      {OVERVIEW_SIDEBAR.map(({ id, title, 'data-testid': dataTestId }) => (
        <OverviewNavigationItem
          key={id}
          url={getLibraryVersionPath(libraryId, versionId, `${OVERVIEW_PAGE}/${id}`)}
          title={title}
          id={id}
          sidebarItem={sidebarItem}
          hasReferenceProblems={false}
          data-testid={dataTestId}
        />
      ))}
    </List>
  )
})
LibraryOverviewNavigation.displayName = 'LibraryOverviewNavigation'

const OVERVIEW_SIDEBAR: SidebarMenu[] = [
  { id: SUMMARY_PAGE, title: 'Summary', 'data-testid': 'SummaryButton' },
  { id: ACTIVITY_HISTORY_PAGE, title: 'Activity History', 'data-testid': 'ActivityHistoryButton' },
]
