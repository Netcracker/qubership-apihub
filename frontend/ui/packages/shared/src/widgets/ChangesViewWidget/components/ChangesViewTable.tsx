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
import type { ColumnDef } from '@tanstack/table-core'
import type { FC, RefObject } from 'react'
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import { OperationChangeCell } from './OperationChangeCell'

import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import type { Key } from '../../../entities/keys'
import type { OperationChangeData, VersionChangesData } from '../../../entities/version-changelog'
import type { Package, PackageKind } from '../../../entities/packages'
import { DASHBOARD_KIND } from '../../../entities/packages'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '../../../hooks/table-resizing/useColumnResizing'
import { CustomTableHeadCell } from '../../../components/CustomTableHeadCell'
import { TextWithOverflowTooltip } from '../../../components/TextWithOverflowTooltip'
import { DEFAULT_TAG } from '../../../entities/operations'
import { Changes } from '../../../components/Changes'
import { insertIntoArrayByIndex } from '../../../utils/arrays'
import {
  ACTION_TYPE_COLOR_MAP,
  NON_BREAKING_CHANGE_SEVERITY,
  REPLACE_ACTION_TYPE,
  SEMI_BREAKING_CHANGE_SEVERITY,
} from '../../../entities/change-severities'
import { useIntersectionObserver } from '../../../hooks/common/useIntersectionObserver'
import { ColumnDelimiter } from '../../../components/ColumnDelimiter'
import { createComponents } from '../../../utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '../../../utils/constants'
import type { ChangesViewTableData } from '../const/table'
import { CHANGES_COLUMN_ID, COLUMNS_MODELS } from '../const/table'
import { useResizeObserver } from '../../../hooks/common/useResizeObserver'
import type { ApiType } from '../../../entities/api-types'
import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID, PACKAGE_COLUMN_ID, TAGS_COLUMN_ID } from '../../../entities/table-columns'

export type FetchNextPage = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<VersionChangesData, Error>>

export type SubTableComponentProps = {
  value: Row<ChangesViewTableData>
  packageKey: Key | undefined
  versionKey: Key | undefined
  apiType?: ApiType
  packageKind?: PackageKind
}

export type ChangeViewTableProps = {
  value: ReadonlyArray<OperationChangeData>
  packageKey: Key
  versionKey: Key
  packageObject: Package | null
  apiType?: ApiType
  mainPackageKind?: PackageKind
  fetchNextPage?: FetchNextPage
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  SubTableComponent: FC<SubTableComponentProps>
  isLoading: boolean
}

export const ChangesViewTable: FC<ChangeViewTableProps> = memo<ChangeViewTableProps>((
  {
    value,
    packageKey,
    versionKey,
    packageObject,
    apiType,
    mainPackageKind,
    fetchNextPage,
    isNextPageFetching,
    hasNextPage,
    SubTableComponent,
    isLoading,
  }) => {
  const isDashboardType = useMemo(() => packageObject?.kind === DASHBOARD_KIND, [packageObject?.kind])

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

  const columns: ColumnDef<ChangesViewTableData>[] = useMemo(() => {
    const result: ColumnDef<ChangesViewTableData>[] = [
      {
        id: ENDPOINT_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Endpoint / Path" />,
        cell: ({ row }) => (
          <TextWithOverflowTooltip>
            <OperationChangeCell value={row} mainPackageKind={mainPackageKind} />
          </TextWithOverflowTooltip>
        ),
      },
      {
        id: TAGS_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Tags" />,
        cell: ({ row: { original: { change } } }) => {
          const content = (change?.tags ?? []).join(', ')
          return (
            <TextWithOverflowTooltip tooltipText={content}>
              {content || DEFAULT_TAG}
            </TextWithOverflowTooltip>
          )
        },
      },
      {
        id: CHANGES_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Changes summary" />,
        cell: ({ row: { original: { change } } }) => {
          const changeSummary = change?.changeSummary
          if (changeSummary) {
            return (
              <Changes value={changeSummary} mode="compact" />
            )
          }
        },
      },
      {
        id: API_AUDIENCE_COLUMN_ID,
        header: 'Audience',
        cell: ({ row: { original: { change } } }) => {
          const currentApiAudience = change?.currentOperation?.apiAudience
          const previousApiAudience = change?.previousOperation?.apiAudience
          if (currentApiAudience && previousApiAudience && currentApiAudience !== previousApiAudience) {
            return (<>{currentApiAudience} <span style={{ textDecoration: 'line-through' }}>{previousApiAudience}</span></>)
          }
          if (currentApiAudience) {
            return (currentApiAudience)
          }
          if (previousApiAudience) {
            return (previousApiAudience)
          }
        },
      },
      {
        id: API_KIND_COLUMN_ID,
        header: 'Kind',
        cell: ({ row: { original: { change } } }) => change.apiKind,
      },
    ]

    if (isDashboardType) {
      insertIntoArrayByIndex(result, {
        id: PACKAGE_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Package" />,
        cell: ({ row: { original: { change: { packageRef, previousPackageRef } } } }) => {
          const ref = packageRef ?? previousPackageRef
          if (ref) {
            return (
              <TextWithOverflowTooltip tooltipText={ref.name}>
                {ref.name}
              </TextWithOverflowTooltip>
            )
          }
        },
      }, 2)
    }

    return result
  }, [isDashboardType, mainPackageKind])

  const data: ChangesViewTableData[] = useMemo(() => value.map(change => {
    const {
      action,
      changeSummary: {
        breaking = 0,
        [SEMI_BREAKING_CHANGE_SEVERITY]: semiBreaking = 0,
        deprecated = 0,
        [NON_BREAKING_CHANGE_SEVERITY]: nonBreaking = 0,
        annotation = 0,
        unclassified = 0,
      } = {},
    } = change
    return {
      change: change,
      canExpand: action === REPLACE_ACTION_TYPE && (breaking > 0 || semiBreaking > 0 || deprecated > 0 || nonBreaking > 0 || annotation > 0 || unclassified > 0),
    }
  }), [value])

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    state: { expanded, columnVisibility },
    getRowCanExpand: (row) => row.original.canExpand,
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
    packageObject?.kind === DASHBOARD_KIND
      ? <DashboardRowSkeleton refObject={ref} />
      : <PackageRowSkeleton refObject={ref} />),
    [packageObject?.kind],
  )

  return (
    <TableContainer ref={tableContainerRef} sx={{ mt: 1 }}>
      <Table sx={{ minWidth: 700 }}>
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
              <TableRow key={row.id} sx={{ backgroundColor: ACTION_TYPE_COLOR_MAP[row.original.change?.action] }}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {row.getIsExpanded() && (
                <SubTableComponent
                  value={row}
                  packageKey={isDashboardType ? row.original.change.packageRef?.key : packageKey}
                  versionKey={isDashboardType ? row.original.change.packageRef?.version : versionKey}
                  apiType={apiType}
                  packageKind={packageObject?.kind}
                />
              )}
            </Fragment>
          ))}
          {isLoading && <TableSkeleton isDashboard={packageObject?.kind === DASHBOARD_KIND} />}
          {hasNextPage && rowSkeleton}
        </TableBody>
      </Table>
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
    </TableRow>
  )
})
