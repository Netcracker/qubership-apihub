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
import { memo, useMemo } from 'react'
import { VersionCompareContent } from './VersionCompareContent'
import type { CompareToolbarMode } from '../ComparisonToolbar'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { CompareVersionsDialog } from '../CompareVersionsDialog/CompareVersionsDialog'
import { CompareRevisionsDialog } from '../CompareRevisionsDialog'
import { ChangesLoadingStatusProvider } from '../ChangesLoadingStatusProvider'
import { usePackageKind } from '../../usePackageKind'
import { DashboardsCompareContent } from './DashboardsCompareContent'
import { VersionCompareSidebar } from './VersionCompareSidebar'
import { useCompareVersions } from '../../useCompareVersions'
import { COMPARE_DASHBOARDS_MODE, COMPARE_PACKAGES_MODE } from '../OperationContent/OperationView/OperationDisplayMode'
import { useRefSearchParam } from '../../useRefSearchParam'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { useComparisonParams } from '../useComparisonParams'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { DASHBOARD_KIND } from '../../../../../../server/mocks/packages/types'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useCompareBreadcrumbs } from '@apihub/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { useComparisonObjects } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonObjects'

export const VersionComparePage: FC = memo(() => {
  const [mainPackageKind] = usePackageKind()
  const [refPackageKey] = useRefSearchParam()
  const isDashboardsComparison = mainPackageKind === DASHBOARD_KIND && !refPackageKey

  const versionsComparisonParams = useComparisonParams()
  const { originPackageKey, originVersionKey, changedPackageKey, changedVersionKey } = versionsComparisonParams

  useCompareVersions({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  })

  const [originComparisonObject, changedComparisonObject] = useComparisonObjects(versionsComparisonParams)
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  const [compareToolbarMode, compareContentComponent, sidebarComponent]: [CompareToolbarMode, ReactNode, ReactNode] = useMemo(
    () => (isDashboardsComparison
      ? [COMPARE_DASHBOARDS_MODE, <DashboardsCompareContent/>, undefined]
      : [COMPARE_PACKAGES_MODE, <VersionCompareContent/>, <VersionCompareSidebar/>]),
    [isDashboardsComparison],
  )

  return (
    <ChangesLoadingStatusProvider>
      <VersionsComparisonGlobalParamsContext.Provider value={versionsComparisonParams}>
        <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
          <PageLayout
            toolbar={<ComparisonToolbar compareToolbarMode={compareToolbarMode}/>}
            body={compareContentComponent}
            navigation={sidebarComponent}
          />
        </BreadcrumbsDataContext.Provider>
      </VersionsComparisonGlobalParamsContext.Provider>
      <CompareVersionsDialog/>
      <CompareRevisionsDialog/>
    </ChangesLoadingStatusProvider>
  )
})
