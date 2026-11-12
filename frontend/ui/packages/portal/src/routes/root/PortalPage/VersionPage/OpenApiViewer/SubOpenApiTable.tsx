import type { FC } from 'react'
import { memo, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import { TableCell, TableRow } from '@mui/material'
import type { ColumnFiltersState, VisibilityState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import { EndpointTableCell } from './EndpointTableCell'
import { COLUMNS_SIZES_MAP } from './operation-table'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID } from '@netcracker/qubership-apihub-ui-shared/entities/table-columns'

export type SubOpenApiTableProps = {
  documentSlug: string
  operations: ReadonlyArray<OperationData>
}

export const SubOpenApiTable: FC<SubOpenApiTableProps> = memo(({ documentSlug, operations }) => {
  const columns: ColumnDef<TableData>[] = useMemo(() => [
    {
      id: ENDPOINT_COLUMN_ID,
      header: 'Endpoints',
      cell: ({ row }) => (
        <EndpointTableCell
          value={row}
          documentSlug={documentSlug}
          isSubTable
        />
      ),
    },
    {
      id: API_AUDIENCE_COLUMN_ID,
      header: 'Audience',
      cell: ({ row: { original: { operation } } }) => {
        if (operation?.apiAudience) {
          return operation.apiAudience
        }
      },
    },
    {
      id: API_KIND_COLUMN_ID,
      header: 'Type',
      cell: ({ row: { original: { operation } } }) => {
        if (operation?.apiKind) {
          return operation.apiKind
        }
      },
    },
  ], [documentSlug])

  const data: TableData[] = useMemo(() => operations.map(operation => {
    return ({
      operation: operation,
    })
  }), [operations])

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

  return (
    <>
      {getRowModel().rows.map(row => (
        <TableRow key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              sx={{ width: COLUMNS_SIZES_MAP[cell.id] ?? 'auto' }}
              data-testid={`Cell-${cell.column.id}`}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
})

type TableData = {
  operation: OperationData
}
