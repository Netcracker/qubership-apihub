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
import { memo, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { CompareOperationPathsDialog } from '../CompareOperationPathsDialog'
import { OperationsSidebarOnComparison } from './OperationsSidebarOnComparison'
import { useVersionSearchParam } from '../../../useVersionSearchParam'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { usePackageSearchParam } from '../../../usePackageSearchParam'
import { useOperation } from '../useOperation'
import { useCompareVersions } from '../../useCompareVersions'
import { useChangesSummaryContext } from '../ChangesSummaryProvider'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { ComparedOperationsContext } from '../ComparedOperationsContext'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useTextSearchParam } from '../../../useTextSearchParam'
import {
  usePagedVersionChangelog,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/useCommonPagedVersionChangelog'
import { ShouldAutoExpandTagsProvider, useSetShouldAutoExpandTagsContext } from '../ShouldAutoExpandTagsProvider'
import { useNavigateToOperation } from '../useNavigateToOperation'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { useFlatVersionChangelog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import type { OperationChangeData } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type {
  DashboardComparisonSummary,
  RefComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { filterChangesBySeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import type { OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { groupOperationsByTags } from '@apihub/utils/operations'
import {
  DOCUMENT_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import {
  COMPARE_SAME_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { OperationContent } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import { useComparisonParams } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonParams'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useCompareBreadcrumbs } from '@apihub/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { useComparisonObjects } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonObjects'

export const DifferentOperationVersionsComparisonPage: FC = memo(() => {
  const navigate = useNavigate()

  const { packageId: changedPackageKey, versionId: changedVersionKey, operationId: operationKey, apiType } = useParams()
  const [packageSearchParam] = usePackageSearchParam()
  const originPackageKey = packageSearchParam ?? changedPackageKey
  const [versionSearchParam] = useVersionSearchParam()
  const originVersionKey = versionSearchParam
  const [operationPackageKey, operationPackageVersion] = usePackageParamsWithRef()
  const [selectedDocumentSlug] = useDocumentSearchParam()
  const [filters] = useSeverityFiltersSearchParam()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard()
  const [searchValue = '', setSearchValue] = useTextSearchParam()

  useCompareVersions({
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
  })

  const [changesSummary, isContextValid] = useChangesSummaryContext({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  })
  const [packageChangelog, arePackageChangesLoading, fetchNextPage, isNextPageFetching, hasNextPage] = usePagedVersionChangelog({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey,
    previousVersionKey: originVersionKey,
    documentSlug: selectedDocumentSlug,
    searchValue: searchValue,
    packageIdFilter: operationPackageKey ?? refPackageKey,
    enabled: !!changesSummary && isContextValid,
    apiType: apiType as ApiType,
    page: 1,
    limit: 100,
  })
  const flatPackageChangelog = useFlatVersionChangelog(packageChangelog)
  const packageChanges: ReadonlyArray<OperationChangeData> = flatPackageChangelog.operations

  useEffect(() => {
    // Fetch next page
    if (!arePackageChangesLoading && !isNextPageFetching && hasNextPage) {
      fetchNextPage()
    }
    // eslint-disable-next-line
  }, [packageChangelog])

  const refComparisonSummary: RefComparisonSummary | undefined = useMemo(() => {
    if (!isPackageFromDashboard) {
      return undefined
    }
    return (changesSummary as DashboardComparisonSummary)?.find(summary => {
      return summary.refKey === refPackageKey
    })
  }, [changesSummary, isPackageFromDashboard, refPackageKey])

  // TODO: Add placeholder handling the case if there were no operations matching the original operationKey
  const { data: originOperation, isInitialLoading: isOriginOperationInitialLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? originVersionKey : refComparisonSummary?.previousVersion,
    operationKey: operationKey,
    apiType: apiType as ApiType,
  })
  const { data: changedOperation, isInitialLoading: isChangedOperationInitialLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? changedPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.version,
    operationKey: operationKey,
    apiType: apiType as ApiType,
  })

  const areChangesAndOperationsLoading = ( arePackageChangesLoading || isOriginOperationInitialLoading || isChangedOperationInitialLoading ) && !hasNextPage

  const filteredPackageChanges = useMemo(
    () => packageChanges.filter(item => filterChangesBySeverity(filters, item.changeSummary)),
    [packageChanges, filters])

  const filteredOperationsGroupedByTags: OperationsGroupedByTag<OperationChangeData> = useMemo(() => groupOperationsByTags(filteredPackageChanges), [filteredPackageChanges])
  const tags = useMemo(() => Array.from(Object.keys(filteredOperationsGroupedByTags)), [filteredOperationsGroupedByTags])

  const firstOperation = useMemo(
    () => (filteredPackageChanges.length && !searchValue ? filteredPackageChanges[0] : null),
    [filteredPackageChanges, searchValue],
  )

  const packageChangesHaveCurrentOperation = useMemo(
    () => !!searchValue || packageChanges.some(operation => operation.operationKey === operationKey),
    [operationKey, packageChanges, searchValue],
  )

  useEffect(() => {
    if (firstOperation && !packageChangesHaveCurrentOperation && !areChangesAndOperationsLoading) {
      const firstOperationId = firstOperation?.operationKey
      const newPathName = `/portal/packages/${changedPackageKey}/${changedVersionKey}/compare/${apiType}/${firstOperationId}`
      const searchParams = optionalSearchParams({
        [PACKAGE_SEARCH_PARAM]: { value: originPackageKey },
        [VERSION_SEARCH_PARAM]: { value: originVersionKey },
        [DOCUMENT_SEARCH_PARAM]: { value: selectedDocumentSlug },
        [REF_SEARCH_PARAM]: { value: isPackageFromDashboard && firstOperation.packageRef?.key },
        [FILTERS_SEARCH_PARAM]: { value: filters.join() },
      })
      navigate({
        pathname: newPathName,
        search: `${searchParams}`,
      })
    }
  }, [apiType, areChangesAndOperationsLoading, changedPackageKey, changedVersionKey, filters, firstOperation, packageChangesHaveCurrentOperation, isPackageFromDashboard, navigate, originPackageKey, originVersionKey, selectedDocumentSlug, hasNextPage])

  const comparedOperationsPair = {
    left: originOperation,
    right: changedOperation,
    isLoading: isOriginOperationInitialLoading || isChangedOperationInitialLoading,
  }

  const setShouldAutoExpand = useSetShouldAutoExpandTagsContext()
  const handleOperationClick = useNavigateToOperation(changedPackageKey!, changedVersionKey!, apiType as ApiType, setShouldAutoExpand)

  // TODO 31.08.23 // Optimize it!
  // TODO 01.09.23 // Extract to hook? Can we optimize it and reuse some parameters?
  const versionsComparisonParams = useComparisonParams()

  const [originComparisonObject, changedComparisonObject] = useComparisonObjects({
    ...versionsComparisonParams,
    originOperationKey: operationKey,
    changedOperationKey: operationKey,
  })
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  return (
    <ShouldAutoExpandTagsProvider>
      <SelectedOperationTagsProvider>
        <VersionsComparisonGlobalParamsContext.Provider value={versionsComparisonParams}>
          <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
            <ComparedOperationsContext.Provider value={comparedOperationsPair}>
              <PageLayout
                toolbar={
                  <ComparisonToolbar
                    compareToolbarMode={COMPARE_SAME_OPERATIONS_MODE}
                    isChangelogAvailable={!!changesSummary && isContextValid}
                  />
                }
                navigation={
                  <OperationsSidebarOnComparison
                    operationPackageKey={operationPackageKey!}
                    operationPackageVersion={operationPackageVersion!}
                    searchValue={searchValue}
                    setSearchValue={setSearchValue}
                    tags={tags}
                    apiType={apiType as ApiType}
                    operationsGroupedByTag={filteredOperationsGroupedByTags}
                    areChangesLoading={arePackageChangesLoading}
                    onOperationClick={handleOperationClick}
                  />
                }
                body={
                  <OperationContent
                    changedOperation={changedOperation}
                    originOperation={originOperation}
                    isOperationExist={packageChangesHaveCurrentOperation}
                    displayMode={COMPARE_SAME_OPERATIONS_MODE}
                    isLoading={areChangesAndOperationsLoading}
                    paddingBottom={VERSION_SWAPPER_HEIGHT}
                  />
                }
              />
            </ComparedOperationsContext.Provider>
          </BreadcrumbsDataContext.Provider>
        </VersionsComparisonGlobalParamsContext.Provider>
        <CompareOperationPathsDialog/>
      </SelectedOperationTagsProvider>
    </ShouldAutoExpandTagsProvider>
  )
})
