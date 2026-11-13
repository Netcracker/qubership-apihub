import type { FC } from 'react'
import { memo } from 'react'
import { Navigate } from 'react-router-dom'
import { usePackage } from '../../usePackage'
import { PackagePagePlaceholder } from './PackagePagePlaceholder'
import { PackagePageToolbar } from './PackagePageToolbar'
import { getOverviewPath } from '../../../NavigationProvider'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import {
  PublishDashboardVersionFromCSVDialog,
} from '@portal/routes/root/PortalPage/DashboardPage/PublishDashboardVersionFromCSVDialog'
import { PAGE_TITLES } from '@portal/routes/pageTitles'
import { getPackageOverviewRedirect } from './packageOverviewRedirect'

export const PackagePage: FC = memo(() => {
  const [packageObject, isPackageLoading] = usePackage({ showParents: true })
  useDocumentTitle(PAGE_TITLES.package(packageObject?.name))
  const { kind = PACKAGE_KIND } = packageObject ?? {}

  const overviewRedirect = getPackageOverviewRedirect(packageObject)
  if (overviewRedirect) {
    return <Navigate to={getOverviewPath(overviewRedirect)} replace/>
  }

  return (
    <>
      {isPackageLoading
        ? <LoadingIndicator/>
        : <PageLayout
          toolbar={<PackagePageToolbar packageObject={packageObject}/>}
          body={<PackagePagePlaceholder kind={kind}/>}
        />}
      {kind === DASHBOARD_KIND && <PublishDashboardVersionFromCSVDialog/>}
    </>
  )
})
