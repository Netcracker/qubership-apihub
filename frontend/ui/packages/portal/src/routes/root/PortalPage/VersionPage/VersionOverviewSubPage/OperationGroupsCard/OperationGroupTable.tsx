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
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import {
  Box,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import type { ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { OperationGroupControls } from './OperationGroupControls'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { GROUP_TYPE_MANUAL, GROUP_TYPE_REST_PATH_PREFIX } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { insertIntoArrayByIndex, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'

const GROUP_NAME_COLUMN_ID = 'group-name'
const GROUP_TYPE_COLUMN_ID = 'group-type'
const DESCRIPTION_COLUMN_ID = 'description'
const API_TYPE_COLUMN_ID = 'api-type'
const OPERATIONS_NUMBER_COLUMN_ID = 'operations-number'
const CONTROLS_COLUMN_ID = 'controls'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: GROUP_NAME_COLUMN_ID },
  { name: GROUP_TYPE_COLUMN_ID, fixedWidth: 120 },
  { name: DESCRIPTION_COLUMN_ID },
  { name: API_TYPE_COLUMN_ID, fixedWidth: 100 },
  { name: OPERATIONS_NUMBER_COLUMN_ID, width: 100 },
  { name: CONTROLS_COLUMN_ID, fixedWidth: 200 },
]

export type OperationGroupTableProps = {
  groups: OperationGroup[]
  isLoading: boolean
  isPackage: boolean
  onEditContent: (group: OperationGroup) => void
  onEdit: (group: OperationGroup) => void
  onDelete: (group: OperationGroup) => void
  onPublish: (group: OperationGroup) => void
}

export const OperationGroupTable: FC<OperationGroupTableProps> = memo<OperationGroupTableProps>(({
  groups,
  isLoading,
  isPackage,
  onEditContent,
  onEdit,
  onDelete,
  onPublish,
}) => {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: COLUMNS_MODELS,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })

  const columns: ColumnDef<OperationGroup>[] = useMemo(() => {
    const result: ColumnDef<OperationGroup>[] = [
      {
        id: GROUP_NAME_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Group Name" />,
        cell: ({ row: { original: { groupName, exportTemplateFileName } } }) => (
          <Box display="flex" alignItems="center">
            <TextWithOverflowTooltip tooltipText={groupName}>
              {groupName}
            </TextWithOverflowTooltip>

            {exportTemplateFileName && (
              <Tooltip title="The group has OpenAPI export template" placement="right">
                <Box ml="auto">
                  <IconButton size="small">
                    <FileIcon />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
          </Box>
        ),
      },
      defineDefaultColumn(
        DESCRIPTION_COLUMN_ID,
        'Description',
        (group) => group.description,
      ),
      defineDefaultColumn(
        API_TYPE_COLUMN_ID,
        'API Type',
        ({ apiType }) => (apiType ? API_TYPE_TITLE_MAP[apiType]! : ''),
      ),
      defineDefaultColumn(
        OPERATIONS_NUMBER_COLUMN_ID,
        'Number of Operations',
        (group) => String(group.operationsCount),
      ),
      {
        id: CONTROLS_COLUMN_ID,
        header: () => '',
        cell: ({ row }) => (
          <OperationGroupControls
            operationGroup={row.original}
            onEditContent={onEditContent}
            onEdit={onEdit}
            onDelete={onDelete}
            onPublish={onPublish}
          />
        ),
      },
    ]

    if (isPackage) {
      insertIntoArrayByIndex(
        result,
        defineDefaultColumn(
          GROUP_TYPE_COLUMN_ID,
          'Type',
          (group) => (group.isPrefixGroup ? GROUP_TYPE_REST_PATH_PREFIX : GROUP_TYPE_MANUAL),
        ), 1)
    }

    return result
  }, [isPackage, onDelete, onEdit, onEditContent, onPublish])

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: groups,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })

  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )

  return (
    <TableContainer ref={tableContainerRef} sx={{ mt: 1 }}>
      <Placeholder
        sx={{ width: 'inherit' }}
        invisible={isLoading || isNotEmpty(groups)}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No groups"
      >
        <Table>
          <TableHead>
            {getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((headerColumn, index) => (
                  <TableCell
                    key={headerColumn.id}
                    align="left"
                    width={actualColumnSizing ? actualColumnSizing[headerColumn.id] : headerColumn.getSize()}
                    sx={{
                      '&:hover': {
                        borderRight: '2px solid rgba(224, 224, 224, 1)',
                      },
                    }}
                  >
                    {flexRender(headerColumn.column.columnDef.header, headerColumn.getContext())}
                    {index !== headerGroup.headers.length - 1 &&
                      <ColumnDelimiter header={headerColumn} resizable={true} />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {getRowModel().rows.map(row => (
              <Fragment key={crypto.randomUUID()}>
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              </Fragment>
            ))}
            {isLoading && <TableSkeleton isPackage={isPackage} />}
          </TableBody>
        </Table>
      </Placeholder>
    </TableContainer>
  )
})

function defineDefaultColumn(id: Key, title: string, getValue: (group: OperationGroup) => string): ColumnDef<OperationGroup> {
  return {
    id: id,
    header: () => <CustomTableHeadCell title={title} />,
    cell: ({ row }) => {
      const value = getValue(row.original)
      return (
        <TextWithOverflowTooltip tooltipText={value}>
          {value}
        </TextWithOverflowTooltip>
      )
    },
  }
}

type SkeletonProps = {
  isPackage: boolean
}
const TableSkeleton: FC<SkeletonProps> = memo<SkeletonProps>(({ isPackage }) => {
  return createComponents(<RowSkeleton isPackage={isPackage} />, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC<SkeletonProps> = memo<SkeletonProps>(({ isPackage }) => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      {isPackage && (
        <TableCell>
          <Skeleton variant="rectangular" width={'80%'} />
        </TableCell>
      )}
      <TableCell />
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell />
    </TableRow>
  )
})

