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
import React, { memo, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import { Box, Skeleton, TableCell, TableRow, Tooltip } from '@mui/material'
import type { ColumnFiltersState, VisibilityState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { SubTableProps } from '../OpenApiViewer/OpenApiTable'
import { useParams } from 'react-router-dom'
import { useOperationDeprecatedItems } from './useOperationDeprecatedItems'
import { DEPRECATED_SINCE_COLUMN_ID, DeprecatedInfo, DETAILS_COLUMN_ID } from './DeprecatedOperationsTable'
import type { DeprecatedItem } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import InfoIcon from '@mui/icons-material/Info'

const DESCRIPTION_COLUMN_ID = 'description'

export const DeprecatedItemsSubTable: FC<SubTableProps> = memo<SubTableProps>((
  {
    value: { getVisibleCells, original: { operation: { operationKey, packageRef } } },
  },
) => {
  const { packageId: packageKey, versionId: versionKey, apiType } = useParams()

  const [deprecatedItems, isLoading] = useOperationDeprecatedItems(
    packageRef?.version ?? versionKey!,
    packageRef?.refId ?? packageKey!,
    operationKey,
    apiType! as ApiType,
  )

  const columns: ColumnDef<DeprecatedItem>[] = useMemo(() => [
    {
      id: DESCRIPTION_COLUMN_ID,
      header: '',
      cell: ({ row: { original: { description } } }) => (
        <Box sx={{ ml: 4 }} display="flex" alignItems="center" height="32px" position="relative">
          <TextWithOverflowTooltip tooltipText={description}>
            {description}
          </TextWithOverflowTooltip>
        </Box>
      ),
    },
    {
      id: DEPRECATED_SINCE_COLUMN_ID,
      header: '',
      cell: ({ row: { original: { deprecatedInPreviousVersions } } }) => {
        const [deprecatedSince] = deprecatedInPreviousVersions ?? []
        if (deprecatedSince) {
          const { versionKey: versionToDisplay } = getSplittedVersionKey(deprecatedSince)

          return <TextWithOverflowTooltip tooltipText={versionToDisplay}>
            {versionToDisplay}
          </TextWithOverflowTooltip>
        }
      },
    },
  ], [])

  const data: DeprecatedItem[] = useMemo(
    () => [...deprecatedItems],
    [deprecatedItems])

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
        {getVisibleCells().map(({ column: { id } }) => (
          <TableCell key={id}>
            <Skeleton variant="text"/>
          </TableCell>
        ))}
      </TableRow>
    )
  }

  return (
    <>
      {getRowModel().rows.map(row => {
        const { deprecatedInfo } = row.original
        const hasDeprecatedInfo = packageRef?.refId !== packageKey
        const isDashboard = packageRef?.refId !== packageKey

        const cellsToRender = row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            colSpan={
              cell.column.id === DESCRIPTION_COLUMN_ID
                ? hasDeprecatedInfo
                  ? isDashboard ? 4 : 3
                  : isDashboard ? 5 : 4
                : undefined
            }
            data-testid={`Cell-${cell.column.id}`}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))

        if (hasDeprecatedInfo) {
          const deprecatedInfoCell = (
            <TableCell key={DETAILS_COLUMN_ID}>
              <Box display="flex" alignItems="center" height="32px" position="relative">
                <Box sx={{ visibility: 'hidden', height: '20px' }} className="hoverable">
                  {deprecatedInfo && (
                    <Tooltip
                      disableHoverListener={false}
                      title={<DeprecatedInfo info={deprecatedInfo}/>}
                      placement="right"
                    >
                      <Box sx={{ display: 'inline' }}>
                        <InfoIcon/>
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </TableCell>
          )

          cellsToRender.splice(cellsToRender.length - 1, 0, deprecatedInfoCell)
        }

        return <TableRow key={row.id}>{cellsToRender}</TableRow>
      })}
    </>
  )
})
