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
import * as React from 'react'
import { useCallback } from 'react'
import { Box, CardHeader, Checkbox } from '@mui/material'
import { useBackwardLocation } from '../../../../../../useBackwardLocation'
import { BORDER } from '../consts'
import type { PackageContext } from '../types'
import { OperationListSkeleton, OperationSkeleton } from './OperationListSkeleton'
import { OPERATION_LIST_ITEM_HEIGHT, OperationListItem } from './OperationListItem'
import { getOperationsPath } from '../../../../../../../NavigationProvider'
import type {
  FetchNextOperationList,
  Operation,
  OperationData,
  Operations,
  OperationsData,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { ListChildComponentProps } from 'react-window'
import { FixedSizeList } from 'react-window'
import type { Path } from '@remix-run/router'
import InfiniteLoader from 'react-window-infinite-loader'
import type { Size } from 'react-virtualized-auto-sizer'
import AutoSizer from 'react-virtualized-auto-sizer'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

export type OperationListProps = {
  packageContext: PackageContext
  operations: OperationsData
  loading: boolean
  fetchNextPage?: FetchNextOperationList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  checkedOperations: Operations
  onToggleOperationCheckbox: (value: Operation) => void
  onToggleAllOperationsCheckbox: (checkedOperations: Operations, operations: Operations) => void
}

export const OperationList: FC<OperationListProps> = (props) => {
  const {
    packageContext,
    operations,
    loading,
    fetchNextPage,
    isNextPageFetching,
    hasNextPage,
    checkedOperations,
    onToggleOperationCheckbox,
    onToggleAllOperationsCheckbox,
  } = props

  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const onClickLink = useCallback((): void => {
    setBackwardLocation({ ...backwardLocation, fromOperation: location })
  }, [backwardLocation, location, setBackwardLocation])

  const handleAllOperationsCheckboxClick = useCallback(() => {
    onToggleAllOperationsCheckbox(checkedOperations, operations)
  }, [checkedOperations, onToggleAllOperationsCheckbox, operations])

  const prepareLinkFn = useCallback(({ operationKey, apiType, packageRef }: OperationData) => getOperationsPath({
    packageKey: packageContext.packageKey!,
    versionKey: packageContext.version!,
    apiType: apiType ?? DEFAULT_API_TYPE,
    operationKey: operationKey,
    search: {
      [REF_SEARCH_PARAM]: { value: packageContext.isDashboard ? packageContext.refPackageKey ?? packageRef?.key : undefined },
    },
  }), [packageContext.isDashboard, packageContext.packageKey, packageContext.refPackageKey, packageContext.version])

  const loadMoreItems = useCallback(() => {
    fetchNextPage?.()
  }, [fetchNextPage])

  const isItemLoaded = useCallback((index: number): boolean => {
    return !hasNextPage || index < operations.length
  }, [hasNextPage, operations.length])

  const checkedOperationsKeysCount = Object.keys(checkedOperations).length
  const noOperations = isEmpty(operations)
  const itemCountWithSkeleton = hasNextPage ? operations.length + 1 : operations.length

  return (
    <Box display="flex" flexDirection="column" maxWidth="100%" height="100%" flexGrow={1}>
      <CardHeader
        sx={{
          px: 0,
          py: 1,
          borderBottom: BORDER,
        }}
        avatar={
          <Checkbox
            sx={{ p: 0 }}
            onClick={handleAllOperationsCheckboxClick}
            checked={!noOperations && checkedOperationsKeysCount === operations.length}
            indeterminate={checkedOperationsKeysCount > 0 && checkedOperationsKeysCount < operations.length}
            disabled={noOperations}
            data-testid="AllOperationsCheckbox"
          />
        }
        subheader="Name / Path"
      />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {loading
          ? <OperationListSkeleton/>
          : (
            <>
              <Placeholder
                invisible={isNotEmpty(operations)}
                area={NAVIGATION_PLACEHOLDER_AREA}
                message="No operations"
                testId="NoOperationsPlaceholder"
              />
              <AutoSizer>
                {({ height, width }: Size) => (
                  <InfiniteLoader
                    isItemLoaded={isItemLoaded}
                    itemCount={itemCountWithSkeleton}
                    loadMoreItems={loadMoreItems}
                  >
                    {({ onItemsRendered, ref }) => (
                      <FixedSizeList
                        height={height}
                        width={width}
                        itemSize={OPERATION_LIST_ITEM_HEIGHT}
                        itemCount={itemCountWithSkeleton}
                        onItemsRendered={onItemsRendered}
                        ref={ref}
                        itemData={{
                          operations,
                          checkedOperations,
                          onToggleOperationCheckbox,
                          prepareLinkFn,
                          onClickLink,
                          hasNextPage,
                          isNextPageFetching,
                          isItemLoaded,
                        }}
                      >
                        {Row}
                      </FixedSizeList>
                    )}
                  </InfiniteLoader>
                )}
              </AutoSizer>
            </>
          )
        }
      </Box>
    </Box>
  )
}

export const Row: FC<ListChildComponentProps<{
  operations: OperationsData
  checkedOperations: Operations
  prepareLinkFn: (operation: OperationData) => Partial<Path>
  onToggleOperationCheckbox: (value: Operation) => void
  onClickLink: () => void
  hasNextPage?: boolean
  isNextPageFetching?: boolean
  isItemLoaded: (index: number) => boolean
}>> = (props) => {
  const {
    index, style, data: {
      operations,
      checkedOperations,
      onToggleOperationCheckbox,
      prepareLinkFn,
      onClickLink,
      hasNextPage,
    },
  } = props
  const operation = operations[index]

  if (hasNextPage && operations.length === index) {
    return (
      <div style={style} key="operation-skeleton">
        <OperationSkeleton/>
      </div>
    )
  }

  return <OperationListItem
    key={operation.operationKey}
    style={style}
    operation={operation}
    isChecked={checkedOperations.includes(operation)}
    onToggleOperationCheckbox={onToggleOperationCheckbox}
    prepareLinkFn={prepareLinkFn}
    onClickLink={onClickLink}
  />
}
