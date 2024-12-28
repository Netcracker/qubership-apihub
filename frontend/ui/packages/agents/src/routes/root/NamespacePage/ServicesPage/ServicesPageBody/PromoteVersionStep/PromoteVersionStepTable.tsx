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
import { ServiceOrDocumentationTableCell } from '../ServiceOrDocumentationTableCell'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
import { PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP } from '../../../constants'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'
import { useServicePromoteDetails } from './useServicePromoteDetails'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import { useConfigureServiceSelection } from '../useConfigureServiceSelection'
import { ServiceLabelsTableCell } from '../ServiceLabelsTableCell'
import { usePromoteVersionStepStatus } from './usePromoteVersionStepStatus'
import { BwcStatusTableCell } from '../BwcStatusTableCell'
import { serviceFilter } from '../utils'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { usePromoteVersionPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { SUCCESS_STEP_STATUS } from '../../ServicesPageProvider/ServicesStepsProvider'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { ServiceConfig } from '@apihub/entities/publish-config'
import { LOADING_STATUS_MARKER_VARIANT, StatusMarker } from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'

export type PromoteVersionStepTableProps = {
  services: ReadonlyArray<Service>
  promoteStatus: VersionStatus
  selectable?: boolean
  selected?: ServiceKey[]
  onSelect?: (value: ServiceKey[]) => void
  searchValue: string
  filter: (service: Service) => boolean
  isServicesLoading: boolean
}

export const PromoteVersionStepTable: FC<PromoteVersionStepTableProps> = memo<PromoteVersionStepTableProps>((
  {
    services,
    promoteStatus,
    selectable = true,
    selected = [],
    onSelect = () => {/*do nothing*/},
    searchValue,
    filter,
    isServicesLoading,
  },
) => {
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

  const {
    snapshotPublicationInfo,
    isSuccess: isSnapshotPublicationInfoSuccess,
  } = useSnapshotPublicationInfo({ promote: true })
  const { promotePublicationOptions: { config } } = usePromoteVersionPublicationOptions()
  const stepStatus = usePromoteVersionStepStatus()

  const availableVersionStatusFilter = useCallback(
    (service?: Service) => !!service?.availablePromoteStatuses?.includes(promoteStatus),
    [promoteStatus],
  )

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
      cell: ({ row: { depth, getIsSelected, getIsSomeSelected, getToggleSelectedHandler, original: { service } } }) => {
        if (depth === 0) {
          return (
            <Checkbox
              sx={{ py: 0 }}
              disabled={!selectable || !availableVersionStatusFilter(service)}
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
      cell: ({ row }) => <ServiceOrDocumentationTableCell value={row} isPromoteStep={true}
                                                          promoteStatus={promoteStatus}/>,
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
      cell: ({ row: { original: { service, changeSummary } } }) => {
        if (service && changeSummary) {
          return (
            <Changes mode="compact" value={changeSummary}/>
          )
        }

        return null
      },
    },
    {
      id: PUBLISH_STATUS_COLUMN_ID,
      header: 'Publish Status',
      cell: ({ row: { original, getIsSelected } }) => getIsSelected() &&
        <PromoteVersionDetailsTableCell value={original}/>,
    },
    {
      id: VIEW_BASELINE_URL_COLUMN_ID,
      cell: isSnapshotPublicationInfoSuccess ? ({ row: { original: { service, viewBaselineUrl, serviceConfig } } }) => {
        if (service && serviceConfig?.apihubPackageUrl) {
          return (
            <Button
              data-testid="PromotedVersionButton"
              sx={{ visibility: 'hidden', p: 0, height: 10, whiteSpace: 'nowrap' }}
              className="hoverable"
              component="a"
              variant="text"
              href={stepStatus === SUCCESS_STEP_STATUS ? serviceConfig.apihubPackageUrl : viewBaselineUrl}
              target="_blank"
              startIcon={<ArrowOutwardRoundedIcon/>}
            >
              View Version
            </Button>
          )
        }

        return null
      } : undefined,
    },
  ], [availableVersionStatusFilter, isSnapshotPublicationInfoSuccess, stepStatus, promoteStatus, selectable])

  const data: TableData[] = useMemo(() => services.filter(service => !!snapshotPublicationInfo.services.find(({ key }) => key === service.key && !!service.baseline)).map(service => {
    const {
      changeSummary,
      viewBaselineUrl,
      baselineFound,
      baselineVersionFound,
    } = snapshotPublicationInfo.services.find(({ key }) => key === service.key)!
    return ({
      service: service,
      serviceConfig: config?.serviceConfigs.find(({ serviceId }) => serviceId === service.key),
      bwcErrors: (baselineFound && baselineVersionFound) ? changeSummary?.breaking : undefined,
      changeSummary: changeSummary,
      children: service.specs?.map(spec => ({ spec })),
      viewBaselineUrl: viewBaselineUrl,
      baselineFound: baselineFound,
      baselineVersionFound: baselineVersionFound,
      builderId: config?.builderId,
    })
  }), [config?.builderId, config?.serviceConfigs, snapshotPublicationInfo.services, services])

  const globalFilter = useMemo(() => ({
    searchValue,
    filter,
  }), [searchValue, filter])

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, getSelectedRowModel, setColumnSizing } = useReactTable({
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
    enableRowSelection: row => availableVersionStatusFilter(row.original.service),
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
    availableVersionStatusFilter,
  )

  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <TableContainer sx={{ mt: 1, pb: 10 }} ref={tableContainerRef}>
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
                  align={cell.column.id === VIEW_BASELINE_URL_COLUMN_ID ? 'right' : 'left'}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {(isServicesLoading || isEmpty(data)) && <TableSkeleton/>}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

const SELECTION_COLUMN_ID = 'selection'
const SERVICE_OR_DOCUMENTATION_COLUMN_ID = 'service-or-documentation'
const SERVICE_LABELS_COLUMN_ID = 'service-labels'
const BASELINE_PACKAGE_COLUMN_ID = 'baseline-package'
const BWC_STATUS_COLUMN_ID = 'bwc-status'
const CHANGES_COLUMN_ID = 'changes'
const PUBLISH_STATUS_COLUMN_ID = 'publish-status'
const VIEW_BASELINE_URL_COLUMN_ID = 'view-baseline-url'
const COLUMNS_MODELS: ColumnModel[] = [
  { name: SELECTION_COLUMN_ID, fixedWidth: 60 },
  { name: SERVICE_OR_DOCUMENTATION_COLUMN_ID },
  { name: SERVICE_LABELS_COLUMN_ID },
  { name: BASELINE_PACKAGE_COLUMN_ID },
  { name: BWC_STATUS_COLUMN_ID },
  { name: CHANGES_COLUMN_ID },
  { name: PUBLISH_STATUS_COLUMN_ID },
  { name: VIEW_BASELINE_URL_COLUMN_ID },
]

type TableData = Partial<{
  service: Service
  serviceConfig: ServiceConfig
  spec: Spec
  bwcErrors: number
  changeSummary: ChangesSummary
  viewBaselineUrl: string
  children: TableData[]
  baselineFound: boolean
  baselineVersionFound: boolean
  builderId?: string
}>

type PromoteVersionDetailsTableCellProps = {
  value: TableData
}

const PromoteVersionDetailsTableCell: FC<PromoteVersionDetailsTableCellProps> = memo<PromoteVersionDetailsTableCellProps>(({
  value: {
    serviceConfig,
    builderId,
  },
}) => {
  const [promoteDetails, isLoading] = useServicePromoteDetails({ serviceConfig, builderId })

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
      <StatusMarker value={PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP[promoteDetails.status]}/>
      <Typography noWrap variant="inherit">{promoteDetails.message}</Typography>
    </Box>
  )
})

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS)
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
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'80%'}/>
      </TableCell>
      <TableCell/>
      <TableCell/>
    </TableRow>
  )
})
