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
import {
  Box,
  Button,
  Checkbox,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import type {
  ColumnSizingInfoState,
  ColumnSizingState,
  ExpandedState,
  OnChangeFn,
  RowSelectionState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useServicePublishDetails } from './useServicePublishDetails'
import { ServiceOrDocumentationTableCell } from '../ServiceOrDocumentationTableCell'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
import { PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP } from '../../../constants'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'
import { useConfigureServiceSelection } from '../useConfigureServiceSelection'
import { ServiceLabelsTableCell } from '../ServiceLabelsTableCell'
import { serviceFilter } from '../utils'
import { useServices } from '../../../useServices'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { Service } from '@apihub/entities/services'
import type { ServiceConfig } from '@apihub/entities/publish-config'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { LOADING_STATUS_MARKER_VARIANT, StatusMarker } from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'

export type CreateSnapshotStepTableProps = {
  selectable?: boolean
  selected?: ServiceKey[]
  onSelect?: (value: ServiceKey[]) => void
  searchValue: string
}

export const CreateSnapshotStepTable: FC<CreateSnapshotStepTableProps> = memo<CreateSnapshotStepTableProps>((
  {
    selectable = true,
    selected = [],
    onSelect = () => {/*do nothing*/},
    searchValue,
  },
) => {
  const [{ services }, isServicesLoading] = useServices({ onlyWithSpecs: true })
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

  const { createSnapshotPublicationOptions: { config } } = useCreateSnapshotPublicationOptions()
  const { snapshotPublicationInfo, isSuccess: isSnapshotPublicationInfoSuccess } = useSnapshotPublicationInfo()
  const columns: ColumnDef<TableData>[] = useMemo(() => [
    {
      // activates global filtering in react-table
      accessorFn: () => true,
      id: SELECTION_COLUMN_ID,
      header: ({ table: { getIsAllRowsSelected, getIsSomePageRowsSelected, getToggleAllRowsSelectedHandler } }) => (
        <Checkbox
          sx={{ py: 0 }}
          disabled={!selectable}
          checked={getIsAllRowsSelected()}
          indeterminate={getIsSomePageRowsSelected() && !getIsAllRowsSelected()}
          onChange={getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row: { depth, getIsSelected, getIsSomeSelected, getToggleSelectedHandler } }) => {
        if (depth === 0) {
          return (
            <Checkbox
              sx={{ py: 0 }}
              disabled={!selectable}
              checked={getIsSelected()}
              indeterminate={getIsSomeSelected()}
              onChange={getToggleSelectedHandler()}
            />
          )
        }
      },
    },
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
      id: PUBLISH_STATUS_COLUMN_ID,
      header: 'Publish Status',
      cell: ({ row: { original, getIsSelected } }) => getIsSelected() &&
        <CreateSnapshotDetailsTableCell value={original}/>,
    },
    {
      id: VIEW_SNAPSHOT_URL_COLUMN_ID,
      cell: isSnapshotPublicationInfoSuccess ? ({ row: { original: { service, viewSnapshotUrl } } }) => {
        if (service && viewSnapshotUrl) {
          return (
            <Button
              data-testid="ViewSnapshotButton"
              sx={{ visibility: 'hidden', p: 0, height: 10, whiteSpace: 'nowrap' }}
              className="hoverable"
              component="a"
              variant="text"
              href={viewSnapshotUrl}
              target="_blank"
              startIcon={<ArrowOutwardRoundedIcon/>}
            >
              View Snapshot
            </Button>
          )
        }

        return null
      } : undefined,
    },
  ], [isSnapshotPublicationInfoSuccess, selectable])

  const data: TableData[] = useMemo(() => services.map(service => {
    const servicePublishInfo = snapshotPublicationInfo.services.find(({ key }) => key === service.key)

    return ({
      service: service,
      serviceConfig: config?.serviceConfigs.find(({ serviceId }) => serviceId === service.key),
      children: service.specs?.map(spec => ({ spec })),
      viewSnapshotUrl: servicePublishInfo?.viewSnapshotUrl,
      builderId: config?.builderId,
    })
  }), [config?.builderId, config?.serviceConfigs, snapshotPublicationInfo.services, services])

  const globalFilter = useMemo(() => ({
    searchValue,
  }), [searchValue])

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const { getHeaderGroups, getRowModel, getSelectedRowModel, resetRowSelection, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    columnResizeMode: 'onChange',
    state: { expanded, columnVisibility, rowSelection, globalFilter },
    globalFilterFn: serviceFilter,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
    getSubRows: row => row.children,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getColumnCanGlobalFilter: () => true,
  })

  useConfigureServiceSelection(
    rowSelection,
    setRowSelection,
    getSelectedRowModel,
    getRowModel,
    selected,
    onSelect,
  )

  useEffect(() => {
    if (isEmpty(selected)) {
      resetRowSelection()
    }
  }, [selected, resetRowSelection])

  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <Placeholder
      invisible={isNotEmpty(getRowModel().rows) || isServicesLoading}
      area={CONTENT_PLACEHOLDER_AREA}
      message={NO_SEARCH_RESULTS}
    >
      <TableContainer sx={{ mt: 1, pb: 7 }} ref={tableContainerRef}>
        <Table>
          <TableHead>
            {getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableCell
                    data-testid={`HeadCell-${header.id}`}
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
                    align={cell.column.id === VIEW_SNAPSHOT_URL_COLUMN_ID ? 'right' : 'left'}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {isServicesLoading && <TableSkeleton/>}
          </TableBody>
        </Table>
      </TableContainer>
    </Placeholder>
  )
})

