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

import type { Service } from '@apihub/entities/services'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'
import type { ColumnDef } from '@tanstack/table-core'
import { Box, Button, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import type {
  ColumnSizingInfoState,
  ColumnSizingState,
  ExpandedState,
  OnChangeFn,
  VisibilityState,
} from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { ServiceOrDocumentationTableCell } from '../ServiceOrDocumentationTableCell'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
import { ServiceLabelsTableCell } from '../ServiceLabelsTableCell'
import { useEventBus } from '../../../../../EventBusProvider'
import { BwcStatusTableCell } from '../BwcStatusTableCell'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ValidationResultsStepTableProps = {
  value: ReadonlyArray<Service>
  isLoading: boolean
}

export const ValidationResultsStepTable: FC<ValidationResultsStepTableProps> = memo<ValidationResultsStepTableProps>(({
  value,
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
    defaultMinColumnSize: 180,
  })

  const { snapshotPublicationInfo } = useSnapshotPublicationInfo()
  const { showChangeViewDialog } = useEventBus()

  const openChangeView = useCallback((service: Service, viewChangesUrl?: string, apiType?: ApiType) => {
    return showChangeViewDialog({ service, viewChangesUrl, apiType })
  }, [showChangeViewDialog])

  const columns: ColumnDef<TableData>[] = useMemo(() => [
    {
      id: SERVICE_OR_DOCUMENTATION_COLUMN_ID,
      header: 'Service / Documentation',
      cell: ({ row }) => <ServiceOrDocumentationTableCell value={row}/>,
    },
    {
      id: SERVICE_LABELS_COLUMN_ID,
      header: 'Labels',
      cell: ({ row }) => <ServiceLabelsTableCell value={row}/>,
    },
    {
      id: BASELINE_PACKAGE_COLUMN_ID,
      header: 'Baseline Package',
      cell: ({ row }) => <BaselinePackageTableCell value={row}/>,
    },
    {
      id: BWC_STATUS_COLUMN_ID,
      header: 'BWC Status',
      cell: ({ row }) => <BwcStatusTableCell value={row}/>,
    },
    {
      id: CHANGES_COLUMN_ID,
      header: 'Changes',
      cell: ({ row: { original: { service, changeSummary, viewChangesUrl, apiType } } }) => {
        if (service && changeSummary) {
          return (
            <Box onClick={() => openChangeView(service, viewChangesUrl, apiType)}>
              <Changes mode="compact" value={changeSummary}/>
            </Box>
          )
        }

        return null
      },
    },
    {
      id: VIEW_CHANGES_URL_COLUMN_ID,
      cell: ({ row: { original: { viewChangesUrl } } }) => {
        if (viewChangesUrl) {
          return (
            <Button
              data-testid="ViewChangesButton"
              sx={{ visibility: 'hidden', p: 0, height: 10, whiteSpace: 'nowrap' }}
              className="hoverable"
              component="a"
              variant="text"
              href={viewChangesUrl}
              target="_blank"
              startIcon={<ArrowOutwardRoundedIcon/>}
            >
              View Changes
            </Button>
          )
        }

        return null
      },
    },
  ], [openChangeView])

  const data: TableData[] = useMemo(() => value.filter(service => !!snapshotPublicationInfo.services.find(({ key }) => key === service.key)).map(service => {
    const {
      changeSummary,
      viewChangesUrl,
      baselineFound,
      baselineVersionFound,
      apiTypes,
    } = snapshotPublicationInfo.services.find(({ key }) => key === service.key)!
    const [apiType = DEFAULT_API_TYPE] = apiTypes ?? []
    return ({
      service: service,
      bwcErrors: (baselineFound && baselineVersionFound) ? changeSummary?.breaking : undefined,
      changeSummary: changeSummary,
      viewChangesUrl: viewChangesUrl,
      children: service.specs?.map(spec => ({ spec })),
      baselineFound: baselineFound,
      baselineVersionFound: baselineVersionFound,
      apiType: apiType,
    })
  }), [snapshotPublicationInfo.services, value])

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    columnResizeMode: 'onChange',
    state: { expanded, columnVisibility },
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
    getSubRows: row => row.children,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <TableContainer sx={{ mt: 1 }} ref={tableContainerRef}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <TableCell
                  key={header.id}
                  align="left"
                  width={actualColumnSizing ? actualColumnSizing[header.id] : header.getSize()}
                  sx={{
                    '&:hover': {
                      borderRight: '2px solid rgba(224, 224, 224, 1)',
                    },
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {index !== headerGroup.headers.length - 1 && <ColumnDelimiter header={header} resizable={true}/>}
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
                  data-testid={`Cell-${cell.column.id}`}
                  key={cell.column.id}
                  align={cell.column.id === VIEW_CHANGES_URL_COLUMN_ID ? 'right' : 'left'}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {isLoading && <TableSkeleton/>}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

const SERVICE_OR_DOCUMENTATION_COLUMN_ID = 'service-or-documentation'
const SERVICE_LABELS_COLUMN_ID = 'service-labels'
const BASELINE_PACKAGE_COLUMN_ID = 'baseline-package'
const BWC_STATUS_COLUMN_ID = 'bwc-status'
const CHANGES_COLUMN_ID = 'changes'
const VIEW_CHANGES_URL_COLUMN_ID = 'view-changes-url'
const COLUMNS_MODELS: ColumnModel[] = [
  { name: SERVICE_OR_DOCUMENTATION_COLUMN_ID },
  { name: SERVICE_LABELS_COLUMN_ID },
  { name: BASELINE_PACKAGE_COLUMN_ID },
  { name: BWC_STATUS_COLUMN_ID },
  { name: CHANGES_COLUMN_ID },
  { name: VIEW_CHANGES_URL_COLUMN_ID },
]

type TableData = Partial<{
  service: Service
  spec: Spec
  bwcErrors: number
  changeSummary: ChangesSummary
  viewChangesUrl: string
  children: TableData[]
  baselineFound: boolean
  baselineVersionFound: boolean
  apiType: ApiType
}>

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
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell/>
    </TableRow>
  )
})
