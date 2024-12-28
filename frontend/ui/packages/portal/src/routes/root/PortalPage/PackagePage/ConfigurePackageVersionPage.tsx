/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { usePackage } from '../../usePackage'
import type { PackageVersionPageRoute } from '../../../../routes'
import { CONFIGURATION_PAGE } from '../../../../routes'
import { NoPackageVersionPlaceholder } from '../../NoPackageVersionPlaceholder'
import { PublishPackageVersionDialog } from '../DashboardPage/PublishPackageVersionDialog'
import { PackageVersionPageToolbar } from './PackageVersionPageToolbar'
import { VersionConfigurationSubPage } from './VersionConfigurationSubPage'
import { PackageVersionNavigationMenu } from './PackageVersionNavigationMenu'
import { CurrentPackageProvider } from '@apihub/components/CurrentPackageProvider'
import { FilesProvider } from '../FilesProvider'
import { PortalSpecificationDialog } from './PortalSpecificationDialog'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { DeleteFileDialog } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/DeleteFileDialog'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { EditFileLabelsDialog } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/EditFileLabelsDialog'

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
        <PublishPackageVersionDialog/>
        <PortalSpecificationDialog/>
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
      tabs={<PackageVersionNavigationMenu/>}
      body={PATH_PARAM_TO_SUB_PAGE_MAP[menuItem]}
    />
  )
})
