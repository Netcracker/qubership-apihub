import { Skeleton, styled, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import {
  type ColumnSizingInfoState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/table-core'
import { type FC, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import {
  type ColumnModel,
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'

export type ContractsEntityListTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: ReadonlyArray<TData>
  getRowId: (row: TData) => string
  columnModels: ColumnModel[]
  emptyMessage: string
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isLoading?: boolean
}

function ContractsEntityListTableInner<TData>({
  columns,
  data,
  getRowId,
  columnModels,
  emptyMessage,
  fetchNextPage,
  isNextPageFetching,
  hasNextPage,
  isLoading = false,
}: ContractsEntityListTableProps<TData>): JSX.Element {
  const tableData = useMemo(() => [...data], [data])
  const tableMinWidth = useMemo(
    () => columnModels.reduce((sum, { width, fixedWidth }) => sum + (width ?? fixedWidth ?? 0), 0),
    [columnModels],
  )
  const resolveRowId = useCallback((row: TData) => getRowId(row), [getRowId])

  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: columnModels,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: tableData,
    columns: columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
    getRowId: resolveRowId,
  })

  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  useIntersectionObserver(scrollRef, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <Placeholder
      invisible={isNotEmpty(data) || isLoading}
      area={CONTENT_PLACEHOLDER_AREA}
      message={emptyMessage}
      data-testid="NoItemsPlaceholder"
    >
      <StyledTableContainer ref={tableContainerRef}>
        <StyledTable minWidth={tableMinWidth}>
          <TableHead>
            {getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((headerColumn, index) => (
                  <ResizableHeadCell
                    key={headerColumn.id}
                    align="left"
                    width={actualColumnSizing ? actualColumnSizing[headerColumn.id] : headerColumn.getSize()}
                  >
                    {flexRender(headerColumn.column.columnDef.header, headerColumn.getContext())}
                    {index !== headerGroup.headers.length - 1 &&
                      <ColumnDelimiter header={headerColumn} resizable={true} />}
                  </ResizableHeadCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {getRowModel().rows.map(row => (
              <TableRow key={row.id} hover>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {isLoading && <TableSkeleton columnModels={columnModels} />}
            {hasNextPage && (
              <RowSkeleton
                refObject={scrollRef}
                columnModels={columnModels}
              />
            )}
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
    </Placeholder>
  )
}

export const ContractsEntityListTable = Object.assign(ContractsEntityListTableInner, {
  displayName: 'ContractsEntityListTable',
})

type TableSkeletonProps = {
  columnModels: ColumnModel[]
}

const TableSkeleton: FC<TableSkeletonProps> = ({ columnModels }) => (
  createComponents(<RowSkeleton columnModels={columnModels} />, DEFAULT_NUMBER_SKELETON_ROWS)
)

TableSkeleton.displayName = 'TableSkeleton'

type RowSkeletonProps = {
  refObject?: RefObject<HTMLDivElement>
  columnModels: ColumnModel[]
}

const RowSkeleton: FC<RowSkeletonProps> = ({ refObject, columnModels }) => (
  <TableRow>
    {columnModels.map((column, index) => (
      <TableCell key={column.name} ref={index === 0 ? refObject : undefined}>
        <Skeleton variant="rectangular" width="80%" />
      </TableCell>
    ))}
  </TableRow>
)

RowSkeleton.displayName = 'RowSkeleton'

const StyledTableContainer = styled(TableContainer)({
  overflowX: 'hidden',
})

const StyledTable = styled(Table, {
  shouldForwardProp: (prop) => prop !== 'minWidth',
})<{ minWidth: number }>(({ minWidth }) => ({
  minWidth,
}))

const ResizableHeadCell = styled(TableCell)(({ theme }) => ({
  '&:hover': {
    borderRight: `2px solid ${theme.palette.divider}`,
  },
}))
