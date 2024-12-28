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

import type { FC, ReactNode } from 'react'
import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import { OperationTitleWithMeta as OperationTitle } from './OperationTitleWithMeta'
import type { Path } from '@remix-run/router/history'
import Box from '@mui/material/Box'
import { CustomListItemButton, LIST_ITEM_SIZE_BIG } from '../CustomListItemButton'
import { Divider, Skeleton } from '@mui/material'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '../Placeholder'
import type { ResizeCallback } from 're-resizable'
import { Resizable } from 're-resizable'
import { ExpandableItem } from '../ExpandableItem'
import type { FetchNextOperationList, OperationData, OperationsData, PackageRef } from '../../entities/operations'
import { useIntersectionObserver } from '../../hooks/common/useIntersectionObserver'
import { ListBox } from '../Panels/ListBox'
import { isNotEmpty } from '../../utils/arrays'
import type { Key } from '../../entities/keys'

export type OperationListSubComponentProps = {
  operation: OperationData
}

export type OperationWithMetaClickableListProps = {
  operations: OperationsData
  prepareLinkFn?: (operation: OperationData) => Partial<Path>
  fetchNextPage?: FetchNextOperationList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  onRowClick?: (operationKey: Key, packageRef?: PackageRef) => void
  onLinkClick?: () => void
  isLoading?: boolean
  previewComponent?: ReactNode
  selectedOperationKey?: Key
  initialSize: number
  handleResize?: ResizeCallback
  maxWidth: number
  isExpandableItem?: (operation: OperationData) => boolean
  SubComponent?: FC<OperationListSubComponentProps>
}

// First Order Component //
export const OperationWithMetaClickableList: FC<OperationWithMetaClickableListProps> = memo<OperationWithMetaClickableListProps>((props) => {
  const {
    operations,
    prepareLinkFn,
    onRowClick,
    onLinkClick,
    hasNextPage,
    isNextPageFetching,
    fetchNextPage,
    isLoading = false,
    previewComponent,
    selectedOperationKey,
    initialSize,
    handleResize,
    maxWidth,
    isExpandableItem,
    SubComponent,
  } = props

  const handleRowClick = useCallback((operation: OperationData) => {
    onRowClick?.(operation.operationKey, operation.packageRef)
  }, [onRowClick])

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  const operationsList = useMemo(
    () => operations?.map(operation => {
      const link = prepareLinkFn?.(operation) ?? {}
      const { operationKey, deprecated } = operation
      const expandable = isExpandableItem?.(operation) ?? false
      const title = <OperationTitle
        operation={operation}
        link={link}
        badgeText={deprecated ? 'Deprecated' : undefined}
        onLinkClick={onLinkClick}
      />

      return (
        <OperationItemButton
          title={title}
          operation={operation}
          expandable={expandable}
          SubComponent={SubComponent}
          onClick={handleRowClick}
          selected={selectedOperationKey === operationKey}
        />
      )
    }),
    [SubComponent, handleRowClick, isExpandableItem, onLinkClick, operations, prepareLinkFn, selectedOperationKey],
  )

  return (
    <Box display="grid" gridTemplateColumns="1fr auto" height="inherit">
      <ListBox>
        <Placeholder
          sx={{ width: 'inherit' }}
          invisible={isNotEmpty(operations) || isLoading}
          area={NAVIGATION_PLACEHOLDER_AREA}
          message="No operations"
          testId="NoOperationsPlaceholder"
        >
          <Box overflow="auto" height="inherit">
            {operationsList}

            {isLoading && <ListSkeleton/>}
            {hasNextPage && <Box ref={ref}><Skeleton variant="rectangular" width="100%"/></Box>}
          </Box>
        </Placeholder>
      </ListBox>

      <Resizable
        style={{
          borderLeft: '1px solid #D5DCE3',
          backgroundColor: '#FFFFFF',
          overflowY: 'scroll',
        }}

        enable={{
          top: false,
          right: false,
          bottom: false,
          left: true,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        boundsByDirection={true}
        size={{ width: initialSize, height: '100%' }}
        maxWidth={maxWidth}
        onResizeStop={handleResize}
      >
        {previewComponent}
      </Resizable>
    </Box>
  )
})

const ListSkeleton: FC = memo(() => {
  return (
    <Box>
      {[...Array(5)].map((_, index) => (
        <Box key={index} mb={2}>
          <Skeleton variant="rectangular" height={20} width="100%"/>
        </Box>
      ))}
    </Box>
  )
})

type OperationItemButtonProps = {
  title: ReactNode
  operation: OperationData
  expandable: boolean
  SubComponent?: FC<OperationListSubComponentProps>
  onClick: (operationData: OperationData) => void
  selected: boolean
}

const OperationItemButton: FC<OperationItemButtonProps> = memo<OperationItemButtonProps>(({
    title,
    operation,
    expandable,
    onClick,
    SubComponent,
    selected,
  }) => {
    const [expanded, setExpanded] = useState<boolean>(false)

    return (
      <>
        <CustomListItemButton<OperationData>
          keyProp={operation.operationKey}
          data={operation}
          itemComponent={<ExpandableItem showToggler={expandable} onToggle={setExpanded}>{title}</ExpandableItem>}
          onClick={onClick}
          size={LIST_ITEM_SIZE_BIG}
          isSelected={selected}
          testId="Cell-endpoints"
        />
        <Divider orientation="horizontal" variant="fullWidth"/>

        {expanded && SubComponent && (
          <SubComponent operation={operation}/>
        )}
      </>
    )
  },
)
