import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { GroupCompareContent } from './GroupCompareContent'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { ChangesLoadingStatusProvider } from '../ChangesLoadingStatusProvider'
import { GroupCompareSidebar } from './GroupCompareSidebar'
import { COMPARE_PACKAGES_MODE } from '../OperationContent/OperationView/OperationDisplayMode'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { useCompareGroups } from '../../useCompareGroups'
import { CompareRestGroupsDialog } from '../CompareRestGroupsDialog'
import { useParams } from 'react-router-dom'
import { useComparisonParams } from '../useComparisonParams'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { GROUP_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useComparisonObjects } from '@portal/routes/root/PortalPage/VersionPage/useComparisonObjects'
import {
  isOperationsGroupComparison,
  useCompareBreadcrumbs,
} from '@portal/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'

export const GroupComparePage: FC = memo(() => {
  const { group } = useParams()
  const groupsComparisonParams = useComparisonParams()
  const { originPackageKey, originVersionKey, changedPackageKey, changedVersionKey } = groupsComparisonParams
  const previousGroup = useSearchParam(GROUP_SEARCH_PARAM)

  const compareGroupsOptions = useMemo(() => ({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    currentGroup: group,
    previousGroup: previousGroup,
  }), [changedPackageKey, changedVersionKey, group, originPackageKey, originVersionKey, previousGroup])
  const [compareGroups] = useCompareGroups(compareGroupsOptions)

  const tags = useMemo(
    () => (
      isEmpty(compareGroups.operationTypes[0]?.tags)
        ? compareGroups.operationTypes[1]?.tags ?? []
        : compareGroups.operationTypes[0]?.tags ?? []
    ),
    [compareGroups.operationTypes],
  )
  const groupChanges = useMemo(() => compareGroups.data ?? [], [compareGroups.data])

  const [originComparisonObject, changedComparisonObject] = useComparisonObjects({
    ...groupsComparisonParams,
    currentGroup: group,
    previousGroup: previousGroup,
  })
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  return (
    <ChangesLoadingStatusProvider>
      <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
        <VersionsComparisonGlobalParamsContext.Provider value={groupsComparisonParams}>
          <PageLayout
            toolbar={
              <ComparisonToolbar
                compareToolbarMode={COMPARE_PACKAGES_MODE}
                isOperationsGroupCompare={
                  useMemo(() => isOperationsGroupComparison(originComparisonObject, changedComparisonObject),
                    [originComparisonObject, changedComparisonObject],
                  )}
              />
            }
            body={
              <GroupCompareContent
                groupChanges={groupChanges}
                breadcrumbsData={mergedBreadcrumbsData}
              />
            }
            navigation={<GroupCompareSidebar tags={tags} />}
          />
        </VersionsComparisonGlobalParamsContext.Provider>
      </BreadcrumbsDataContext.Provider>
      <CompareRestGroupsDialog />
    </ChangesLoadingStatusProvider>
  )
})
