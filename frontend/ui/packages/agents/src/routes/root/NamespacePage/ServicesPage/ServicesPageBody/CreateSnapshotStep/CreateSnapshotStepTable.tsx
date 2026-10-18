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
  Checkbox,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { styled } from '@mui/material/styles'
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
import { useConfigureServiceSelection } from '../useConfigureServiceSelection'
import { ServiceLabelsTableCell } from '../ServiceLabelsTableCell'
import { serviceFilter } from '../utils'
import { useAllPublicationDetails } from '../useAllPublicationDetails'
import { PublishStatusTableCell } from '../PublishStatusTableCell'
import { PublicationActionTableCell } from '../PublicationActionTableCell'
import { useServices } from '../../../useServices'
import type { PackageKey, ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
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
import type { Service } from '@agents/entities/services'
import type { ServiceConfig } from '@agents/entities/publish-config'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import { COMPLETE_PUBLISH_STATUS, type PublishDetails } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
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
  const [allPublishDetails] = useAllPublicationDetails({ config })
  const columns: ColumnDef<TableData>[] = useMemo(() => [
    {
      // activates global filtering in react-table
      accessorFn: () => true,
      id: SELECTION_COLUMN_ID,
      header: ({ table: { getIsAllRowsSelected, getIsSomePageRowsSelected, getToggleAllRowsSelectedHandler } }) => (
        <CompactCheckbox
          disabled={!selectable}
          checked={getIsAllRowsSelected()}
          indeterminate={getIsSomePageRowsSelected() && !getIsAllRowsSelected()}
          onChange={getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row: { depth, getIsSelected, getIsSomeSelected, getToggleSelectedHandler } }) => {
        if (depth === 0) {
          return (
            <CompactCheckbox
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
      cell: ({
        row: {
          original: {
            serviceConfig,
            publishDetails = EMPTY_PUBLISH_DETAILS,
          },
        },
      }) => (
        <PublicationActionTableCell
          serviceConfig={serviceConfig}
          publishDetails={publishDetails}
          versionLinkLabel="View Snapshot"
          data-testid="ViewSnapshotButton"
        />
      ),
    },
  ], [selectable])

  const data: TableData[] = useMemo(() => services.map(service => {
    const serviceConfig = config?.serviceConfigs.find(({ serviceId }) => serviceId === service.key)
    const publishDetails = allPublishDetails.find(({ publishId }) => publishId === serviceConfig?.publishId) ??
      EMPTY_PUBLISH_DETAILS

    return ({
      service: service,
      serviceConfig: serviceConfig,
      publishDetails: publishDetails,
      children: service.specs?.map(spec => ({ spec })),
      builderId: config?.builderId,
      snapshotHasErrors: publishDetails.status === COMPLETE_PUBLISH_STATUS && (publishDetails.hasErrors ?? false),
      snapshotPackageKey: serviceConfig?.packageId,
    })
  }), [allPublishDetails, config?.builderId, config?.serviceConfigs, services])

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
      <StyledTableContainer ref={tableContainerRef}>
        <Table>
          <TableHead>
            {getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <HeadTableCell
                    data-testid={`HeadCell-${header.id}`}
                    key={header.id}
                    align="left"
                    width={actualColumnSizing ? actualColumnSizing[header.id] : header.getSize()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {index !== headerGroup.headers.length - 1 && <ColumnDelimiter header={header} resizable={true}/>}
                  </HeadTableCell>
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
      </StyledTableContainer>
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
  publishDetails: PublishDetails
  spec: Spec
  builderId: string
  children: TableData[]
  snapshotHasErrors: boolean
  snapshotPackageKey: PackageKey
}>

type CreateSnapshotDetailsTableCellProps = {
  value: TableData
}

const CreateSnapshotDetailsTableCell: FC<CreateSnapshotDetailsTableCellProps> = memo<CreateSnapshotDetailsTableCellProps>(({
  value: {
    serviceConfig,
    builderId,
    publishDetails = EMPTY_PUBLISH_DETAILS,
  },
}) => {
  // Starts the build in the browser; its outcome reaches the cell through the statuses poll of the table
  useServicePublishDetails({ serviceConfig, builderId })

  if (!serviceConfig) {
    return null
  }

  return <PublishStatusTableCell publishDetails={publishDetails} />
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

const CompactCheckbox = styled(Checkbox)({
  paddingTop: 0,
  paddingBottom: 0,
})

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(1),
  paddingBottom: theme.spacing(7),
}))

const HeadTableCell = styled(TableCell)({
  '&:hover': {
    borderRight: '2px solid rgba(224, 224, 224, 1)',
  },
})
