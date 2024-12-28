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

import type { FC, ReactNode } from 'react'
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/table-core'
import type { ColumnSizingInfoState, ColumnSizingState, OnChangeFn, VisibilityState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { ColumnDelimiter } from '../ColumnDelimiter'
import { FileCellContent } from './FileCellContent'
import { CustomTableHeadCell } from '../CustomTableHeadCell'
import type { FileLabelsRecord } from './FileTableUpload'
import { LabelsTableCell } from '../LabelsTableCell'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '../Placeholder'
import type { ColumnModel } from '../../hooks/table-resizing/useColumnResizing'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '../../hooks/table-resizing/useColumnResizing'
import { useResizeObserver } from '../../hooks/common/useResizeObserver'
import { isNotEmptyRecord } from '../../utils/arrays'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '../../utils/constants'
import { createComponents } from '../../utils/components'

export type FileTableData = {
  file: File
  fileKey: string
  fileActions: ReactNode
  labels: string[]
}

const FILE_COLUMN_ID = 'file-column'
const LABELS_COLUMN_ID = 'labels-column'
const ACTIONS_COLUMN_ID = 'actions-column'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: FILE_COLUMN_ID, width: 300 },
  { name: LABELS_COLUMN_ID },
  { name: ACTIONS_COLUMN_ID, fixedWidth: 90 },
]

const defaultMinWidth = COLUMNS_MODELS.reduce(
  (sum, { width, fixedWidth }) => sum + (width || fixedWidth || 0), 0,
)

export type FileTableProps = {
  filesMap: FileLabelsRecord
  showPlaceholder?: boolean
  isLoading: boolean
  getFileClickHandler: (file: File) => ((file: File) => void) | null
  getFileActions: (file: File) => ReactNode
  getFileLeftIcon: (file: File) => ReactNode
  getFileRightIcon: (file: File) => ReactNode
}

export const FileTable: FC<FileTableProps> = memo<FileTableProps>(props => {
  const {
    filesMap,
    showPlaceholder = false,
    isLoading,
    getFileActions,
    getFileLeftIcon,
    getFileRightIcon,
    getFileClickHandler,
  } = props

  const columns: ColumnDef<FileTableData>[] = useMemo(() => {
    const result: ColumnDef<FileTableData>[] = [
      {
        id: FILE_COLUMN_ID,
        header: () => <CustomTableHeadCell title="File"/>,
        cell: ({ row: { original: { file, fileKey } } }) => (
          <FileCellContent
            fileKey={fileKey}
            file={file}
            getFileClickHandler={getFileClickHandler}
            getFileLeftIcon={getFileLeftIcon}
            getFileRightIcon={getFileRightIcon}
          />
        ),
      },
      {
        id: LABELS_COLUMN_ID,
        header: () => <CustomTableHeadCell title="Labels"/>,
        cell: ({ row: { original: { labels } } }) => <LabelsTableCell labels={labels}/>,
      },
      {
        id: ACTIONS_COLUMN_ID,
        cell: ({ row: { original: { fileActions } } }) => fileActions,
      },
    ]

    return result
  }, [getFileClickHandler, getFileLeftIcon, getFileRightIcon])

  const data: FileTableData[] = useMemo(() => (
    Object.entries(filesMap).map(([key, { file, labels }], index) => ({
      fileKey: `${index}-${key}`,
      file: file,
      fileActions: getFileActions(file),
      labels: labels,
    }))), [filesMap, getFileActions])

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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })

  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )

  return (
    <TableContainer ref={tableContainerRef} sx={{ overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Table sx={{ minWidth: defaultMinWidth }}>
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
                    <ColumnDelimiter header={headerColumn} resizable={true}/>}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <Fragment key={crypto.randomUUID()}>
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            </Fragment>
          ))}
          {isLoading && <TableSkeleton/>}
        </TableBody>
      </Table>
      {!isNotEmptyRecord(filesMap) && showPlaceholder && (
        <Placeholder
          sx={{ width: 'inherit', flexGrow: 1 }}
          invisible={!showPlaceholder}
          area={CONTENT_PLACEHOLDER_AREA}
          message="No files"
        />
      )}
    </TableContainer>
  )
})

const TableSkeleton: FC = memo(() => {
  return createComponents(<FileRowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS)
})

const FileRowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="rectangular" width="80%"/>
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width="80%"/>
      </TableCell>
      <TableCell/>
    </TableRow>
  )
})


