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

import type { FC, RefObject } from 'react'
import * as React from 'react'
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type {
  ColumnSizingInfoState,
  ColumnSizingState,
  ExpandedState,
  OnChangeFn,
  Row,
  VisibilityState,
} from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { EndpointTableCell } from './EndpointTableCell'
import { CUSTOM_METADATA_COLUMN_ID } from './openapi-table'
import { CustomMetadataCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomMetadataCell'
import type { FetchNextOperationList, JSONValue, OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE, DEFAULT_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { insertIntoArrayByIndex, isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID, PACKAGE_COLUMN_ID, TAGS_COLUMN_ID } from '@netcracker/qubership-apihub-ui-shared/entities/table-columns'

export type OpenApiTableData = {
  operation: OperationData
}

export type SubTableProps = {
  value: Row<OpenApiTableData>
}

const DASHBOARD_COLUMNS_MODELS: ColumnModel[] = [
  { name: ENDPOINT_COLUMN_ID, width: 328 },
  { name: TAGS_COLUMN_ID, width: 155 },
  { name: PACKAGE_COLUMN_ID, width: 226 },
  { name: API_AUDIENCE_COLUMN_ID, fixedWidth: 104 },
  { name: API_KIND_COLUMN_ID, fixedWidth: 104 },
  { name: CUSTOM_METADATA_COLUMN_ID, width: 233 },
]

const minDashboardTableWidth = DASHBOARD_COLUMNS_MODELS.reduce(
  (sum, { width, fixedWidth }) => sum + (width || fixedWidth || 0), 0,
)

const PACKAGE_COLUMNS_MODELS: ColumnModel[] = [
  { name: ENDPOINT_COLUMN_ID, width: 454 },
  { name: TAGS_COLUMN_ID, width: 238 },
  { name: API_AUDIENCE_COLUMN_ID, fixedWidth: 80 },
  { name: API_KIND_COLUMN_ID, width: 89 },
  { name: CUSTOM_METADATA_COLUMN_ID, width: 265 },
]

const minPackageTableWidth = PACKAGE_COLUMNS_MODELS.reduce(
  (sum, { width, fixedWidth }) => sum + (width || fixedWidth || 0), 0,
)

export type OpenApiTableProps = {
  value: ReadonlyArray<OperationData>
  fetchNextPage?: FetchNextOperationList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  additionalColumns?: ColumnDef<OpenApiTableData>[]
  isExpandableRow?: (row: Row<OpenApiTableData>) => boolean
  SubTableComponent?: FC<SubTableProps>
  columnSizes?: ColumnModel[]
  tableMinWidth?: number
  isLoading: boolean
  textFilter?: string
  apiType?: ApiType
}

export const OpenApiTable: FC<OpenApiTableProps> = memo<OpenApiTableProps>((
  {
    value,
    fetchNextPage,
    isNextPageFetching,
    hasNextPage,
    additionalColumns = [],
    isExpandableRow,
    SubTableComponent,
    columnSizes,
    tableMinWidth,
    isLoading,
    textFilter,
    apiType,
  },
) => {

  const currentPackage = useCurrentPackage()
  const isDashboard = currentPackage?.kind === DASHBOARD_KIND
  const defaultMinWidth = isDashboard ? minDashboardTableWidth : minPackageTableWidth

  const columns: ColumnDef<OpenApiTableData>[] = useMemo(() => {
    const result: ColumnDef<OpenApiTableData>[] = [
      {
        id: ENDPOINT_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Endpoints" />,
        cell: ({ row }) => <EndpointTableCell value={row} />,
      },
      {
        id: TAGS_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Tag" />,
        cell: ({ row: { original: { operation } } }) => {
          if (operation) {
            const tags = operation.tags?.join(', ') ?? DEFAULT_TAG
            return (
              <TextWithOverflowTooltip tooltipText={tags}>
                {tags}
              </TextWithOverflowTooltip>
            )
          }
        },
      },
      {
        id: API_AUDIENCE_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Audience" />,
        cell: ({ row: { original: { operation } } }) => {
          if (operation?.apiAudience) {
            return (
              <TextWithOverflowTooltip tooltipText={operation.apiAudience}>
                {operation.apiAudience}
              </TextWithOverflowTooltip>
            )
          }
        },
      },
      {
        id: API_KIND_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Kind" />,
        cell: ({ row: { original: { operation } } }) => {
          if (operation?.apiKind) {
            return (
              <TextWithOverflowTooltip tooltipText={operation.apiKind}>
                {operation.apiKind}
              </TextWithOverflowTooltip>
            )
          }
        },
      },
      ...additionalColumns,
    ]

    API_TYPE_COLUMNS_MAP[apiType ?? DEFAULT_API_TYPE]?.(result, textFilter)

    if (isDashboard) {
      insertIntoArrayByIndex(result, {
        id: PACKAGE_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Package" />,
        cell: ({ row: { original: { operation } } }) => {
          const packageRef = operation?.packageRef
          if (packageRef) {
            return (
              <TextWithOverflowTooltip tooltipText={packageRef.name}>
                {packageRef.name}
              </TextWithOverflowTooltip>
            )
          }
        },
      }, 2)
    }

    return result
  }, [additionalColumns, apiType, isDashboard, textFilter])

  const data: OpenApiTableData[] = useMemo(() => value.map(operation => {
    return ({
      operation: operation,
    })
  }), [value])

  const strictColumnWidths = useMemo(() => {
    if (columnSizes) {
      return columnSizes
    }
    return isDashboard ? DASHBOARD_COLUMNS_MODELS : PACKAGE_COLUMNS_MODELS
  }, [isDashboard, columnSizes])

  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: strictColumnWidths,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    state: { expanded, columnVisibility },
    getRowCanExpand: isExpandableRow,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
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

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  const rowSkeleton = useMemo(() => (
    isDashboard
      ? <DashboardRowSkeleton key="row-skeleton" refObject={ref} />
      : <PackageRowSkeleton key="row-skeleton" refObject={ref} />
  ), [isDashboard])

  return (
    <TableContainer ref={tableContainerRef} sx={{ overflowX: 'hidden' }}>
      <Table sx={{ minWidth: tableMinWidth || defaultMinWidth }}>
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
            <Fragment key={row.id}>
              <TableRow>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {row.getIsExpanded() && SubTableComponent && (<SubTableComponent value={row} />)}
            </Fragment>
          ))}
          {isLoading && <TableSkeleton isDashboard={isDashboard} />}
          {hasNextPage && rowSkeleton}
        </TableBody>
      </Table>
      {isLoading || isEmpty(value) && (
        <Placeholder
          sx={{ width: 'inherit' }}
          invisible={isNotEmpty(value)}
          area={CONTENT_PLACEHOLDER_AREA}
          message="No operations"
          testId="NoOperationsPlaceholder"
        />
      )}
    </TableContainer>
  )
})

