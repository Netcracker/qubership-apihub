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
import { memo, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import { Box, Skeleton, TableCell, TableRow, Typography } from '@mui/material'
import type { ColumnFiltersState, VisibilityState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { PackageKind } from '../../../entities/packages'
import { DASHBOARD_KIND } from '../../../entities/packages'
import type { OperationChange, OperationChanges } from '../../../entities/operation-changelog'
import { ChangeSeverityIndicator } from '../../../components/ChangeSeverityIndicator'
import type { ChangeSeverity } from '../../../entities/change-severities'
import { OverflowTooltip } from '../../../components/OverflowTooltip'
import { insertIntoArrayByIndex } from '../../../utils/arrays'
import { CHANGES_COLUMN_ID } from '../const/table'
import { API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID, PACKAGE_COLUMN_ID, TAGS_COLUMN_ID } from '../../../entities/table-columns'

export type OperationChangesSubTableProps = {
  packageKind?: PackageKind
  changes: OperationChanges
  isLoading: boolean
}

export const OperationChangesSubTable: FC<OperationChangesSubTableProps> = memo<OperationChangesSubTableProps>((
  {
    packageKind,
    changes,
    isLoading,
  },
) => {

  const columns: ColumnDef<OperationChange>[] = useMemo(() => {
    const result: ColumnDef<OperationChange>[] = [
      {
        id: ENDPOINT_COLUMN_ID,
        header: 'Endpoint / Path',
        cell: ({ row: { original: { description, severity } } }) => (
          <Box display="flex" alignItems="center" height="32px" position="relative" data-testid="ChangeDescriptionCell">
            <ChangeSeverityIndicator
              key={crypto.randomUUID()}
              severity={severity as ChangeSeverity}
            />
            <OverflowTooltip title={description}>
              <Typography noWrap ml={4} variant="inherit">{description}</Typography>
            </OverflowTooltip>
          </Box>
        ),
      },
      {
        id: TAGS_COLUMN_ID,
        header: 'Tags',
        cell: () => <></>,
      },
      {
        id: CHANGES_COLUMN_ID,
        header: 'Changes summary',
        cell: () => <></>,
      },
      {
        id: API_KIND_COLUMN_ID,
        header: 'Kind',
        cell: () => <></>,
      },
    ]

    if (packageKind === DASHBOARD_KIND) {
      insertIntoArrayByIndex(result, {
        id: PACKAGE_COLUMN_ID,
        header: 'Package',
      }, 2)
    }

    return result
  }, [packageKind])

  const data: OperationChange[] = useMemo(
    () => [...changes],
    [changes])

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const { getRowModel } = useReactTable({
    data: data,
    columns: columns,
    state: { columnVisibility, columnFilters },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <TableRow key={crypto.randomUUID()}>
        <TableCell colSpan={columns.length} sx={{ p: 0 }}>
          <Skeleton variant="text" width="100%" />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {getRowModel().rows.map(row => (
        <TableRow key={row.id}>
          <TableCell colSpan={columns.length} sx={{ p: 0 }}>
            {row.getVisibleCells().map((cell) => (
              <Box key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Box>
            ))}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
})
