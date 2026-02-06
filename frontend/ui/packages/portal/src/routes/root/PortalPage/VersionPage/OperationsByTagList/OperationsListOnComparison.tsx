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

import { buildOperationPairKey, useHandledOperationPairsContext } from '@apihub/components/HandledOperationPairsProvider'
import { useSetIsApiDiffResultLoading } from '@apihub/routes/root/ApiDiffResultProvider'
import { CustomListItemButton } from '@netcracker/qubership-apihub-ui-shared/components/CustomListItemButton'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationPair } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { useRefWithAutoScroll } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useRefWithAutoScroll'
import { usePackageSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  DOCUMENT_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  GROUP_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  SEARCH_TEXT_PARAM_KEY,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Dispatch, FC } from 'react'
import React, { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { GroupsOperationsComparisonSearchParams, OperationsComparisonSearchParams } from '../../../../NavigationProvider'
import { useNavigation } from '../../../../NavigationProvider'
import { useTextSearchParam } from '../../../useTextSearchParam'
import { useVersionSearchParam } from '../../../useVersionSearchParam'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { useSetShouldAutoExpandTagsContext, useShouldAutoExpandTagsContext } from '../ShouldAutoExpandTagsProvider'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { OperationListItem } from './OperationListItem'

export type OperationsListOnComparisonProps = {
  changedOperationPairs: OperationPair[]
}

export const OperationsListOnComparison: FC<OperationsListOnComparisonProps> = memo<OperationsListOnComparisonProps>(props => {
  const { changedOperationPairs } = props
  const { navigateToOperationsComparison, navigateToGroupsOperationsComparison } = useNavigation()

  const previousGroup = useSearchParam(GROUP_SEARCH_PARAM)
  const [originPackageKey] = usePackageSearchParam()
  const [originVersionKey] = useVersionSearchParam()
  const [documentSlug] = useDocumentSearchParam()
  const { packageId: changedPackageKey, versionId: changedVersionKey, operationId, group, apiType } = useParams()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard(true)
  const [searchValue] = useTextSearchParam()

  const [filters] = useSeverityFiltersSearchParam()

  const [selectedElement, setSelectedElement] = useState<string>('')
  useNavigateToSelectedOperation(setSelectedElement, operationId)
  const shouldAutoExpand = useShouldAutoExpandTagsContext()
  const setShouldAutoExpand = useSetShouldAutoExpandTagsContext()
  const setIsApiDiffResultLoading = useSetIsApiDiffResultLoading()
  const selectedElementRef = useRefWithAutoScroll(shouldAutoExpand, selectedElement)

  const searchParams: OperationsComparisonSearchParams | GroupsOperationsComparisonSearchParams = useMemo(
    () => (
      (changedPackageKey === originPackageKey || !originPackageKey)
        ? {
          [VERSION_SEARCH_PARAM]: { value: originVersionKey! ?? changedVersionKey! },
          [REF_SEARCH_PARAM]: { value: isPackageFromDashboard ? refPackageKey : undefined },
          [DOCUMENT_SEARCH_PARAM]: { value: documentSlug },
          [GROUP_SEARCH_PARAM]: { value: previousGroup },
          [SEARCH_TEXT_PARAM_KEY]: { value: searchValue },
          [FILTERS_SEARCH_PARAM]: { value: filters.join() },
        }
        : {
          [PACKAGE_SEARCH_PARAM]: { value: originPackageKey! },
          [VERSION_SEARCH_PARAM]: { value: originVersionKey! },
          [REF_SEARCH_PARAM]: { value: isPackageFromDashboard ? refPackageKey : undefined },
          [DOCUMENT_SEARCH_PARAM]: { value: documentSlug },
          [SEARCH_TEXT_PARAM_KEY]: { value: searchValue },
          [FILTERS_SEARCH_PARAM]: { value: filters.join() },
        }
    ),
    [changedPackageKey, changedVersionKey, documentSlug, filters, isPackageFromDashboard, originPackageKey, originVersionKey, previousGroup, refPackageKey, searchValue])

  // Load cache with already opened operations IDs. Create callback to reset loading status only if requested operation pair is opening first time
  const alreadyHandledOperationPairs = useHandledOperationPairsContext()
  const resetIsApiDiffResultLoadingIfNeeded = useCallback(
    (operationPair: OperationPair) => {
      const operationPairKey = buildOperationPairKey(operationPair)
      if (!alreadyHandledOperationPairs?.has(operationPairKey)) {
        // We need to reset status to default value. For more details, look at the comment next to IsApiDiffResultLoadingContext.
        setIsApiDiffResultLoading(true)
      }
    },
    [alreadyHandledOperationPairs, setIsApiDiffResultLoading],
  )

  const handleListItemClick = useCallback(
    (operationPair: OperationPair) => {
      resetIsApiDiffResultLoadingIfNeeded(operationPair)

      setShouldAutoExpand(false)
      const operationKey =
        operationPair.currentOperation?.operationKey ??
        operationPair.previousOperation!.operationKey

      // Create a new object instead of mutating searchParams
      const updatedSearchParams = {
        ...searchParams,
        ...(operationPair.currentOperation?.operationKey && operationPair.previousOperation?.operationKey
          ? { [OPERATION_SEARCH_PARAM]: { value: operationPair.previousOperation.operationKey } }
          : {}
        ),
      }

      group
        ? navigateToGroupsOperationsComparison({
          packageKey: changedPackageKey!,
          versionKey: changedVersionKey!,
          groupKey: group!,
          apiType: apiType as ApiType,
          operationKey: operationKey,
          search: updatedSearchParams,
        })
        : navigateToOperationsComparison({
          packageKey: changedPackageKey!,
          versionKey: changedVersionKey!,
          apiType: apiType as ApiType,
          operationKey: operationKey,
          search: updatedSearchParams,
        })
    },
    [apiType, changedPackageKey, changedVersionKey, group, navigateToGroupsOperationsComparison, navigateToOperationsComparison, resetIsApiDiffResultLoadingIfNeeded, searchParams, setShouldAutoExpand],
  )

  return (
    <>
      {changedOperationPairs.map(operationPair => {
        const isSelected = (
          selectedElement === operationPair.currentOperation?.operationKey ||
          selectedElement === operationPair.previousOperation?.operationKey
        )
        const key = `${operationPair.currentOperation?.operationKey}-${operationPair.previousOperation?.operationKey}`
        return (
          <CustomListItemButton<OperationPair>
            refObject={isSelected ? selectedElementRef : undefined}
            key={key}
            keyProp={key}
            data={operationPair}
            onClick={handleListItemClick}
            itemComponent={<OperationListItem operation={operationPair.currentOperation ?? operationPair.previousOperation!} />}
            isSelected={isSelected}
            testId="OperationButton"
          />
        )
      })}
    </>
  )
})

function useNavigateToSelectedOperation(
  setSelectedElements: Dispatch<React.SetStateAction<string>>,
  operation?: Key,
): void {

  useLayoutEffect(() => {
    if (operation) {
      setSelectedElements(operation)
    }
  }, [operation, setSelectedElements])
}
