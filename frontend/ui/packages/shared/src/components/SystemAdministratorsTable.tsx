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
import { Button, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import type { SystemAdmin, SystemAdmins } from '../types/system-admins'
import type { IsLoading } from '../utils/aliases'
import type { ColumnModel } from '../hooks/table-resizing/useColumnResizing'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '../hooks/table-resizing/useColumnResizing'
import { UserView } from './Users/UserView'
import { DeleteIcon } from '../icons/DeleteIcon'
import { isEmpty } from '../utils/arrays'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from './Placeholder'
import { createComponents } from '../utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '../utils/constants'
import { useResizeObserver } from '../hooks/common/useResizeObserver'

export type SystemAdministratorsTableProps = {
  data: SystemAdmins
  deleteAdministrator: (admin: SystemAdmin) => void
  isLoading: IsLoading
}

// First Order Component //
export const SystemAdministratorsTable: FC<SystemAdministratorsTableProps> = memo(({
  data,
  deleteAdministrator,
  isLoading,
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
    defaultMinColumnSize: 50,
  })

  const columns: ColumnDef<SystemAdmin>[] = useMemo(() => {
      return [
        {
          id: SYSTEM_ADMINISTRATOR_COLUMN_ID,
          header: 'System Administrators',
          cell: ({ row: { original: { avatarUrl, name } } }) => (
            <UserView name={name} avatarUrl={avatarUrl}/>
          ),
        },
        {
          id: DELETE_COLUMN_ID,
          header: '',
          cell: ({ row: { original: admin } }) => (
            <Button
              size="small"
              sx={{ visibility: 'hidden', height: '20px' }}
              className="hoverable"
              startIcon={<DeleteIcon color={'#626D82'}/>}
              onClick={() => deleteAdministrator(admin)}
            />
          ),
        },
      ]
    },
    [deleteAdministrator],
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
            message="No System Administrators"
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
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
    </TableRow>
  )
})

const SYSTEM_ADMINISTRATOR_COLUMN_ID = 'system-administrator'
const DELETE_COLUMN_ID = 'delete'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: SYSTEM_ADMINISTRATOR_COLUMN_ID, width: 1000 },
  { name: DELETE_COLUMN_ID, width: 60 },
]
