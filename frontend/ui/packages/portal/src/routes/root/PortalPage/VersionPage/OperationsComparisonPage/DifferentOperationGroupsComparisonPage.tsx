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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { CompareOperationPathsDialog } from '../CompareOperationPathsDialog'
import { OperationsSidebarOnComparison } from './OperationsSidebarOnComparison'
import { useVersionSearchParam } from '../../../useVersionSearchParam'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { usePackageSearchParam } from '../../../usePackageSearchParam'
import { useOperation } from '../useOperation'
import type { OperationChangesDto } from '@netcracker/qubership-apihub-api-processor'
import { convertToSlug } from '@netcracker/qubership-apihub-api-processor'
import { useChangesSummaryContext } from '../ChangesSummaryProvider'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { ComparedOperationsContext } from '../ComparedOperationsContext'
import { isOperationGrouped } from '../useOperationsGroupedByTags'
import { useCompareBreadcrumbs } from '../useCompareBreadcrumbs'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useCompareGroups } from '../../useCompareGroups'
import { useComparisonParams } from '../useComparisonParams'
import { usePackage } from '../../../usePackage'
import { useNavigation } from '../../../../NavigationProvider'
import { ShouldAutoExpandTagsProvider, useSetShouldAutoExpandTagsContext } from '../ShouldAutoExpandTagsProvider'
import { useNavigateToOperation } from '../useNavigateToOperation'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  DOCUMENT_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  GROUP_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type {
  DashboardComparisonSummary,
  RefComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import type { OperationChangeData } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type {
  ApiKind,
  Operation,
  OperationsGroupedByTag,
  RestOperation,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  isOperationChangeDataArray,
  isOperationDataArray,
  isRestOperation,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { filterChangesBySeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import {
  getActionForOperation,
  groupOperationsByTags,
  isFullyAddedOrRemovedOperationChange,
} from '@apihub/utils/operations'
import { REPLACE_ACTION_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import {
  COMPARE_SAME_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { OperationContent } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import { useComparisonObjects } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonObjects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ActionType } from '@netcracker/qubership-apihub-api-diff'

export const DifferentOperationGroupsComparisonPage: FC = memo(() => {
  const previousGroup = useSearchParam(GROUP_SEARCH_PARAM)
  const {
    packageId: changedPackageKey,
    versionId: changedVersionKey,
    operationId: operationKey,
    group,
    apiType,
  } = useParams()
  const [packageSearchParam] = usePackageSearchParam()
  const [packageObj] = usePackage()
  const originPackageKey = packageSearchParam ?? changedPackageKey
  const [versionSearchParam] = useVersionSearchParam()
  const originVersionKey = versionSearchParam
  const [operationPackageKey, operationPackageVersion] = usePackageParamsWithRef()
  const [selectedDocumentSlug] = useDocumentSearchParam()
  const [filters] = useSeverityFiltersSearchParam()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard()

  const { navigateToFirstGroupOperation } = useNavigation()

  const [searchValue, setSearchValue] = useState('')

  const [compareGroups, isComparisonLoading] = useCompareGroups({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    currentGroup: group,
    previousGroup: previousGroup,
  })

  const operationAction = useMemo((): ActionType | string => {
    const targetChange = compareGroups?.data?.find(
      element => element.operationId === operationKey && isFullyAddedOrRemovedOperationChange(element),
    )?.changes?.[0]

    return isEmpty(compareGroups?.data) ? '' : targetChange?.action ?? 'rename'
  }, [compareGroups, operationKey])

  const [changesSummary] = useChangesSummaryContext({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    currentGroup: group,
    previousGroup: previousGroup,
  })

  const refComparisonSummary: RefComparisonSummary | undefined = useMemo(() => {
    if (!isPackageFromDashboard) {
      return undefined
    }
    return (changesSummary as DashboardComparisonSummary)?.find(summary => {
      return summary.refKey === refPackageKey
    })
  }, [changesSummary, isPackageFromDashboard, refPackageKey])

  const restGroupingPrefix = packageObj?.restGroupingPrefix

  const { data: originOperation, isLoading: isOriginOperationLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.previousVersion,
    enabled: actionForOriginalOperation.includes(operationAction) && !!restGroupingPrefix,
    apiType: apiType as ApiType,
    operationKey: operationAction === 'rename'
      ? `${getFullGroupForOperation(restGroupingPrefix, previousGroup!)}-${operationKey}`
      : operationKey,
  })

  const { data: changedOperation, isLoading: isChangedOperationLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.version,
    enabled: actionForChangedOperation.includes(operationAction) && !!restGroupingPrefix,
    apiType: apiType as ApiType,
    operationKey: operationAction === 'rename'
      ? `${getFullGroupForOperation(restGroupingPrefix, group!)}-${operationKey}`
      : operationKey,
  })

  const areChangesAndOperationsLoading = isOriginOperationLoading && isChangedOperationLoading
  const operationsGroupedByTags: OperationsGroupedByTag<OperationChangeData> = useMemo(() => {
    const filteredChanges: OperationChangesDto[] = compareGroups.data?.filter(
      operationChange => filterChangesBySeverity(filters, operationChange.changeSummary),
    ) ?? []

    const transformedOps = filteredChanges?.map(change => {
      const action = getActionForOperation(change, REPLACE_ACTION_TYPE)
      return {
        operationKey: change.operationId,
        title: change.metadata?.title,
        apiKind: change.apiType as ApiKind,
        changeSummary: change.changeSummary,
        action: action,
        dataHash: change.dataHash,
        method: change.metadata?.method,
        path: change.metadata?.path,
        tags: change.metadata?.tags,
      } as OperationChangeData
    })

    return groupOperationsByTags(transformedOps)
  }, [compareGroups.data, filters])
  const tags = useMemo(() => Array.from(Object.keys(operationsGroupedByTags)), [operationsGroupedByTags])

  const filterGroupedOperations = useCallback((property: keyof Pick<RestOperation, 'method' | 'path' | 'title'>) =>
      (operation: Operation): boolean => isRestOperation(operation) &&
        !Array.isArray(operation[property]) &&
        operation[property]?.toLowerCase().includes(searchValue.toLowerCase()),
    [searchValue])

  const filterOperations = useCallback((filterFunction: (operation: Operation) => boolean): OperationsGroupedByTag<OperationChangeData> => {
    return Object.fromEntries(
      Object.entries(operationsGroupedByTags).map(([tag, operations]) => [
        tag,
        isOperationDataArray(operations)
          ? operations.filter(filterFunction)
          : isOperationChangeDataArray(operations)
            ? operations.filter(filterFunction)
            : operations,
      ]),
    )
  }, [operationsGroupedByTags])

  const filteredOperationsGroupedByTags = useMemo(() => {
    if (searchValue) {
      let filterResult = filterOperations(filterGroupedOperations('title'))

      if (httpMethods.includes(searchValue.toUpperCase())) {
        filterResult = {
          ...filterResult,
          ...filterOperations(filterGroupedOperations('method')),
        }
      }
      if (searchValue.includes('/') || searchValue.includes('api')) {
        filterResult = {
          ...filterResult,
          ...filterOperations(filterGroupedOperations('path')),
        }
      }

      return filterResult
    }

    return operationsGroupedByTags
  }, [filterGroupedOperations, filterOperations, operationsGroupedByTags, searchValue])

  const filteredTagsInSidebar = useMemo(() => tags.filter(tag => filteredOperationsGroupedByTags[tag]?.length), [filteredOperationsGroupedByTags, tags])

  const [firstOperation] = useMemo(
    () => (filteredTagsInSidebar.length && (filteredOperationsGroupedByTags || searchValue) ? filteredOperationsGroupedByTags[filteredTagsInSidebar[0]] : []),
    [filteredOperationsGroupedByTags, filteredTagsInSidebar, searchValue],
  )
  const isCurrentOperationGrouped = useMemo(
    () => isOperationGrouped(filteredOperationsGroupedByTags, operationKey),
    [operationKey, filteredOperationsGroupedByTags],
  )

  useEffect(() => {
    if (firstOperation && !isCurrentOperationGrouped && !areChangesAndOperationsLoading) {
      const firstOperationId = firstOperation?.operationKey

      const searchParams = {
        [DOCUMENT_SEARCH_PARAM]: { value: selectedDocumentSlug },
        [FILTERS_SEARCH_PARAM]: { value: filters ? filters : undefined },
        [GROUP_SEARCH_PARAM]: { value: previousGroup },
      }

      navigateToFirstGroupOperation({
        packageKey: changedPackageKey!,
        versionKey: changedVersionKey!,
        groupKey: group!,
        apiType: apiType as ApiType,
        operationKey: firstOperationId!,
        search: searchParams,
      })
    }
  }, [apiType, areChangesAndOperationsLoading, changedPackageKey, changedVersionKey, filters, firstOperation, group, isCurrentOperationGrouped, navigateToFirstGroupOperation, previousGroup, selectedDocumentSlug])

  const comparedOperationsPair = {
    left: originOperation,
    right: changedOperation,
    isLoading: isOriginOperationLoading || isChangedOperationLoading,
  }

  const setShouldAutoExpand = useSetShouldAutoExpandTagsContext()

  const groupsComparisonParams = useComparisonParams()
  const [originComparisonObject, changedComparisonObject] = useComparisonObjects({
    ...groupsComparisonParams,
    currentGroup: group,
    previousGroup: previousGroup,
  })
  const mergedBreadcrumbsData = useCompareBreadcrumbs(originComparisonObject, changedComparisonObject)

  const handleOperationClick = useNavigateToOperation(changedPackageKey!, changedVersionKey!, apiType as ApiType, setShouldAutoExpand)

  return (
    <ShouldAutoExpandTagsProvider>
      <SelectedOperationTagsProvider>
        <VersionsComparisonGlobalParamsContext.Provider value={groupsComparisonParams}>
          <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
            <ComparedOperationsContext.Provider value={comparedOperationsPair}>
              <PageLayout
                toolbar={<ComparisonToolbar compareToolbarMode={COMPARE_SAME_OPERATIONS_MODE}/>}
                navigation={
                  <OperationsSidebarOnComparison
                    operationPackageKey={operationPackageKey!}
                    operationPackageVersion={operationPackageVersion!}
                    searchValue={searchValue}
                    setSearchValue={setSearchValue}
                    tags={filteredTagsInSidebar}
                    apiType={apiType as ApiType}
                    operationsGroupedByTag={filteredOperationsGroupedByTags}
                    areChangesLoading={isComparisonLoading}
                    onOperationClick={handleOperationClick}
                  />
                }
                body={
                  <OperationContent
                    changedOperation={changedOperation}
                    originOperation={originOperation}
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

const actionForOriginalOperation = ['remove', 'replace', 'rename']
const actionForChangedOperation = ['add', 'replace', 'rename']

export const getFullGroupForOperation = (restGroupingPrefix: string | undefined, group: string): string => {
  if (!restGroupingPrefix) return group

  return convertToSlug(restGroupingPrefix.replace(/{group}/g, group))
}

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

