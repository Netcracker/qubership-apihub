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
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import {
  Box,
  MenuItem,
  Skeleton,
  type SxProps,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import type { ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'
import { ColumnDelimiter } from './ColumnDelimiter'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from './Placeholder'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '../utils/aliases'
import type { ColumnModel } from '../hooks/table-resizing/useColumnResizing'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '../hooks/table-resizing/useColumnResizing'
import { useIntersectionObserver } from '../hooks/common/useIntersectionObserver'
import { InfoIcon } from '../icons/InfoIcon'
import { isEmpty } from '../utils/arrays'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '../utils/constants'
import { createComponents } from '../utils/components'
import { DownloadIcon } from '../icons/DownloadIcon'
import { MenuButton } from './Buttons/MenuButton'
import { ButtonWithHint } from './Buttons/ButtonWithHint'
import { useResizeObserver } from '../hooks/common/useResizeObserver'
import { FormattedDate } from './FormattedDate'
import type { Principal } from '../entities/principals'
import { PrincipalView } from './PrincipalView'

export type ReportDownloadOption = {
  value: DownloadType
  text: string
}

export type SecurityReportsTableProps = {
  data: SecurityReports
  downloadOptions?: ReportDownloadOption[]
  downloadSecurityReport: (processKey: string, value?: DownloadType) => void
  fetchNextPage: () => Promise<number>
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
  isLoading: IsLoading
}

// First Order Component //
export const SecurityReportsTable: FC<SecurityReportsTableProps> = memo(({
  data,
  downloadOptions,
  downloadSecurityReport,
  fetchNextPage,
  isFetchingNextPage,
  hasNextPage,
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
    defaultMinColumnSize: 150,
  })

  const ref = useRef<HTMLTableRowElement>(null)
  useIntersectionObserver(ref, isFetchingNextPage, hasNextPage, fetchNextPage)

  const columns: ColumnDef<SecurityReport>[] = useMemo(() => {
      return [
        {
          id: DATE_COLUMN_ID,
          header: 'Date',
          cell: ({ row: { original: { createdAt } } }) => (
            <FormattedDate value={createdAt}/>
          ),
        },
        {
          id: CREATED_BY_COLUMN_ID,
          header: 'Created By',
          cell: ({ row: { original: { createdBy } } }) => (
            <PrincipalView value={createdBy}/>
          ),
        },
        {
          id: STATUS_COLUMN_ID,
          header: 'Status',
          cell: ({ row: { original: { status, details } } }) => (
            <Box display="flex">
              <Typography fontSize="13px">{status}</Typography>
              {status !== RUNNING_SECURITY_REPORT_STATUS && details && (
                <Tooltip title={details}>
                  <Box display="flex" alignItems="center" ml={0.5}>
                    <InfoIcon/>
                  </Box>
                </Tooltip>
              )}
            </Box>
          ),
        },
        {
          id: TOTAL_NUMBER_OF_SERVICES_COLUMN_ID,
          header: 'Total Number of Services',
          cell: ({ row: { original: { servicesTotal } } }) => (
            <TextWithOverflowTooltip tooltipText={servicesTotal}>
              <Typography variant="inherit">{servicesTotal}</Typography>
            </TextWithOverflowTooltip>
          ),
        },
        {
          id: NUMBER_OF_PROCESSED_SERVICES_COLUMN_ID,
          header: 'Number of Processed Services',
          cell: ({ row: { original: { servicesProcessed } } }) => (
            <TextWithOverflowTooltip tooltipText={servicesProcessed}>
              <Typography variant="inherit">{servicesProcessed}</Typography>
            </TextWithOverflowTooltip>
          ),
        },
        {
          id: ACTIONS_COLUMN_ID,
          header: '',
          cell: ({ row: { original: { processId } } }) => (
            <DownloadButton
              processId={processId}
              onDownloadReport={downloadSecurityReport}
              downloadOptions={downloadOptions}
            />
          ),
        },
      ]
    },
    [downloadOptions, downloadSecurityReport],
  )

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })

  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <TableContainer ref={tableContainerRef}>
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
            <TableRow>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.column.id} data-testid={`Cell-${cell.column.id}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {isLoading && <TableSkeleton/>}
          <TableRow>
            {hasNextPage && columns.map(cell =>
              <TableCell ref={ref} key={cell.id}>
                <Skeleton variant="text"/>
              </TableCell>,
            )}
          </TableRow>
        </TableBody>
      </Table>
      {isEmpty(data) && !isLoading
        ? (
          <Placeholder
            sx={{ width: 'inherit' }}
            invisible={isLoading}
            area={CONTENT_PLACEHOLDER_AREA}
            message="No reports"
            testId="NoReportsPlaceholder"
          />
        ) : null
      }
    </TableContainer>
  )
})

const DATE_COLUMN_ID = 'date'
const CREATED_BY_COLUMN_ID = 'created-by'
const STATUS_COLUMN_ID = 'status'
const TOTAL_NUMBER_OF_SERVICES_COLUMN_ID = 'total-number-of-services'
const NUMBER_OF_PROCESSED_SERVICES_COLUMN_ID = 'number-of-processed-services'
const ACTIONS_COLUMN_ID = 'actions'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: DATE_COLUMN_ID, width: 181 },
  { name: CREATED_BY_COLUMN_ID, width: 415 },
  { name: STATUS_COLUMN_ID, width: 169 },
  { name: TOTAL_NUMBER_OF_SERVICES_COLUMN_ID, width: 195 },
  { name: NUMBER_OF_PROCESSED_SERVICES_COLUMN_ID, width: 195 },
  { name: ACTIONS_COLUMN_ID, width: 43 },
]

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="rectangular" width={'70%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'35%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'50%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'20%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'20%'}/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width={'50%'}/>
      </TableCell>
    </TableRow>
  )
})

export type SecurityReport = {
  processId: string
  createdAt: string
  createdBy: Principal
  status: SecurityReportStatus
  details?: string
  servicesProcessed: number
  servicesTotal: number
}

export type SecurityReports = SecurityReport[]

export const RUNNING_SECURITY_REPORT_STATUS = 'running'
export const ERROR_SECURITY_REPORT_STATUS = 'error'
export const COMPLETE_SECURITY_REPORT_STATUS = 'complete'

export type SecurityReportStatus =
  | typeof RUNNING_SECURITY_REPORT_STATUS
  | typeof ERROR_SECURITY_REPORT_STATUS
  | typeof COMPLETE_SECURITY_REPORT_STATUS

export const DOWNLOAD_REPORT = 'download-report'
export const DOWNLOAD_SOURCES = 'download-sources'

export type DownloadType = typeof DOWNLOAD_REPORT | typeof DOWNLOAD_SOURCES

type DownloadOptionsProps = {
  options: ReportDownloadOption[]
  onClick: (value: DownloadType) => void
  sx?: SxProps
  className?: string
}

type DownloadButtonProps = {
  processId: string
  onDownloadReport: (processId: string, type?: DownloadType) => void
  downloadOptions?: ReportDownloadOption[]
}

const DownloadButton: FC<DownloadButtonProps> = memo<DownloadButtonProps>(({
  processId,
  onDownloadReport,
  downloadOptions,
}) => {
  const onDownloadOption = useCallback(
    (type: DownloadType) => onDownloadReport(processId, type),
    [onDownloadReport, processId],
  )

  const onButtonCLick = useCallback(
    () => onDownloadReport(processId),
    [onDownloadReport, processId],
  )

  return downloadOptions
    ? (<DownloadOptions
      sx={{ visibility: 'hidden' }}
      className="hoverable"
      options={downloadOptions}
      onClick={onDownloadOption}
    />)
    : (<ButtonWithHint
      area-label="edit"
      hint="Download report"
      size="small"
      sx={{ visibility: 'hidden', height: '20px' }}
      className="hoverable"
      startIcon={<DownloadIcon color="#626D82"/>}
      onClick={onButtonCLick}
      testId="DownloadReportButton"
    />)
})

const DownloadOptions: FC<DownloadOptionsProps> = memo<DownloadOptionsProps>(({ options, onClick, sx, className }) => {
  return (
    <Tooltip title="Download">
      <Box sx={{ display: 'inline' }}>
        <MenuButton
          sx={sx}
          icon={<DownloadIcon color="#626D82"/>}
          alignItems="center"
          className={className}
          data-testid="DownloadMenuButton"
        >
          {options.map(({ value, text }) => (
            <MenuItem
              key={`download-option-${value}`}
              value={value}
              onClick={() => onClick(value)}
              data-testid={`Option-${value}`}
            >
              {text}
            </MenuItem>
          ))}
        </MenuButton>
      </Box>
    </Tooltip>
  )
})
