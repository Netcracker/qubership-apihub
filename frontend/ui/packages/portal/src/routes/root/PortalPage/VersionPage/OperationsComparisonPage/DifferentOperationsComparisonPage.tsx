import { OperationContent } from '@portal/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import {
  COMPARE_DIFFERENT_OPERATIONS_MODE,
} from '@portal/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { VERSION_SWAPPER_HEIGHT } from '@portal/routes/root/PortalPage/VersionPage/shared-styles'
import { useCompareBreadcrumbs } from '@portal/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { useComparisonObjects } from '@portal/routes/root/PortalPage/VersionPage/useComparisonObjects'
import { useComparisonParams } from '@portal/routes/root/PortalPage/VersionPage/useComparisonParams'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { OperationData, OptionalOperationPair } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { ChangesLoadingStatusProvider } from '../ChangesLoadingStatusProvider'
import { ComparedOperationsContext } from '../ComparedOperationsContext'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { CompareOperationPathsDialog } from '../CompareOperationPathsDialog'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { useOperation } from '../useOperation'
import { useOperationLocation } from '../useOperationLocation'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'

export const DifferentOperationsComparisonPage: FC = memo(() => {
  const { operationId: changedOperationKey, apiType } = useParams()
  const [changedPackageKey, changedVersionKey] = usePackageParamsWithRef()
  const {
    packageKey: originPackageKey,
    versionKey: originVersionKey,
    operationKey: originOperationKey,
  } = useOperationLocation()

  const versionsComparisonParams = useComparisonParams()

  const { data: originOperation, isLoading: isOriginOperationLoading } = useOperation({
    packageKey: originPackageKey ?? changedPackageKey,
    versionKey: originVersionKey ?? changedVersionKey,
    operationKey: originOperationKey,
    apiType: apiType as ApiType,
    enabled: !!changedPackageKey,
  })
  const { data: changedOperation, isLoading: isChangedOperationLoading } = useOperation({
    packageKey: changedPackageKey,
    versionKey: changedVersionKey,
    operationKey: changedOperationKey,
    apiType: apiType as ApiType,
    enabled: !!changedPackageKey,
  })

  const comparedOperationsPair: OptionalOperationPair<OperationData> = {
    previousOperation: originOperation,
    currentOperation: changedOperation,
    isLoading: isOriginOperationLoading || isChangedOperationLoading,
  }

  const [originComparisonObject, changedComparisonObject] = useComparisonObjects({
    ...versionsComparisonParams,
    originOperationKey: originOperationKey,
    changedOperationKey: changedOperationKey || originOperationKey,
    refId: changedPackageKey,
    refVersion: changedVersionKey,
  })
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  return (
    <VersionsComparisonGlobalParamsContext.Provider value={versionsComparisonParams}>
      <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
        <ComparedOperationsContext.Provider value={comparedOperationsPair}>
          <ChangesLoadingStatusProvider>
            <SelectedOperationTagsProvider>
              <LayoutWithToolbar
                toolbar={
                  <ComparisonToolbar
                    compareToolbarMode={COMPARE_DIFFERENT_OPERATIONS_MODE}
                  />
                }
                body={
                  <OperationContent
                    changedOperation={changedOperation}
                    originOperation={originOperation}
                    displayMode={COMPARE_DIFFERENT_OPERATIONS_MODE}
                    isLoading={isOriginOperationLoading || isChangedOperationLoading}
                    paddingBottom={VERSION_SWAPPER_HEIGHT}
                  />
                }
              />
              <CompareOperationPathsDialog />
            </SelectedOperationTagsProvider>
          </ChangesLoadingStatusProvider>
        </ComparedOperationsContext.Provider>
      </BreadcrumbsDataContext.Provider>
    </VersionsComparisonGlobalParamsContext.Provider>
  )
})
