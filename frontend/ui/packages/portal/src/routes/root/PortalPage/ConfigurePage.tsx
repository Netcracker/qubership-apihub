import type { FC } from 'react'
import { memo } from 'react'
import { ConfigurePackageVersionPage } from './PackagePage/ConfigurePackageVersionPage'
import { ConfigureDashboardPage } from './DashboardPage/ConfigureDashboardPage'
import { usePackage } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackage'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

export const ConfigurePage: FC = memo(() => {
  const { packageObj } = usePackage({ showParents: true })
  const isDashboard = packageObj?.kind === DASHBOARD_KIND

  return isDashboard ? <ConfigureDashboardPage/> : <ConfigurePackageVersionPage/>
})
