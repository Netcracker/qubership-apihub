import type { FC } from 'react'
import { memo } from 'react'
import { ConfigureDashboardToolbar } from './ConfigureDashboardToolbar'
import { AddPackageDialog } from './AddPackageDialog'
import { usePackage } from '../../usePackage'
import { PublishPackageVersionDialog } from './PublishPackageVersionDialog'
import { DashboardReferencesContextProvider } from './DashboardReferencesProvider'
import { NoPackageVersionPlaceholder } from '../../NoPackageVersionPlaceholder'
import { ConfigureDashboardSubPage } from './ConfigureDashboardSubPage'
import { ConfigureVersionNavigationMenu } from '../ConfigureVersionNavigationMenu'
import { RecursiveDashboardNameContextProvider } from './RecursiveDashboardNameContextProvider'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

export const ConfigureDashboardPage: FC = memo(() => {
  const [packageObject] = usePackage({ showParents: true })

  return (
    <DashboardReferencesContextProvider>
      <RecursiveDashboardNameContextProvider>
        <NoPackageVersionPlaceholder packageObject={packageObject}>
          <PageLayout
            toolbar={<ConfigureDashboardToolbar packageObject={packageObject}/>}
            menu={<ConfigureVersionNavigationMenu/>}
            body={<ConfigureDashboardSubPage/>}
          />
        </NoPackageVersionPlaceholder>
        <AddPackageDialog packageObject={packageObject}/>
        <PublishPackageVersionDialog/>
      </RecursiveDashboardNameContextProvider>
    </DashboardReferencesContextProvider>
  )
})
