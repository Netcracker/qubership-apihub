import { type FC, memo, type ReactNode, useMemo } from 'react'

import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import { useCompareBreadcrumbs } from '@portal/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { useComparisonObjects } from '@portal/routes/root/PortalPage/VersionPage/useComparisonObjects'
import { useCompareVersions } from '../../useCompareVersions'
import { usePackageKind } from '../../usePackageKind'
import { useRefSearchParam } from '../../useRefSearchParam'
import { ChangesLoadingStatusProvider } from '../ChangesLoadingStatusProvider'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { CompareRevisionsDialog } from '../CompareRevisionsDialog'
import { CompareVersionsDialog } from '../CompareVersionsDialog/CompareVersionsDialog'
import { type CompareToolbarMode, ComparisonToolbar } from '../ComparisonToolbar'
import { COMPARE_DASHBOARDS_MODE, COMPARE_PACKAGES_MODE } from '../OperationContent/OperationView/OperationDisplayMode'
import { useComparisonParams } from '../useComparisonParams'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { DashboardsCompareContent } from './DashboardsCompareContent'
import { useVersionCompareSidebar } from './useVersionCompareSidebar'
import { VersionCompareContent } from './VersionCompareContent'

export const VersionComparePage: FC = memo(() => {
  const [mainPackageKind] = usePackageKind()
  const [refPackageKey] = useRefSearchParam()
  const isDashboardsComparison = mainPackageKind === DASHBOARD_KIND && !refPackageKey

  const versionsComparisonParams = useComparisonParams()
  const { originPackageKey, originVersionKey, changedPackageKey, changedVersionKey } = versionsComparisonParams

  const compareVersionsOptions = useMemo(() => ({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  }), [changedPackageKey, changedVersionKey, originPackageKey, originVersionKey])
  useCompareVersions(compareVersionsOptions)

  const [originComparisonObject, changedComparisonObject] = useComparisonObjects(versionsComparisonParams)
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  const compareSidebar = useVersionCompareSidebar(isDashboardsComparison)

  const [compareToolbarMode, compareContentComponent, sidebarComponent]: [
    CompareToolbarMode,
    ReactNode,
    ReactNode | undefined,
  ] = useMemo(
    () => (isDashboardsComparison
      ? [COMPARE_DASHBOARDS_MODE, <DashboardsCompareContent />, undefined]
      : [COMPARE_PACKAGES_MODE, <VersionCompareContent />, compareSidebar]),
    [isDashboardsComparison, compareSidebar],
  )

  return (
    <ChangesLoadingStatusProvider>
      <VersionsComparisonGlobalParamsContext.Provider value={versionsComparisonParams}>
        <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
          <PageLayout
            toolbar={<ComparisonToolbar compareToolbarMode={compareToolbarMode} />}
            body={compareContentComponent}
            navigation={sidebarComponent}
          />
        </BreadcrumbsDataContext.Provider>
      </VersionsComparisonGlobalParamsContext.Provider>
      <CompareVersionsDialog />
      <CompareRevisionsDialog />
    </ChangesLoadingStatusProvider>
  )
})
