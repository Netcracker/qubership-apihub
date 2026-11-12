import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { usePackage } from '../../usePackage'
import type { PackageVersionPageRoute } from '../../../../routes'
import { CONFIGURATION_PAGE } from '../../../../routes'
import { NoPackageVersionPlaceholder } from '../../NoPackageVersionPlaceholder'
import { PublishPackageVersionDialog } from '../DashboardPage/PublishPackageVersionDialog'
import { PackageVersionPageToolbar } from './PackageVersionPageToolbar'
import { VersionConfigurationSubPage } from './VersionConfigurationSubPage'
import { ConfigureVersionNavigationMenu } from '../ConfigureVersionNavigationMenu'
import { CurrentPackageProvider } from '@portal/components/CurrentPackageProvider'
import { FilesProvider } from '../FilesProvider'
import { PortalSpecificationDialog } from './PortalSpecificationDialog'
import { PortalPublicationErrorReportDialog } from './PortalPublicationErrorReportDialog'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { DeleteFileDialog } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/DeleteFileDialog'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { EditFileLabelsDialog } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/EditFileLabelsDialog'
import { McpEndpointDialog } from '@portal/routes/root/PortalPage/PackagePage/McpEndpointDialog'
import { McpRenameEndpointDialog } from '@portal/routes/root/PortalPage/PackagePage/McpRenameEndpointDialog'
import { McpDuplicateKindDialog } from '@portal/routes/root/PortalPage/PackagePage/McpDuplicateKindDialog'

export const ConfigurePackageVersionPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  const [packageObject] = usePackage({ showParents: true })
  const isPackage = packageObject?.kind === PACKAGE_KIND

  return (
    <CurrentPackageProvider value={packageObject}>
      <FilesProvider enabled={isPackage}>
        <NoPackageVersionPlaceholder packageObject={packageObject}>
          <LayoutWithToolbar
            toolbar={<PackageVersionPageToolbar/>}
            body={<PackageVersionPageBody menuItem={menuItem as PackageVersionPageRoute}/>}
          />
        </NoPackageVersionPlaceholder>
        <DeleteFileDialog/>
        <EditFileLabelsDialog/>
        <McpEndpointDialog/>
        <McpRenameEndpointDialog/>
        <McpDuplicateKindDialog/>
        <PublishPackageVersionDialog/>
        <PortalSpecificationDialog/>
        <PortalPublicationErrorReportDialog/>
      </FilesProvider>
    </CurrentPackageProvider>
  )
})

const PATH_PARAM_TO_SUB_PAGE_MAP: Record<PackageVersionPageRoute, ReactNode> = {
  [CONFIGURATION_PAGE]: <VersionConfigurationSubPage/>,
}

type PackageVersionPageBodyProps = {
  menuItem: PackageVersionPageRoute
}

const PackageVersionPageBody: FC<PackageVersionPageBodyProps> = memo<PackageVersionPageBodyProps>(({ menuItem }) => {
  return (
    <LayoutWithTabs
      tabs={<ConfigureVersionNavigationMenu/>}
      body={PATH_PARAM_TO_SUB_PAGE_MAP[menuItem]}
    />
  )
})
