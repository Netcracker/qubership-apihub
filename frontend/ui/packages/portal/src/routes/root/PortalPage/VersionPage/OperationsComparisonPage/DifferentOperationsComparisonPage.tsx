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

import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { useOperation } from '../useOperation'
import { useOperationLocation } from '../useOperationLocation'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { CompareOperationPathsDialog } from '../CompareOperationPathsDialog'
import { ChangesLoadingStatusProvider } from '../ChangesLoadingStatusProvider'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { ComparedOperationsContext } from '../ComparedOperationsContext'
import { useComparisonParams } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonParams'
import {
  COMPARE_DIFFERENT_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { OperationContent } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { useCompareBreadcrumbs } from '@apihub/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { useComparisonObjects } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonObjects'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { VERSION_SWAPPER_HEIGHT } from '@apihub/routes/root/PortalPage/VersionPage/shared-styles'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

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

  const comparedOperationsPair = {
    left: originOperation,
    right: changedOperation,
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
                toolbar={<ComparisonToolbar compareToolbarMode={COMPARE_DIFFERENT_OPERATIONS_MODE}/>}
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
              <CompareOperationPathsDialog/>
            </SelectedOperationTagsProvider>
          </ChangesLoadingStatusProvider>
        </ComparedOperationsContext.Provider>
      </BreadcrumbsDataContext.Provider>
    </VersionsComparisonGlobalParamsContext.Provider>
  )
})