const SELECTION_COLUMN_ID = 'selection'
const SERVICE_OR_DOCUMENTATION_COLUMN_ID = 'service-or-documentation'
const SERVICE_LABELS_COLUMN_ID = 'service-labels'
const BASELINE_PACKAGE_COLUMN_ID = 'baseline-package'
const PUBLISH_STATUS_COLUMN_ID = 'publish-status'
const VIEW_SNAPSHOT_URL_COLUMN_ID = 'view-snapshot-url'
const COLUMNS_MODELS: ColumnModel[] = [
  { name: SELECTION_COLUMN_ID, fixedWidth: 60 },
  { name: SERVICE_OR_DOCUMENTATION_COLUMN_ID },
  { name: SERVICE_LABELS_COLUMN_ID },
  { name: BASELINE_PACKAGE_COLUMN_ID },
  { name: PUBLISH_STATUS_COLUMN_ID },
  { name: VIEW_SNAPSHOT_URL_COLUMN_ID, fixedWidth: 180 },
]

type TableData = Partial<{
  service: Service
  serviceConfig: ServiceConfig
  spec: Spec
  viewSnapshotUrl: string
  builderId: string
  children: TableData[]
}>

type CreateSnapshotDetailsTableCellProps = {
  value: TableData
}

const CreateSnapshotDetailsTableCell: FC<CreateSnapshotDetailsTableCellProps> = memo<CreateSnapshotDetailsTableCellProps>(({
  value: {
    serviceConfig,
    builderId,
  },
}) => {
  const [publishDetails, isLoading] = useServicePublishDetails({ serviceConfig, builderId })

  if (!serviceConfig) {
    return null
  }

  if (isLoading) {
    return (
      <StatusMarker value={LOADING_STATUS_MARKER_VARIANT}/>
    )
  }

  return (
    <Box display="flex" gap={1}>
      <StatusMarker value={PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP[publishDetails.status]}/>
      <Typography noWrap variant="inherit">{publishDetails.message}</Typography>
    </Box>
  )
})

const TableSkeleton: FC = memo(() => {
  return (
    <>
      <RowSkeleton/>
      <RowSkeleton/>
      <RowSkeleton/>
      <RowSkeleton/>
      <RowSkeleton/>
    </>
  )
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell/>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell/>
      <TableCell/>
      <TableCell/>
    </TableRow>
  )
})