type TableSkeletonProps = {
  isDashboard: boolean
}

const TableSkeleton: FC<TableSkeletonProps> = memo<TableSkeletonProps>(({ isDashboard }) => {
  if (isDashboard) {
    return createComponents(<DashboardRowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
  }
  return createComponents(<PackageRowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
})

type RowSkeletonProps = {
  refObject?: RefObject<HTMLDivElement>
}

const DashboardRowSkeleton: FC<RowSkeletonProps> = memo<RowSkeletonProps>(({ refObject }) => {
  return (
    <TableRow>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell />
      <TableCell />
    </TableRow>
  )
})

const PackageRowSkeleton: FC<RowSkeletonProps> = memo<RowSkeletonProps>(({ refObject }) => {
  return (
    <TableRow>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'} />
      </TableCell>
      <TableCell />
      <TableCell />
    </TableRow>
  )
})

type ColumnModelCallback = (tableColumns: ColumnDef<OpenApiTableData, unknown>[], textFilter: string | undefined) => void
const API_TYPE_COLUMNS_MAP: Record<ApiType, ColumnModelCallback> = {
  [API_TYPE_REST]: (tableColumns, textFilter) => tableColumns.push({
    id: CUSTOM_METADATA_COLUMN_ID,
    header: () => <CustomTableHeadCell title="Custom Metadata" />,
    cell: ({ row: { original: { operation } } }) => {
      if (operation?.customTags) {
        return (
          <CustomMetadataCell
            metaData={operation.customTags as { [key: string]: JSONValue }}
            textFilter={textFilter}
          />
        )
      }
    },
  }),
  [API_TYPE_GRAPHQL]: () => null,
}
