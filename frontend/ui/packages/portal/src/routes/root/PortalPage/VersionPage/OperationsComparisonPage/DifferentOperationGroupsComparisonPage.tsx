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

import type { Key } from '@apihub/entities/keys'
import { OperationContent } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import {
  COMPARE_SAME_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { useComparisonObjects } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonObjects'
import { groupOperationPairsByTags, isFullyAddedOperationChange, isFullyRemovedOperationChange } from '@apihub/utils/operations'
import type { ActionType } from '@netcracker/qubership-apihub-api-diff'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { OperationChanges } from '@netcracker/qubership-apihub-api-processor'
import { convertToSlug } from '@netcracker/qubership-apihub-api-processor'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type {
  Operation,
  OperationData,
  OperationPair,
  OperationPairsGroupedByTag,
  OptionalOperationPair,
  RestOperation,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isRestOperation, NO_BWC_API_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type {
  DashboardComparisonSummary,
  RefComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { filterChangesBySeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import {
  DOCUMENT_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  GROUP_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { safeOperationKeysPair } from '../../../../../../../shared/src/utils/operations'
import { useNavigation } from '../../../../NavigationProvider'
import { usePackage } from '../../../usePackage'
import { usePackageSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { useVersionSearchParam } from '../../../useVersionSearchParam'
import { useCompareGroups } from '../../useCompareGroups'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useChangesSummaryContext } from '../ChangesSummaryProvider'
import { CompareOperationPathsDialog } from '../CompareOperationPathsDialog'
import { ComparedOperationsContext } from '../ComparedOperationsContext'
import { BreadcrumbsDataContext } from '../ComparedPackagesBreadcrumbsProvider'
import { ComparisonToolbar } from '../ComparisonToolbar'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { ShouldAutoExpandTagsProvider, useSetShouldAutoExpandTagsContext } from '../ShouldAutoExpandTagsProvider'
import { VersionsComparisonGlobalParamsContext } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useCompareBreadcrumbs } from '../useCompareBreadcrumbs'
import { useComparisonParams } from '../useComparisonParams'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { useNavigateToOperation } from '../useNavigateToOperation'
import { useOperation } from '../useOperation'
import { useOperationSearchParam } from '../useOperationSearchParam'
import { OperationsSidebarOnComparison } from './OperationsSidebarOnComparison'

export function isOperationPairGrouped(
  operationPairsGroupedByTags: OperationPairsGroupedByTag,
  operationKey?: Key,
): boolean {
  if (!operationPairsGroupedByTags) {
    return false
  }

  for (const groupedOperationPairs of Object.values(operationPairsGroupedByTags)) {
    for (const groupedOperationPair of groupedOperationPairs) {
      const { currentOperation, previousOperation } = groupedOperationPair
      if (
        currentOperation?.operationKey === operationKey ||
        previousOperation?.operationKey === operationKey
      ) {
        return true
      }
    }
  }
  return false
}

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
  const [operationSearchParam] = useOperationSearchParam()

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

  const operationAction = useMemo((): ActionType | undefined => {
    const compareGroupsData = compareGroups?.data
    if (isEmpty(compareGroupsData)) {
      return undefined
    }

    const targetChange = compareGroupsData!.find(
      element => {
        const isFullyAdded = isFullyAddedOperationChange(element)
        const isFullyRemoved = isFullyRemovedOperationChange(element)
        let _operationAction: ActionType | undefined = undefined
        if (isFullyAdded) {
          _operationAction = DiffAction.add
        } else if (isFullyRemoved) {
          _operationAction = DiffAction.remove
        }
        const {
          previousOperationKey: _operationKeyForOriginOperation,
          currentOperationKey: _operationKeyForChangedOperation,
        } = safeOperationKeysPair({
          previousOperationKey: operationSearchParam,
          currentOperationKey: operationKey,
        }, _operationAction)

        return (
          isFullyAdded && element.operationId === _operationKeyForChangedOperation ||
          isFullyRemoved && !!_operationKeyForOriginOperation && element.previousOperationId === _operationKeyForOriginOperation
        )
      },
    )?.diffs?.[0]

    return targetChange?.action ?? DiffAction.rename
  }, [compareGroups?.data, operationKey, operationSearchParam])

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

  const {
    previousOperationKey: operationKeyForOriginOperation,
    currentOperationKey: operationKeyForChangedOperation,
  } = safeOperationKeysPair({
    previousOperationKey: operationSearchParam,
    currentOperationKey: operationKey,
  }, operationAction)

  const { data: originOperation, isLoading: isOriginOperationLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.previousVersion,
    enabled: !!operationAction && actionForOriginalOperation.includes(operationAction) && !!restGroupingPrefix,
    apiType: apiType as ApiType,
    operationKey: operationAction === DiffAction.rename
      ? `${getFullGroupForOperation(restGroupingPrefix, previousGroup!)}-${operationKeyForOriginOperation}`
      : operationKeyForOriginOperation,
  })

  const { data: changedOperation, isLoading: isChangedOperationLoading } = useOperation({
    packageKey: !isPackageFromDashboard ? originPackageKey : refPackageKey,
    versionKey: !isPackageFromDashboard ? changedVersionKey : refComparisonSummary?.version,
    enabled: !!operationAction && actionForChangedOperation.includes(operationAction) && !!restGroupingPrefix,
    apiType: apiType as ApiType,
    operationKey: operationAction === DiffAction.rename
      ? `${getFullGroupForOperation(restGroupingPrefix, group!)}-${operationKeyForChangedOperation}`
      : operationKeyForChangedOperation,
  })

  const areChangesAndOperationsLoading = isOriginOperationLoading && isChangedOperationLoading
  const operationPairsGroupedByTags: OperationPairsGroupedByTag = useMemo(() => {
    const filteredChanges: OperationChanges[] = compareGroups.data?.filter(
      operationChange => filterChangesBySeverity(filters, operationChange.changeSummary),
    ) ?? []

    const operationPairs: OperationPair[] = []
    for (const operationChange of filteredChanges) {
      const currentMetadata = operationChange.metadata
      const hasCurrentMetadata = isObject(currentMetadata)
      // eslint-disable-next-line prefer-destructuring
      const previousMetadata = operationChange.previousMetadata
      const hasPreviousMetadata = isObject(previousMetadata)
      const previousOperation: Operation | undefined = operationChange.previousOperationId ? {
        operationKey: operationChange.previousOperationId,
        apiKind: operationChange.previousApiKind ?? NO_BWC_API_KIND, // TODO 10.04.25 // Fix it
        apiAudience: 'unknown',
        title: previousMetadata?.title ?? '',
        tags: previousMetadata?.tags ?? [],
        ...(hasPreviousMetadata ? {
          ...('type' in previousMetadata ? { type: previousMetadata.type } : {}),
          ...('path' in previousMetadata ? { path: previousMetadata.path } : {}),
          ...('method' in previousMetadata ? { method: previousMetadata.method } : {}),
        } : {}),
      } : undefined
      const currentOperation: Operation | undefined = operationChange.operationId ? {
        operationKey: operationChange.operationId,
        apiKind: operationChange.apiKind ?? NO_BWC_API_KIND, // TODO 10.04.25 // Fix it
        apiAudience: 'unknown',
        title: currentMetadata?.title ?? '',
        tags: currentMetadata?.tags ?? [],
        ...(hasCurrentMetadata ? {
          ...('type' in currentMetadata ? { type: currentMetadata.type } : {}),
          ...('path' in currentMetadata ? { path: currentMetadata.path } : {}),
          ...('method' in currentMetadata ? { method: currentMetadata.method } : {}),
        } : {}),
      } : undefined
      operationPairs.push({
        currentOperation: currentOperation,
        previousOperation: previousOperation,
      })
    }

    return groupOperationPairsByTags(operationPairs)
  }, [compareGroups.data, filters])
  const tags = useMemo(() => Array.from(Object.keys(operationPairsGroupedByTags)), [operationPairsGroupedByTags])

  const filterGroupedOperations = useCallback(
    (property: keyof Pick<RestOperation, 'method' | 'path' | 'title'>) => {
      return (operationPair: OperationPair): boolean => {
        const operation = operationPair.currentOperation ?? operationPair.previousOperation!
        return (
          isRestOperation(operation) &&
          !Array.isArray(operation[property]) &&
          operation[property]?.toLowerCase().includes(searchValue.toLowerCase())
        )
      }
    },
    [searchValue],
  )

  const filterOperations = useCallback(
    (filterFunction: (operation: OperationPair) => boolean): OperationPairsGroupedByTag => {
      return Object.fromEntries(
        Object.entries(operationPairsGroupedByTags).map(
          ([tag, operationPairs]) => [tag, operationPairs.filter(filterFunction)],
        ),
      )
    },
    [operationPairsGroupedByTags],
  )

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

    return operationPairsGroupedByTags
  }, [filterGroupedOperations, filterOperations, operationPairsGroupedByTags, searchValue])

  const filteredTagsInSidebar = useMemo(() => tags.filter(tag => filteredOperationsGroupedByTags[tag]?.length), [filteredOperationsGroupedByTags, tags])

  const [firstOperationPair] = useMemo(
    () => (filteredTagsInSidebar.length && (filteredOperationsGroupedByTags || searchValue) ? filteredOperationsGroupedByTags[filteredTagsInSidebar[0]] : []),
    [filteredOperationsGroupedByTags, filteredTagsInSidebar, searchValue],
  )
  const isCurrentOperationGrouped = useMemo(
    () => isOperationPairGrouped(filteredOperationsGroupedByTags, operationKey),
    [operationKey, filteredOperationsGroupedByTags],
  )

  useEffect(() => {
    if (firstOperationPair && !isCurrentOperationGrouped && !areChangesAndOperationsLoading) {
      const firstOperation = firstOperationPair.currentOperation ?? firstOperationPair.previousOperation!
      const firstOperationId = firstOperation?.operationKey

      const searchParams = {
        [DOCUMENT_SEARCH_PARAM]: { value: selectedDocumentSlug },
        [FILTERS_SEARCH_PARAM]: { value: filters ? filters : undefined },
        [GROUP_SEARCH_PARAM]: { value: previousGroup },
        [OPERATION_SEARCH_PARAM]: {
          value: firstOperationPair.currentOperation
            ? firstOperationPair.previousOperation?.operationKey
            : undefined,
        },
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
  }, [apiType, areChangesAndOperationsLoading, changedPackageKey, changedVersionKey, filters, firstOperationPair, group, isCurrentOperationGrouped, navigateToFirstGroupOperation, previousGroup, selectedDocumentSlug])

  const comparedOperationsPair: OptionalOperationPair<OperationData> = {
    previousOperation: originOperation,
    currentOperation: changedOperation,
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

  const handleOperationClick = useNavigateToOperation(
    changedPackageKey!, changedVersionKey!, apiType as ApiType, setShouldAutoExpand,
  )

  return (
    <ShouldAutoExpandTagsProvider>
      <SelectedOperationTagsProvider>
        <VersionsComparisonGlobalParamsContext.Provider value={groupsComparisonParams}>
          <BreadcrumbsDataContext.Provider value={mergedBreadcrumbsData}>
            <ComparedOperationsContext.Provider value={comparedOperationsPair}>
              <PageLayout
                toolbar={<ComparisonToolbar compareToolbarMode={COMPARE_SAME_OPERATIONS_MODE} />}
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
        <CompareOperationPathsDialog />
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

