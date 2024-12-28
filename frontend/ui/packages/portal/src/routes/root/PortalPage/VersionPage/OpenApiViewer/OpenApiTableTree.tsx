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
import { Fragment, memo, useEffect, useMemo, useState } from 'react'
import { Box, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { ColumnDef, ExpandedState, VisibilityState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import { SubOpenApiTable } from './SubOpenApiTable'
import { COLUMNS_SIZES_MAP } from './openapi-table'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { groupOperationsByTags } from '@apihub/utils/operations'
import type { OperationData, OperationsData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID } from '@netcracker/qubership-apihub-ui-shared/entities/table-columns'

export type OpenApiTableTreeProps = {
  documentSlug: string
  operations: OperationsData
}

export const OpenApiTableTree: FC<OpenApiTableTreeProps> = memo(({ documentSlug, operations }) => {
  const operationsGroupedByTag = useMemo(() => groupOperationsByTags(operations), [operations])

  const columns: ColumnDef<OpenApiTreeTableData>[] = useMemo(() => [
    {
      id: ENDPOINT_COLUMN_ID,
      header: 'Tag / Name / Path',
      cell: ({ row }) =>
        row.getCanExpand() && (
          <Box sx={{ display: 'flex' }}>
            <IconButton sx={{ p: 0, mr: 1 }} onClick={row.getToggleExpandedHandler()}>
              {row.getIsExpanded()
                ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }} />
                : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }} />}
            </IconButton>
            <TextWithOverflowTooltip tooltipText={row.original.tag}>
              {row.original.tag}
            </TextWithOverflowTooltip>
          </Box>
        ),
    },
    {
      id: API_AUDIENCE_COLUMN_ID,
      header: 'Audience',
    },
    {
      id: API_KIND_COLUMN_ID,
      header: 'Kind',
    },
  ], [])

  const data: OpenApiTreeTableData[] = useMemo(
    () => Object.entries(operationsGroupedByTag).map(([tag, operations]) => ({
      tag: tag,
      operations: operations as OperationData[],
    })),
    [operationsGroupedByTag],
  )

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, toggleAllRowsExpanded } = useReactTable({
    data: data,
    columns: columns,
    state: { expanded, columnVisibility },
    getRowCanExpand: () => true,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  // Also we can use useMemo here
  useEffect(() => toggleAllRowsExpanded(true), [toggleAllRowsExpanded])

  return (
    <TableContainer sx={{ mt: 1 }}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableCell
                  key={header.id}
                  align="left"
                  sx={{ width: COLUMNS_SIZES_MAP[header.id] ?? 'auto' }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
                  <TableCell key={cell.id} data-testid="TagCell">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {row.getIsExpanded() && (
                <SubOpenApiTable documentSlug={documentSlug} operations={row.original.operations ?? []} />
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

export type OpenApiTreeTableData = Partial<{
  tag: string
  operations: ReadonlyArray<OperationData>
}>
