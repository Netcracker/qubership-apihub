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

import type { FC, ReactNode, RefObject } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef, ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Box, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { NavLink } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageVersion, PackageVersions } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { REVISION_DELIMITER } from '@apihub/entities/versions'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import { LabelsTableCell } from '@netcracker/qubership-apihub-ui-shared/components/LabelsTableCell'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { LatestRevisionMark } from '@netcracker/qubership-apihub-ui-shared/components/LatestRevisionMark'
import type { Principal } from '@netcracker/qubership-apihub-ui-shared/entities/principals'
import { PrincipalView } from '@netcracker/qubership-apihub-ui-shared/components/PrincipalView'
import type { Revision, Revisions } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'
import type { PublishMeta } from '@netcracker/qubership-apihub-ui-shared/entities/publish-meta'

export type VersionHistoryTableProps = {
  value: PackageVersions | Revisions
  packageKey: Key
  refObject: RefObject<HTMLDivElement>
  hasNextPage?: boolean
  actionsCell?: (item: PackageVersion | Revision) => ReactNode
  isLoading: boolean
}

export const VersionHistoryTable: FC<VersionHistoryTableProps> = memo<VersionHistoryTableProps>((props) => {
  const { value, actionsCell, packageKey, hasNextPage, refObject, isLoading } = props

  const isVersionsHistoryContent = isVersionsHistory(value)

  // Resizing logic
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const columnsModel = useMemo(() => getColumnsModel(isVersionsHistoryContent), [isVersionsHistoryContent])
  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: columnsModel,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })
  // End of resizing logic

  const baseColumns: ColumnDef<VersionHistoryItem>[] = useMemo(() => [
    {
      id: VERSION_COLUMN_ID,
      header: () => <CustomTableHeadCell title={`${isVersionsHistoryContent ? 'Version' : 'Revision'}`}/>,
      cell: ({ row: { original: { version, revision, latest } } }) => {
        const value = isVersionsHistoryContent ? version : `${REVISION_DELIMITER}${revision}`
        const isLatestRevision = !isVersionsHistoryContent && latest
        return (
          <TextWithOverflowTooltip tooltipText={value}>
            <Box display="flex" gap={1} alignItems="center">
              <Link
                component={NavLink}
                to={{
                  pathname: format(
                    '/portal/packages/{}/{}',
                    encodeURIComponent(packageKey),
                    encodeURIComponent(isLatestRevision ? getSplittedVersionKey(version).versionKey : version),
                  ),
                }}
              >
                {value}
              </Link>
              <LatestRevisionMark latest={isLatestRevision}/>
            </Box>
          </TextWithOverflowTooltip>
        )
      },
    },
    {
      id: VERSION_STATUS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Status"/>,
      cell: ({ row: { original: { status } } }) => <CustomChip value={status}/>,
    },
    {
      id: LABELS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Labels"/>,
      cell: ({ row: { original: { labels } } }) => {
        if (labels) {
          return <LabelsTableCell labels={labels}/>
        }
        return null
      },
    },
    {
      id: PUBLICATION_DATE_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Publication Date"/>,
      cell: ({ row: { original: { createdAt } } }) => (
        <FormattedDate value={createdAt}/>
      ),
    },
    {
      id: PUBLISHED_BY_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Published by"/>,
      cell: ({ row: { original: { createdBy } } }) => (
        <PrincipalView value={createdBy}/>
      ),
    },
  ], [isVersionsHistoryContent, packageKey])

  const previousVersionColumn: ColumnDef<VersionHistoryItem> = useMemo(() => ({
    id: PREVIOUS_VERSION_COLUMN_ID,
    header: () => <CustomTableHeadCell title="Previous Version"/>,
    cell: ({ row: { original: { previousValueKey } } }) => {
      const { versionKey: previousVersion } = getSplittedVersionKey(previousValueKey)
      return (
        <TextWithOverflowTooltip tooltipText={previousVersion}>
          {previousVersion}
        </TextWithOverflowTooltip>
      )
    },
  }), [])

  const actionsColumn: ColumnDef<VersionHistoryItem> = useMemo(() => ({
    id: ACTIONS_COLUMN_ID,
    header: '',
    cell: ({ row: { original } }) => (
      actionsCell?.(isVersionsHistoryContent
        ? toPackageVersion(original)
        : toRevision(original),
      )
    ),
  }), [actionsCell, isVersionsHistoryContent])

  const columns: ColumnDef<VersionHistoryItem>[] = useMemo(() => (
      isVersionsHistoryContent
        ? [
          ...baseColumns,
          previousVersionColumn,
          actionsColumn,
        ]
        : [
          ...baseColumns,
          actionsColumn,
        ]
    ),
    [actionsColumn, baseColumns, isVersionsHistoryContent, previousVersionColumn],
  )

  const tableContent = useMemo(() => toVersionHistoryItems(value), [value])
  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: tableContent,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    // Resizing logic
    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
    // End of resizing logic
  })

  // Resizing logic
  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )
  // End of resizing logic

  return (
    <Box>
      <TableContainer
        ref={tableContainerRef}
        sx={{ mt: 1, maxHeight: 'calc(100vh - 265px)', overflowX: 'hidden' }}
      >
        <Table>
          <TableHead>
            {getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {/*TODO: delete condition header?.id !== REVISION_COLUMN_ID && when "Extend API for Admin UI" will be closed*/}
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
                      <ColumnDelimiter header={headerColumn} resizable={true}/>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.column.id}
                    sx={{ overflow: 'hidden' }}
                    data-testid={`Cell-${cell.column.id}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {isLoading && <TableSkeleton isVersionHistory={isVersionsHistoryContent}/>}
            {hasNextPage && <RowSkeleton refObject={refObject} isVersionHistory={isVersionsHistoryContent}/>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
})

const VERSION_COLUMN_ID = 'version'
const VERSION_STATUS_COLUMN_ID = 'version-status'
const LABELS_COLUMN_ID = 'labels'
const PUBLICATION_DATE_COLUMN_ID = 'publication-date'
const PUBLISHED_BY_COLUMN_ID = 'published-by'
const PREVIOUS_VERSION_COLUMN_ID = 'previous-version'
const ACTIONS_COLUMN_ID = 'actions'

const BASE_COLUMNS_MODEL: ColumnModel[] = [
  { name: VERSION_COLUMN_ID },
  { name: VERSION_STATUS_COLUMN_ID, fixedWidth: 130 },
  { name: LABELS_COLUMN_ID },
  { name: PUBLICATION_DATE_COLUMN_ID, fixedWidth: 130 },
  { name: PUBLISHED_BY_COLUMN_ID },
]

function getColumnsModel(isVersionsHistory: boolean): ColumnModel[] {
  const ACTIONS_COLUMN = { name: ACTIONS_COLUMN_ID, fixedWidth: 70 }
  const PREVIOUS_VERSION_COLUMN = { name: PREVIOUS_VERSION_COLUMN_ID }

  return isVersionsHistory
    ? [
      ...BASE_COLUMNS_MODEL,
      PREVIOUS_VERSION_COLUMN,
      ACTIONS_COLUMN,
    ]
    : [
      ...BASE_COLUMNS_MODEL,
      ACTIONS_COLUMN,
    ]
}

export type VersionHistoryItem = {
  version: Key
  revision?: number
  status: VersionStatus
  createdBy: Principal
  createdAt: string
  labels?: string[]
  previousValueKey?: Key
  latest?: boolean
  publishMeta?: PublishMeta
}

function isVersionsHistory(value: PackageVersions | Revisions): value is PackageVersions {
  return (value as PackageVersions)[0]?.key !== undefined
}

function toPackageVersion(value: VersionHistoryItem): PackageVersion {
  return {
    ...value,
    key: value.version,
    createdBy: value.createdBy,
    versionLabels: value.labels ?? [],
    previousVersion: value.previousValueKey,
    latestRevision: value.latest ?? false,
  }
}

function toRevision(value: VersionHistoryItem): Revision {
  return {
    ...value,
    revision: value.revision!,
    version: value.version,
    createdBy: value.createdBy,
    revisionLabels: value.labels,
    latestRevision: value.latest ?? false,
    publishMeta: value.publishMeta,
  }
}

function toVersionHistoryItems(value: PackageVersions | Revisions): VersionHistoryItem[] {
  const isVersionsItem = isVersionsHistory(value)

  if (isVersionsItem) {
    const data = value as PackageVersions
    return data.map(item => {
      return ({
        version: item.key,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt ?? '',
        labels: item.versionLabels,
        previousValueKey: item.previousVersion,
        latest: item.latestRevision,
      })
    })
  } else {
    const data = value as Revisions
    return data.map(item => {
      return ({
        ...item,
        createdBy: item.createdBy,
        createdAt: item.createdAt ?? '',
        labels: item.revisionLabels,
        latest: item.latestRevision,
      })
    })
  }
}

type TableSkeletonProps = {
  isVersionHistory: boolean
}
const TableSkeleton: FC<TableSkeletonProps> = memo<TableSkeletonProps>(({ isVersionHistory }) => {
  return createComponents(<RowSkeleton isVersionHistory={isVersionHistory}/>, DEFAULT_NUMBER_SKELETON_ROWS)
})

type RowSkeletonProps = {
  refObject?: RefObject<HTMLDivElement>
  isVersionHistory?: boolean
}

const RowSkeleton: FC<RowSkeletonProps> = memo<RowSkeletonProps>(({ refObject, isVersionHistory }) => {
  return (
    <TableRow>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell ref={refObject} width={'80'}/>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell ref={refObject}>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      {isVersionHistory && (
        <TableCell ref={refObject}/>
      )}
      <TableCell ref={refObject}/>
    </TableRow>
  )
})
