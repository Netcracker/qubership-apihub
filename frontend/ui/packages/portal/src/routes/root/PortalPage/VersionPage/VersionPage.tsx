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
import { VersionPageToolbar } from './VersionPageToolbar'
import { VersionApiChangesSubPage } from './VersionApiChangesSubPage/VersionApiChangesSubPage'
import { VersionOperationsSubPage } from './VersionOperationsSubPage/VersionOperationsSubPage'
import { VersionDocumentsSubPage } from './VersionDocumentsSubPage/VersionDocumentsSubPage'
import { usePackage } from '../../usePackage'
import type { VersionPageRoute } from '../../../../routes'
import { API_CHANGES_PAGE, DEPRECATED_PAGE, DOCUMENTS_PAGE, OPERATIONS_PAGE, OVERVIEW_PAGE } from '../../../../routes'
import { VersionOverviewSubPage } from './VersionOverviewSubPage/VersionOverviewSubPage'
import {
  VersionDeprecatedOperationsSubPage,
} from './VersionDeprecatedOperationsSubPage/VersionDeprecatedOperationsSubPage'
import { NoPackageVersionPlaceholder } from '../../NoPackageVersionPlaceholder'
import { CurrentPackageProvider } from '@apihub/components/CurrentPackageProvider'
import { FullMainVersionProvider } from '../FullMainVersionProvider'
import { OutdatedRevisionNotification } from './OutdatedRevisionNotification/OutdatedRevisionNotification'
import { ActivityHistoryFiltersProvider } from '../../MainPage/ActivityHistoryFiltersProvider'
import { NoPackagePlaceholder } from '../../NoPackagePlaceholder'
import { SelectedPreviewOperationProvider } from '../SelectedPreviewOperationProvider'
import { VersionNavigationMenu } from '../VersionNavigationMenu'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { PreviousReleaseOptionsProvider } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import { TOGGLE_SIDEBAR_BUTTON } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'

export const VersionPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  const [packageObject, isLoading] = usePackage({ showParents: true })

  return (
    <CurrentPackageProvider value={packageObject}>
      <FullMainVersionProvider>
        <ActivityHistoryFiltersProvider>
          <NoPackagePlaceholder packageObject={packageObject} isLoading={isLoading}>
            <NoPackageVersionPlaceholder packageObject={packageObject}>
              <LayoutWithToolbar
                toolbar={<VersionPageToolbar/>}
                body={<VersionPageBody menuItem={menuItem as VersionPageRoute}/>}
              />
              <OutdatedRevisionNotification/>
            </NoPackageVersionPlaceholder>
          </NoPackagePlaceholder>
        </ActivityHistoryFiltersProvider>
      </FullMainVersionProvider>
    </CurrentPackageProvider>
  )
})

const PATH_PARAM_TO_SUB_PAGE_MAP: Record<VersionPageRoute, ReactNode> = {
  [OVERVIEW_PAGE]: <VersionOverviewSubPage/>,
  [OPERATIONS_PAGE]: (
    <SelectedPreviewOperationProvider>
      <VersionOperationsSubPage/>
    </SelectedPreviewOperationProvider>
  ),
  [API_CHANGES_PAGE]: (
    <PreviousReleaseOptionsProvider>
      <VersionApiChangesSubPage/>
    </PreviousReleaseOptionsProvider>
  ),
  [DEPRECATED_PAGE]: (
    <SelectedPreviewOperationProvider>
      <VersionDeprecatedOperationsSubPage/>
    </SelectedPreviewOperationProvider>
  ),
  [DOCUMENTS_PAGE]: <VersionDocumentsSubPage/>,
}

const VERSION_PAGE_MENU_ITEMS = [
  OVERVIEW_PAGE,
  OPERATIONS_PAGE,
  API_CHANGES_PAGE,
  DEPRECATED_PAGE,
  DOCUMENTS_PAGE,
  TOGGLE_SIDEBAR_BUTTON,
]

type VersionPageBodyProps = {
  menuItem: VersionPageRoute
}
const VersionPageBody: FC<VersionPageBodyProps> = memo<VersionPageBodyProps>(({ menuItem }) => {
  return (
    <LayoutWithTabs
      tabs={<VersionNavigationMenu menuItems={VERSION_PAGE_MENU_ITEMS}/>}
      body={PATH_PARAM_TO_SUB_PAGE_MAP[menuItem]}
    />
  )
})
