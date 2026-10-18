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

import { buildOperationPairKey, HandledOperationPairsProvider } from '@apihub/components/HandledOperationPairsProvider'
import { OperationContent } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import {
  COMPARE_SAME_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { useCompareBreadcrumbs } from '@apihub/routes/root/PortalPage/VersionPage/useCompareBreadcrumbs'
import { useComparisonObjects } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonObjects'
import { useComparisonParams } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonParams'
import { groupOperationPairsByTags } from '@apihub/utils/operations'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CONTRACT_TYPE_DDL, getRouteApiTypeTitle, toRouteApiType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { getDdlTableDisplayName } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { OperationData, OperationPair, OperationPairsGroupedByTag, OptionalOperationPair } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationChangeBase } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type {
  DashboardComparisonSummary,
  RefComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { usePackageSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { filterChangesBySeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import { safeOperationKeysPair } from '@netcracker/qubership-apihub-ui-shared/utils/operations'
import {
  DOCUMENT_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useFlatVersionChangelog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import {
  usePagedVersionChangelog,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/useCommonPagedVersionChangelog'
import { Box, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTextSearchParam } from '../../../useTextSearchParam'
import { useVersionSearchParam } from '../../../useVersionSearchParam'
import { useCompareVersions } from '../../useCompareVersions'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useChangesSummaryContext } from '../ChangesSummaryProvider'
import { CompareOperationPathsDialog } from '../CompareOperationPathsDialog'
import { ComparedOperationsContext } from '../ComparedOperationsContext'
import { ComparedDdlContractsContext } from '../ComparedDdlContractsContext'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import type { InternalDocumentOptions } from '../ComparisonToolbar'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { DdlTableSelector } from '../OperationPage/DdlTableSelector'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { ShouldAutoExpandTagsProvider } from '../ShouldAutoExpandTagsProvider'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { useOperation } from '../useOperation'
import { useOperationSearchParam } from '../useOperationSearchParam'
import { DdlTableComparisonContent } from '../VersionContractsSubPage/DdlTableContentView'
import { OperationsSidebarOnComparison } from './OperationsSidebarOnComparison'
import { useDdlEntityComparisonState } from './useDdlEntityComparisonState'

function getOperationPairsFromPackageChanges(
  packageChanges: ReadonlyArray<OperationChangeBase>,
): ReadonlyArray<OperationPair> {
  const operations: OperationPair[] = []
  for (const item of packageChanges) {
    const operationPair: OperationPair = {
      currentOperation: item.currentOperation,
      previousOperation: item.previousOperation,
    }
    operations.push(operationPair)
  }
  return operations
}

export const DifferentOperationVersionsComparisonPage: FC = memo(() => {
  const navigate = useNavigate()

  const { packageId: changedPackageKey, versionId: changedVersionKey, operationId: operationKey, apiType: apiTypeParam } = useParams()
  const apiTypeFromParams = toRouteApiType(apiTypeParam)
  const isDdlComparison = apiTypeFromParams === CONTRACT_TYPE_DDL
  const operationsApiType = isDdlComparison ? undefined : apiTypeFromParams as ApiType
  const [packageSearchParam] = usePackageSearchParam()
  const originPackageKey = packageSearchParam ?? changedPackageKey
  const [versionSearchParam] = useVersionSearchParam()
  const originVersionKey = versionSearchParam
  const [operationPackageKey, operationPackageVersion] = usePackageParamsWithRef()
  const [selectedDocumentSlug] = useDocumentSearchParam()
  const [filters] = useSeverityFiltersSearchParam()
  const [operationSearchParam] = useOperationSearchParam()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard()
  const [searchValue = '', setSearchValue] = useTextSearchParam()

  const compareVersionsOptions = useMemo(() => ({
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
  }), [changedPackageKey, changedVersionKey, originPackageKey, originVersionKey])
  useCompareVersions(compareVersionsOptions)

  const [changesSummary, isContextValid] = useChangesSummaryContext(compareVersionsOptions)
  const changesSummaryReady = !!changesSummary && isContextValid

  const refComparisonSummary: RefComparisonSummary | undefined = useMemo(() => {
    if (!isPackageFromDashboard) {
      return undefined
    }
    return (changesSummary as DashboardComparisonSummary)?.find(summary => {
      return summary.refKey === refPackageKey
    })
  }, [changesSummary, isPackageFromDashboard, refPackageKey])

  const ddlComparisonState = useDdlEntityComparisonState({
    enabled: isDdlComparison,
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    refPackageId: refPackageKey,
    changedEntityPackageKey: !isPackageFromDashboard ? changedPackageKey : refPackageKey,
    changedEntityVersionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.version,
    originEntityPackageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    originEntityVersionKey: !isPackageFromDashboard
      ? originVersionKey
      : refComparisonSummary?.previousVersion,
    ddlEntityId: operationKey,
    severityFilters: filters,
    changesSummaryReady: changesSummaryReady,
  })

  const {
    data: packageChangelog,
    isLoading: arePackageChangesLoading,
    fetchNextPage,
    isFetchingNextPage:
    isNextPageFetching,
    hasNextPage,
    isChangelogReady,
  } = usePagedVersionChangelog({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey,
    previousVersionKey: originVersionKey,
    documentSlug: selectedDocumentSlug,
    searchValue: searchValue,
    packageIdFilter: operationPackageKey ?? refPackageKey,
    enabled: changesSummaryReady && !isDdlComparison,
    apiType: operationsApiType as ApiType,
    page: 1,
    limit: 100,
  })
  const flatPackageChangelog = useFlatVersionChangelog(packageChangelog, isChangelogReady)
  const packageChanges: ReadonlyArray<OperationChangeBase> = flatPackageChangelog.operations

  const operationsFromPackageChanges = useMemo(
    () => (isChangelogReady ? getOperationPairsFromPackageChanges(packageChanges) : []),
    [packageChanges, isChangelogReady],
  )

  useEffect(() => {
    // Fetch next page
    if (!arePackageChangesLoading && !isNextPageFetching && hasNextPage) {
      fetchNextPage()
    }
    // eslint-disable-next-line
  }, [packageChangelog])

  const { currentOperationKey, previousOperationKey } = safeOperationKeysPair({
    currentOperationKey: operationKey,
    previousOperationKey: operationSearchParam ?? operationKey,
  }, undefined)

  // TODO: Add placeholder handling the case if there were no operations matching the original operationKey
  const { data: originOperation, isInitialLoading: isOriginOperationInitialLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? originVersionKey : refComparisonSummary?.previousVersion,
    operationKey: previousOperationKey,
    apiType: operationsApiType as ApiType,
    enabled: !isDdlComparison,
  })
  const { data: changedOperation, isInitialLoading: isChangedOperationInitialLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? changedPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.version,
    operationKey: currentOperationKey,
    apiType: operationsApiType as ApiType,
    enabled: !isDdlComparison,
  })

  const filteredPackageChanges = useMemo(
    () => packageChanges.filter(item => filterChangesBySeverity(filters, item.changeSummary)),
    [packageChanges, filters])

  const operationsFromFilteredPackageChanges = useMemo(
    () => getOperationPairsFromPackageChanges(filteredPackageChanges),
    [filteredPackageChanges],
  )
  const filteredOperationsGroupedByTags: OperationPairsGroupedByTag = useMemo(
    () => groupOperationPairsByTags(operationsFromFilteredPackageChanges),
    [operationsFromFilteredPackageChanges],
  )
  const tags = useMemo(
    () => Array.from(Object.keys(filteredOperationsGroupedByTags)),
    [filteredOperationsGroupedByTags],
  )

  const firstOperationPair = useMemo(
    () => (operationsFromFilteredPackageChanges.length && !searchValue ? operationsFromFilteredPackageChanges[0] : null),
    [operationsFromFilteredPackageChanges, searchValue],
  )

  const packageChangesHaveCurrentOperation = useMemo(
    () => !!searchValue || operationsFromPackageChanges.some(operationPair =>
      operationPair.currentOperation?.operationKey === operationKey ||
      operationPair.previousOperation?.operationKey === operationKey,
    ),
    [operationKey, operationsFromPackageChanges, searchValue],
  )

  const internalDocumentOptions: InternalDocumentOptions = useMemo(
    () => ({
      versionChanges: isDdlComparison ? undefined : flatPackageChangelog,
      ddlChanges: isDdlComparison ? ddlComparisonState.ddlChanges : undefined,
      currentPackageId: !isPackageFromDashboard ? changedPackageKey : refPackageKey,
      currentVersionId: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.version,
      previousPackageId: !isPackageFromDashboard ? originPackageKey : refPackageKey,
      previousVersionId: !isPackageFromDashboard ? originVersionKey : refComparisonSummary?.previousVersion,
    }),
    [
      flatPackageChangelog,
      isDdlComparison,
      ddlComparisonState.ddlChanges,
      isPackageFromDashboard,
      changedPackageKey,
      refPackageKey,
      changedVersionKey,
      refComparisonSummary?.version,
      refComparisonSummary?.previousVersion,
      originPackageKey,
      originVersionKey,
    ],
  )

  useEffect(
    () => {
      if (
        isDdlComparison ||
        !isChangelogReady ||
        isOriginOperationInitialLoading || isChangedOperationInitialLoading ||
        !firstOperationPair || packageChangesHaveCurrentOperation
      ) {
        return
      }
        const firstOperation = firstOperationPair.currentOperation ?? firstOperationPair.previousOperation!
        const firstOperationId = firstOperation.operationKey

        const newPathName = `/portal/packages/${changedPackageKey}/${changedVersionKey}/compare/${apiTypeParam}/${firstOperationId}`
        const searchParams = optionalSearchParams({
          [PACKAGE_SEARCH_PARAM]: { value: originPackageKey },
          [VERSION_SEARCH_PARAM]: { value: originVersionKey },
          [DOCUMENT_SEARCH_PARAM]: { value: selectedDocumentSlug },
          [REF_SEARCH_PARAM]: { value: isPackageFromDashboard && firstOperation.packageRef?.key }, // Assumption that we can't compare operations from different packages
          [FILTERS_SEARCH_PARAM]: { value: filters.join() },
          [OPERATION_SEARCH_PARAM]: {
            value:
              firstOperationPair.currentOperation
                ? firstOperationPair.previousOperation?.operationKey
                : undefined,
          },
        })
        navigate({
          pathname: newPathName,
          search: `${searchParams}`,
        })
    },
    [
      apiTypeParam,
      changedPackageKey,
      changedVersionKey,
      filters,
      firstOperationPair,
      packageChangesHaveCurrentOperation,
      isDdlComparison,
      isPackageFromDashboard,
      navigate,
      originPackageKey,
      originVersionKey,
      selectedDocumentSlug,
      hasNextPage,
      isChangelogReady,
      isOriginOperationInitialLoading,
      isChangedOperationInitialLoading,
    ],
  )

  const comparedOperationsPair: OptionalOperationPair<OperationData> = useMemo(() => ({
    previousOperation: originOperation,
    currentOperation: changedOperation,
    isLoading: isOriginOperationInitialLoading || isChangedOperationInitialLoading,
  }), [originOperation, changedOperation, isOriginOperationInitialLoading, isChangedOperationInitialLoading])

  const comparedDdlContractsPair = useMemo(() => ({
    previousDdlContract: ddlComparisonState.currentChangeEntry?.previousDdlEntityData,
    currentDdlContract: ddlComparisonState.currentChangeEntry?.ddlEntityData,
    isLoading: ddlComparisonState.isContentLoading,
  }), [
    ddlComparisonState.currentChangeEntry,
    ddlComparisonState.isContentLoading,
  ])

  // TODO 31.08.23 // Optimize it!
  // TODO 01.09.23 // Extract to hook? Can we optimize it and reuse some parameters?
  const versionsComparisonParams = useComparisonParams()

  const [originComparisonObject, changedComparisonObject] = useComparisonObjects({
    ...versionsComparisonParams,
    originOperationKey: operationKey,
    changedOperationKey: operationKey,
  })
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  // Store operation pairs that are already opened into cache
  const [handledOperationPairs] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (originOperation || changedOperation) {
      handledOperationPairs.add(buildOperationPairKey({
        currentOperation: changedOperation,
        previousOperation: originOperation,
      }))
    }
  }, [changedOperation, handledOperationPairs, originOperation])
  // ---

  const ddlToolbarTitle = useMemo(() => {
    if (!isDdlComparison) {
      return undefined
    }
    const changeData = ddlComparisonState.currentChangeEntry?.ddlEntityData ??
      ddlComparisonState.currentChangeEntry?.previousDdlEntityData
    const tableName = changeData
      ? getDdlTableDisplayName(changeData)
      : ''
    return (
      <Box display="flex" alignItems="center" mr={2}>
        <Typography
          component="span"
          fontSize="18px"
          fontWeight={600}
          lineHeight="28px"
          data-testid="ToolbarTitle"
        >
          {`Compare ${getRouteApiTypeTitle(CONTRACT_TYPE_DDL)}: ${tableName}`}
        </Typography>
        <DdlTableSelector
          tables={ddlComparisonState.siblingTables}
          isLoading={!ddlComparisonState.isChangelogReady}
          prepareLinkFn={ddlComparisonState.prepareCompareLinkFn}
        />
      </Box>
    )
  }, [
    ddlComparisonState.currentChangeEntry,
    ddlComparisonState.isChangelogReady,
    ddlComparisonState.prepareCompareLinkFn,
    ddlComparisonState.siblingTables,
    isDdlComparison,
  ])

  return (
    <ShouldAutoExpandTagsProvider>
      <SelectedOperationTagsProvider>
        <VersionsComparisonGlobalParamsContext.Provider value={versionsComparisonParams}>
          <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
            <ComparedOperationsContext.Provider value={comparedOperationsPair}>
              <ComparedDdlContractsContext.Provider value={comparedDdlContractsPair}>
              <PageLayout
                toolbar={
                  <ComparisonToolbar
                    compareToolbarMode={COMPARE_SAME_OPERATIONS_MODE}
                    internalDocumentOptions={internalDocumentOptions}
                    ddlEntityChangeSummary={ddlComparisonState.currentChangeEntry?.changeSummary}
                    title={ddlToolbarTitle}
                  />
                }
                navigation={
                  isDdlComparison
                    ? undefined
                    : (
                      <HandledOperationPairsProvider value={handledOperationPairs}>
                        <OperationsSidebarOnComparison
                          operationPackageKey={operationPackageKey!}
                          operationPackageVersion={operationPackageVersion!}
                          searchValue={searchValue}
                          setSearchValue={setSearchValue}
                          tags={tags}
                          apiType={operationsApiType as ApiType}
                          operationsGroupedByTag={filteredOperationsGroupedByTags}
                          areChangesLoading={!isChangelogReady}
                        />
                      </HandledOperationPairsProvider>
                    )
                }
                body={
                  isDdlComparison
                    ? (
                      <DdlTableComparisonContent
                        displayMode={COMPARE_SAME_OPERATIONS_MODE}
                        originRawContent={ddlComparisonState.originTableDetailsData}
                        changedRawContent={ddlComparisonState.changedTableDetailsData}
                        isLoading={ddlComparisonState.isContentLoading}
                        isEntityExist={ddlComparisonState.ddlChangeExists}
                        paddingBottom={VERSION_SWAPPER_HEIGHT}
                      />
                    )
                    : (
                      <OperationContent
                        changedOperation={changedOperation}
                        originOperation={originOperation}
                        isOperationExist={packageChangesHaveCurrentOperation}
                        displayMode={COMPARE_SAME_OPERATIONS_MODE}
                        isLoading={isOriginOperationInitialLoading || isChangedOperationInitialLoading || !isChangelogReady}
                        paddingBottom={VERSION_SWAPPER_HEIGHT}
                      />
                    )
                }
              />
              </ComparedDdlContractsContext.Provider>
            </ComparedOperationsContext.Provider>
          </BreadcrumbsDataContext.Provider>
        </VersionsComparisonGlobalParamsContext.Provider>
        <CompareOperationPathsDialog />
      </SelectedOperationTagsProvider>
    </ShouldAutoExpandTagsProvider>
  )
})
