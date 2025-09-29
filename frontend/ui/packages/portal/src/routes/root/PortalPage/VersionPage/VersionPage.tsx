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

import { useAutoSetClientValidationStatusBySummary, useValidationSummaryByPackageVersion } from '@apihub/api-hooks/ApiQuality/useValidationSummaryByPackageVersion'
import { CurrentPackageProvider } from '@apihub/components/CurrentPackageProvider'
import { ExportSettingsDialog } from '@apihub/components/ExportSettingsDialog/ui/ExportSettingsDialog'
import { PublishDashboardVersionFromCSVDialog } from '@apihub/routes/root/PortalPage/DashboardPage/PublishDashboardVersionFromCSVDialog'
import { TOGGLE_SIDEBAR_BUTTON } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useLinterEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { PreviousReleaseOptionsProvider } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import type { FC, ReactNode } from 'react'
import { memo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { VersionPageRoute } from '../../../../routes'
import { API_CHANGES_PAGE, API_QUALITY_PAGE, DEPRECATED_PAGE, DOCUMENTS_PAGE, OPERATIONS_PAGE, OVERVIEW_PAGE } from '../../../../routes'
import { ActivityHistoryFiltersProvider } from '../../MainPage/ActivityHistoryFiltersProvider'
import { NoPackagePlaceholder } from '../../NoPackagePlaceholder'
import { NoPackageVersionPlaceholder } from '../../NoPackageVersionPlaceholder'
import { usePackage } from '../../usePackage'
import { FullMainVersionProvider } from '../FullMainVersionProvider'
import { SelectedPreviewOperationProvider } from '../SelectedPreviewOperationProvider'
import { VersionNavigationMenu } from '../VersionNavigationMenu'
import type { ClientValidationStatus } from './ApiQualityValidationSummaryProvider'
import { ApiQualityDataProvider } from './ApiQualityValidationSummaryProvider'
import { OutdatedRevisionNotification } from './OutdatedRevisionNotification/OutdatedRevisionNotification'
import { usePollingForValidationSummaryReadiness } from './usePollingForValidationSummaryReadiness'
import { VersionApiChangesSubPage } from './VersionApiChangesSubPage/VersionApiChangesSubPage'
import { RulesetInfoDialog } from './VersionApiQualitySubPage/components/RulesetInfoDialog/RulesetInfoDialog'
import { VersionApiQualitySubPage } from './VersionApiQualitySubPage/VersionApiQualitySubPage'
import { VersionDeprecatedOperationsSubPage } from './VersionDeprecatedOperationsSubPage/VersionDeprecatedOperationsSubPage'
import { VersionDocumentsSubPage } from './VersionDocumentsSubPage/VersionDocumentsSubPage'
import { VersionOperationsSubPage } from './VersionOperationsSubPage/VersionOperationsSubPage'
import { VersionOverviewSubPage } from './VersionOverviewSubPage/VersionOverviewSubPage'
import { VersionPageToolbar } from './VersionPageToolbar'

export const VersionPage: FC = memo(() => {
  const { packageId, versionId } = useParams()
  const [menuItem] = useActiveTabs()

  const [packageObject, isLoading] = usePackage({ showParents: true })

  const linterEnabled = useLinterEnabled()
  const [validationStatus, setValidationStatus] = useState<ClientValidationStatus | undefined>()
  const {
    data: validationSummary,
    refetch: refetchValidationSummary,
  } = useValidationSummaryByPackageVersion(linterEnabled, packageId!, versionId!, setValidationStatus)
  useAutoSetClientValidationStatusBySummary(validationSummary, setValidationStatus)
  usePollingForValidationSummaryReadiness(validationStatus, setValidationStatus, refetchValidationSummary)

  return (
    <CurrentPackageProvider value={packageObject}>
      <FullMainVersionProvider>
        <ActivityHistoryFiltersProvider>
          <ApiQualityDataProvider
            linterEnabled={linterEnabled}
            validationSummary={validationSummary}
            clientValidationStatus={validationStatus}
            setClientValidationStatus={setValidationStatus}
          >
            <NoPackagePlaceholder packageObject={packageObject} isLoading={isLoading}>
              <NoPackageVersionPlaceholder packageObject={packageObject}>
                <LayoutWithToolbar
                  toolbar={<VersionPageToolbar />}
                  body={<VersionPageBody menuItem={menuItem as VersionPageRoute} />}
                />
                <OutdatedRevisionNotification />
              </NoPackageVersionPlaceholder>
            </NoPackagePlaceholder>
            {packageObject?.kind === DASHBOARD_KIND && <PublishDashboardVersionFromCSVDialog />}
            <ExportSettingsDialog />
            <RulesetInfoDialog />
          </ApiQualityDataProvider>
        </ActivityHistoryFiltersProvider>
      </FullMainVersionProvider>
    </CurrentPackageProvider>
  )
})

const PATH_PARAM_TO_SUB_PAGE_MAP: Record<VersionPageRoute, ReactNode> = {
  [OVERVIEW_PAGE]: <VersionOverviewSubPage />,
  [OPERATIONS_PAGE]: (
    <SelectedPreviewOperationProvider>
      <VersionOperationsSubPage />
    </SelectedPreviewOperationProvider>
  ),
  [API_CHANGES_PAGE]: (
    <PreviousReleaseOptionsProvider>
      <VersionApiChangesSubPage />
    </PreviousReleaseOptionsProvider>
  ),
  [DEPRECATED_PAGE]: (
    <SelectedPreviewOperationProvider>
      <VersionDeprecatedOperationsSubPage />
    </SelectedPreviewOperationProvider>
  ),
  [API_QUALITY_PAGE]: <VersionApiQualitySubPage />,
  [DOCUMENTS_PAGE]: <VersionDocumentsSubPage />,
}

const VERSION_PAGE_MENU_ITEMS = [
  OVERVIEW_PAGE,
  OPERATIONS_PAGE,
  API_CHANGES_PAGE,
  DEPRECATED_PAGE,
  API_QUALITY_PAGE,
  DOCUMENTS_PAGE,
  TOGGLE_SIDEBAR_BUTTON,
]

type VersionPageBodyProps = {
  menuItem: VersionPageRoute
}
const VersionPageBody: FC<VersionPageBodyProps> = memo<VersionPageBodyProps>(({ menuItem }) => {
  return (
    <LayoutWithTabs
      tabs={<VersionNavigationMenu menuItems={VERSION_PAGE_MENU_ITEMS} />}
      body={PATH_PARAM_TO_SUB_PAGE_MAP[menuItem]}
    />
  )
})
