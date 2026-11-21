import type { FC } from 'react'
import { memo } from 'react'
import { ConfigurePackageVersionPage } from './PackagePage/ConfigurePackageVersionPage'
import { ConfigureDashboardPage } from './DashboardPage/ConfigureDashboardPage'
import { usePackage } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackage'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PAGE_TITLES } from '@portal/routes/pageTitles'
import { useVersionPageTitle } from '@portal/routes/useVersionPageTitle'

export const ConfigurePage: FC = memo(() => {
  const { packageObj } = usePackage({ showParents: true })
  const isDashboard = packageObj?.kind === DASHBOARD_KIND
  useVersionPageTitle(PAGE_TITLES.configure(packageObj?.kind))

  return isDashboard ? <ConfigureDashboardPage/> : <ConfigurePackageVersionPage/>
})
