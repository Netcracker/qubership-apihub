import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { usePackage } from '../../usePackage'
import { PackagePagePlaceholder } from './PackagePagePlaceholder'
import { PackagePageToolbar } from './PackagePageToolbar'
import { useNavigation } from '../../../NavigationProvider'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import {
  PublishDashboardVersionFromCSVDialog,
} from '@portal/routes/root/PortalPage/DashboardPage/PublishDashboardVersionFromCSVDialog'

export const PackagePage: FC = memo(() => {
  const [packageObject, isPackageLoading] = usePackage({ showParents: true })
  const { kind = PACKAGE_KIND } = packageObject ?? {}

  const defaultVersion = packageObject?.defaultVersion
  const { versionKey } = getSplittedVersionKey(defaultVersion)
  const { navigateToOverview } = useNavigation()

  useEffect(() => {
    packageObject?.key && versionKey && navigateToOverview({ packageKey: packageObject?.key, versionKey: versionKey })
  }, [versionKey, navigateToOverview, packageObject?.key])

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
