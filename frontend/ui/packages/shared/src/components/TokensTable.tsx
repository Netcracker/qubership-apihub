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
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'

import { CONTENT_PLACEHOLDER_AREA, Placeholder } from './Placeholder'

import { TableCellSkeleton } from './TableCellSkeleton'
import type { DeleteApiKey, SystemToken, Tokens } from '../types/tokens'
import type { IsLoading } from '../utils/aliases'
import type { ColumnModel } from '../hooks/table-resizing/useColumnResizing'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '../hooks/table-resizing/useColumnResizing'
import { tokenRoleMapping } from '../entities/tokens'
import { UserView } from './Users/UserView'
import { ButtonWithHint } from './Buttons/ButtonWithHint'
import { DeleteIcon } from '../icons/DeleteIcon'
import { isEmpty } from '../utils/arrays'
import { createComponents } from '../utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '../utils/constants'
import { useResizeObserver } from '../hooks/common/useResizeObserver'
import { FormattedDate } from './FormattedDate'

export type TokensTableTableProps = {
  data: Tokens
  deleteApiKey: DeleteApiKey
  isLoading: IsLoading
  disableDelete?: boolean
}

// First Order Component //
export const TokensTable: FC<TokensTableTableProps> = memo(({
  data,
  isLoading,
  deleteApiKey,
  disableDelete = false,
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
    defaultMinColumnSize: 45,
  })

  const columns: ColumnDef<SystemToken>[] = useMemo(() => {
      return [
        {
          id: NAME_COLUMN_ID,
          header: 'Name',
          cell: ({ row: { original: { name } } }) => (
            <TextWithOverflowTooltip tooltipText={name}>
              <Typography variant="inherit">{name}</Typography>
            </TextWithOverflowTooltip>
          ),
        },
        {
          id: ROLES_COLUMN_ID,
          header: 'Roles',
          cell: ({ row: { original: { roles } } }) => (
            <TextWithOverflowTooltip tooltipText={roles.map(role => tokenRoleMapping[role]).join(', ')}>
              <Typography variant="inherit">{roles.map(role => tokenRoleMapping[role]).join(', ')}</Typography>
            </TextWithOverflowTooltip>
          ),
        },
        {
          id: CREATED_AT_COLUMN_ID,
          header: 'Created At',
          cell: ({ row: { original: { createdAt } } }) => (
            <FormattedDate value={createdAt}/>
          ),
        },
        {
          id: CREATED_BY_COLUMN_ID,
          header: 'Created By',
          cell: ({ row: { original: { createdBy } } }) => {
            return <UserView name={createdBy.name} avatarUrl={createdBy.avatarUrl}/>
          },
        },
        {
          id: CREATED_FOR_COLUMN_ID,
          header: 'Created For',
          cell: ({ row: { original: { createdFor } } }) => {
            return <UserView name={createdFor.name} avatarUrl={createdFor.avatarUrl}/>
          },
        },
        {
          id: DELETE_COLUMN_ID,
          header: '',
          cell: ({ row: { original: { key, packageKey } } }) => (
            <ButtonWithHint
              area-label="delete"
              disabled={disableDelete}
              disableHint={false}
              hint={disableDelete ? 'You do not have permission to generate token' : 'Delete'}
              size="small"
              sx={{ visibility: 'hidden', height: '20px' }}
              className="hoverable"
              startIcon={<DeleteIcon color={'#626D82'}/>}
              onClick={() => deleteApiKey({
                key: key,
                packageKey: packageKey,
              })}
              testId="DeleteButton"
            />
          ),
        },
      ]
    },
    [deleteApiKey, disableDelete],
  )

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })

  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <TableContainer sx={{ mt: 1 }} ref={tableContainerRef}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell
                  key={header.id}
                  align="left"
                  width={actualColumnSizing ? actualColumnSizing[header.id] : header.getSize()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <TableRow>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.column.id} data-testid={`Cell-${cell.column.id}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {isLoading && <TableSkeleton/>}
        </TableBody>
      </Table>
      {isEmpty(data) && !isLoading
        ? (
          <Placeholder
            sx={{ width: 'inherit' }}
            invisible={isLoading}
            area={CONTENT_PLACEHOLDER_AREA}
            message="No Tokens"
          />
        )
        : null
      }
    </TableContainer>
  )
})

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCellSkeleton/>
      <TableCellSkeleton/>
      <TableCellSkeleton/>
      <TableCellSkeleton/>
      <TableCellSkeleton/>
      <TableCellSkeleton/>
    </TableRow>
  )
})

const NAME_COLUMN_ID = 'name'
const ROLES_COLUMN_ID = 'roles'
const CREATED_AT_COLUMN_ID = 'created-at'
const CREATED_BY_COLUMN_ID = 'created-by'
const CREATED_FOR_COLUMN_ID = 'created-for'
const DELETE_COLUMN_ID = 'delete'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: NAME_COLUMN_ID, width: 300 },
  { name: ROLES_COLUMN_ID, width: 300 },
  { name: CREATED_AT_COLUMN_ID, width: 120 },
  { name: CREATED_BY_COLUMN_ID, width: 312 },
  { name: CREATED_FOR_COLUMN_ID, width: 312 },
  { name: DELETE_COLUMN_ID, width: 45 },
]
