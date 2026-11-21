import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { SummaryCard } from './SummaryCard'
import { OverviewSidebar } from './OverviewSidebar'
import type { OverviewPageRoute } from '../../../../../routes'
import {
  ACTIVITY_HISTORY_PAGE,
  OPERATION_GROUPS_PAGE,
  PACKAGES_PAGE,
  REVISION_HISTORY_PAGE,
  SUMMARY_PAGE,
} from '../../../../../routes'
import { Navigate, useParams } from 'react-router-dom'
import { IncludedPackagesCard } from './IncludedPackagesCard'
import { OperationGroupsCard } from './OperationGroupsCard/OperationGroupsCard'
import { getOverviewPath } from '../../../../NavigationProvider'
import { RevisionsHistoryCard } from './RevisionsHistoryCard'
import { ActivityHistoryByPackageCard } from './ActivityHistoryByPackageCard'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { PAGE_TITLES } from '@portal/routes/pageTitles'
import { useVersionPageTitle } from '@portal/routes/useVersionPageTitle'

export const VersionOverviewSubPage: FC = memo(() => {
  const [, sidebarItem] = useActiveTabs()
  useVersionPageTitle(PAGE_TITLES.overview(sidebarItem))
  const { packageId, versionId } = useParams()

  if (!sidebarItem) {
    return <Navigate to={getOverviewPath({ packageKey: packageId!, versionKey: versionId! })} replace/>
  }

  return (
    <PageLayout
      navigation={<OverviewSidebar/>}
      body={OVERVIEW_SUB_PAGE_MAP[sidebarItem as OverviewPageRoute]}
      nestedPage
      data-testid="OverviewTab"
    />
  )
})

const OVERVIEW_SUB_PAGE_MAP: Record<OverviewPageRoute, ReactNode> = {
  [SUMMARY_PAGE]: <SummaryCard/>,
  [ACTIVITY_HISTORY_PAGE]: <ActivityHistoryByPackageCard/>,
  [PACKAGES_PAGE]: <IncludedPackagesCard/>,
  [REVISION_HISTORY_PAGE]: <RevisionsHistoryCard/>,
  [OPERATION_GROUPS_PAGE]: <OperationGroupsCard/>,
}
