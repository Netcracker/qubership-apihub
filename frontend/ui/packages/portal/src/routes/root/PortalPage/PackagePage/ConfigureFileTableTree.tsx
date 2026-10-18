import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import {
  Box,
  IconButton,
  Skeleton,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import type {
  ColumnSizingInfoState,
  ColumnSizingState,
  ExpandedState,
  OnChangeFn,
  VisibilityState,
} from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/table-core'
import { type FC, Fragment, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { FileCellContent } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileCellContent'
import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { LabelsTableCell } from '@netcracker/qubership-apihub-ui-shared/components/LabelsTableCell'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import {
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { McpEndpointIcon } from '@netcracker/qubership-apihub-ui-shared/icons/McpEndpointIcon'
import { ErrorIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ErrorIcon'
import { WarningIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIconMui'
import { isNotEmptyRecord } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import type { McpEndpointValidation } from '@apihub/routes/root/PortalPage/PackagePage/mcpValidation'
import { useMcpPublishValidation } from '@apihub/routes/root/PortalPage/PackagePage/useMcpPublishValidation'

import { groupMcpFilesByEndpoint, type McpStagedFileMeta } from '@apihub/routes/root/PortalPage/PackagePage/mcpPublish'
import { McpEndpointActions } from '@apihub/routes/root/PortalPage/PackagePage/McpEndpointActions'

const FILE_COLUMN_ID = 'file-column'
const LABELS_COLUMN_ID = 'labels-column'
const ACTIONS_COLUMN_ID = 'actions-column'

const MCP_TREE_TOGGLE_COLUMN_WIDTH = '20px'
const MCP_TREE_ICON_TEXT_GAP = '4px'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: FILE_COLUMN_ID, width: 300 },
  { name: LABELS_COLUMN_ID },
  { name: ACTIONS_COLUMN_ID, fixedWidth: 90 },
]

const defaultMinWidth = COLUMNS_MODELS.reduce(
  (sum, { width, fixedWidth }) => sum + (width || fixedWidth || 0),
  0,
)

type ConfigureFileTableTreeProps = Readonly<{
  filesMap: FileLabelsRecord
  // Unfiltered record for MCP validation; filesMap may be search-filtered for display only.
  filesWithLabels: FileLabelsRecord
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>
  mcpEndpoints: ReadonlyArray<string>
  showPlaceholder?: boolean
  isLoading: boolean
  getFileClickHandler: (file: File) => ((file: File) => void) | null
  getFileActions: (file: File) => ReactNode
  getFileLeftIcon: (file: File) => ReactNode
  getFileRightIcon: (file: File) => ReactNode
}>

export const ConfigureFileTableTree: FC<ConfigureFileTableTreeProps> = memo(props => {
  const {
    filesMap,
    filesWithLabels,
    mcpStagedFileMetaByName,
    mcpEndpoints,
    showPlaceholder = false,
    isLoading,
    getFileActions,
    getFileLeftIcon,
    getFileRightIcon,
    getFileClickHandler,
  } = props

  const flatFilesMap = useMemo(
    () => splitNonMcpFiles(filesMap, mcpStagedFileMetaByName),
    [filesMap, mcpStagedFileMetaByName],
  )

  const { endpointValidations } = useMcpPublishValidation(mcpStagedFileMetaByName, filesWithLabels)

  const flatFileRows: ConfigureFileTableData[] = useMemo(() => (
    Object.entries(flatFilesMap).map(([key, { file, labels }], index) => ({
      fileKey: `${index}-${key}`,
      file: file,
      fileActions: getFileActions(file),
      labels: labels,
    }))
  ), [flatFilesMap, getFileActions])

  const endpointTreeData: McpEndpointTreeRow[] = useMemo(() => {
    return groupMcpFilesByEndpoint(mcpStagedFileMetaByName, mcpEndpoints)
      .map(({ mcpEndpoint, files }) => ({
        mcpEndpoint: mcpEndpoint,
        files: files
          .map(({ fileName }) => {
            const entry = filesMap[fileName]
            if (!entry) {
              return undefined
            }
            return {
              file: entry.file,
              labels: entry.labels,
              fileActions: getFileActions(entry.file),
            }
          })
          .filter((row): row is McpEndpointChildRow => row !== undefined),
      }))
      .filter(group => group.files.length > 0)
  }, [mcpStagedFileMetaByName, mcpEndpoints, filesMap, getFileActions])

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

  const renderFileCell = useCallback(
    ({ row: { original: { file, fileKey } } }: { row: { original: ConfigureFileTableData } }) => (
      <FileCellContent
        fileKey={fileKey}
        file={file}
        getFileClickHandler={getFileClickHandler}
        getFileLeftIcon={getFileLeftIcon}
        getFileRightIcon={getFileRightIcon}
      />
    ),
    [getFileClickHandler, getFileLeftIcon, getFileRightIcon],
  )

  const renderLabelsCell = useCallback(
    ({ row: { original: { labels } } }: { row: { original: ConfigureFileTableData } }) => (
      <LabelsTableCell labels={labels} />
    ),
    [],
  )

  const flatColumns: ColumnDef<ConfigureFileTableData>[] = useMemo(() => [
    {
      id: FILE_COLUMN_ID,
      header: () => <CustomTableHeadCell title="File" />,
      cell: renderFileCell,
    },
    {
      id: LABELS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Labels" />,
      cell: renderLabelsCell,
    },
    {
      id: ACTIONS_COLUMN_ID,
      cell: ({ row: { original: { fileActions } } }) => fileActions,
    },
  ], [renderFileCell, renderLabelsCell])

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups: getFlatHeaderGroups, getRowModel: getFlatRowModel, setColumnSizing } = useReactTable({
    data: flatFileRows,
    columns: flatColumns,
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

  const renderEndpointCell = useCallback(
    (
      { row }: {
        row: {
          getCanExpand: () => boolean
          getToggleExpandedHandler: () => () => void
          getIsExpanded: () => boolean
          original: McpEndpointTreeRow
        }
      },
    ) =>
      row.getCanExpand() && (
        <TreeRowLayout>
          <ExpandIconButton
            aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
            onClick={row.getToggleExpandedHandler()}
          >
            {row.getIsExpanded() ? <ExpandIcon /> : <CollapseIcon />}
          </ExpandIconButton>
          <TreeIconTextRow>
            <EndpointIcon />
            <TextWithOverflowTooltip tooltipText={`MCP Endpoint: ${row.original.mcpEndpoint}`}>
              {`MCP Endpoint: ${row.original.mcpEndpoint}`}
            </TextWithOverflowTooltip>
            <McpEndpointValidationMarkers
              endpointValidation={endpointValidations.get(row.original.mcpEndpoint)}
            />
          </TreeIconTextRow>
        </TreeRowLayout>
      ),
    [endpointValidations],
  )

  const renderEndpointActionsCell = useCallback(
    ({ row: { original: { mcpEndpoint } } }: { row: { original: McpEndpointTreeRow } }) => (
      <EndpointActionsCell>
        <McpEndpointActions
          mcpEndpoint={mcpEndpoint}
          knownEndpoints={mcpEndpoints}
        />
      </EndpointActionsCell>
    ),
    [mcpEndpoints],
  )

  const endpointColumns: ColumnDef<McpEndpointTreeRow>[] = useMemo(() => [
    {
      id: FILE_COLUMN_ID,
      header: () => <CustomTableHeadCell title="File" />,
      cell: renderEndpointCell,
    },
    {
      id: LABELS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Labels" />,
    },
    {
      id: ACTIONS_COLUMN_ID,
      cell: renderEndpointActionsCell,
    },
  ], [renderEndpointCell, renderEndpointActionsCell])

  const [expanded, setExpanded] = useState<ExpandedState>({})

  const {
    getRowModel: getEndpointRowModel,
    toggleAllRowsExpanded,
  } = useReactTable({
    data: endpointTreeData,
    columns: endpointColumns,
    state: { expanded },
    getRowCanExpand: () => true,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  useEffect(() => toggleAllRowsExpanded(true), [toggleAllRowsExpanded])

  const headerGroups = getFlatHeaderGroups()

  return (
    <TableContainer ref={tableContainerRef} sx={{ overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Table sx={{ minWidth: defaultMinWidth }}>
        <TableHead>
          {headerGroups.map(headerGroup => (
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
          {getEndpointRowModel().rows.map(row => (
            <Fragment key={row.id}>
              <TableRow>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {row.getIsExpanded() && (
                <McpEndpointChildRows
                  files={row.original.files}
                  actualColumnSizing={actualColumnSizing}
                  getFileClickHandler={getFileClickHandler}
                  getFileLeftIcon={getFileLeftIcon}
                  getFileRightIcon={getFileRightIcon}
                />
              )}
            </Fragment>
          ))}
          {getFlatRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {isLoading && <TableSkeleton />}
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
ConfigureFileTableTree.displayName = 'ConfigureFileTableTree'

type ConfigureFileTableData = Readonly<{
  fileKey: string
  file: File
  fileActions: ReactNode
  labels: string[]
}>

type McpEndpointChildRow = Readonly<{
  file: File
  labels: string[]
  fileActions: ReactNode
}>

type McpEndpointTreeRow = Readonly<{
  mcpEndpoint: string
  files: ReadonlyArray<McpEndpointChildRow>
}>

type McpEndpointChildRowsProps = Readonly<{
  files: ReadonlyArray<McpEndpointChildRow>
  actualColumnSizing: ColumnSizingState | undefined
  getFileClickHandler: (file: File) => ((file: File) => void) | null
  getFileLeftIcon: (file: File) => ReactNode
  getFileRightIcon: (file: File) => ReactNode
}>

const McpEndpointChildRows: FC<McpEndpointChildRowsProps> = memo(({
  files,
  actualColumnSizing,
  getFileClickHandler,
  getFileLeftIcon,
  getFileRightIcon,
}) => {
  return (
    <>
      {files.map(({ file, labels, fileActions }, index) => (
        <TableRow key={`${file.name}-${index}`}>
          <TableCell
            width={actualColumnSizing?.[FILE_COLUMN_ID]}
            data-testid={`Cell-${FILE_COLUMN_ID}`}
          >
            <TreeRowLayout>
              <TreeTogglePlaceholder />
              <FileCellContent
                fileKey={`mcp-${index}-${file.name}`}
                file={file}
                getFileClickHandler={getFileClickHandler}
                getFileLeftIcon={getFileLeftIcon}
                getFileRightIcon={getFileRightIcon}
              />
            </TreeRowLayout>
          </TableCell>
          <TableCell
            width={actualColumnSizing?.[LABELS_COLUMN_ID]}
            data-testid={`Cell-${LABELS_COLUMN_ID}`}
          >
            <LabelsTableCell labels={labels} />
          </TableCell>
          <TableCell
            width={actualColumnSizing?.[ACTIONS_COLUMN_ID]}
            data-testid={`Cell-${ACTIONS_COLUMN_ID}`}
          >
            {fileActions}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
})
McpEndpointChildRows.displayName = 'McpEndpointChildRows'

const TableSkeleton: FC = memo(() => {
  return createComponents(<FileRowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
})
TableSkeleton.displayName = 'TableSkeleton'

const FileRowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="rectangular" width="80%" />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width="80%" />
      </TableCell>
      <TableCell />
    </TableRow>
  )
})
FileRowSkeleton.displayName = 'FileRowSkeleton'

const ResizableHeadCell = styled(TableCell)(({ theme }) => ({
  '&:hover': {
    borderRight: `2px solid ${theme.palette.divider}`,
  },
}))

const TreeRowLayout = styled(Box)({
  display: 'grid',
  gridTemplateColumns: `${MCP_TREE_TOGGLE_COLUMN_WIDTH} minmax(0, 1fr)`,
  columnGap: '2px',
  alignItems: 'center',
})

const TreeTogglePlaceholder = styled(Box)({
  width: MCP_TREE_TOGGLE_COLUMN_WIDTH,
})

const TreeIconTextRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
  gap: MCP_TREE_ICON_TEXT_GAP,
})

const ExpandIconButton = styled(IconButton)({
  padding: 0,
})

const EndpointIcon = styled(McpEndpointIcon)(({ theme }) => ({
  fontSize: 20,
  color: theme.palette.text.secondary,
  flexShrink: 0,
}))

const ExpandIcon = styled(KeyboardArrowDownOutlinedIcon)({
  fontSize: '16px',
})

const CollapseIcon = styled(KeyboardArrowRightOutlinedIcon)({
  fontSize: '16px',
})

type McpEndpointValidationMarkersProps = Readonly<{
  endpointValidation: McpEndpointValidation | undefined
}>

const McpEndpointValidationMarkers: FC<McpEndpointValidationMarkersProps> = memo(({ endpointValidation }) => {
  if (!endpointValidation) {
    return null
  }

  return (
    <ValidationMarkersRow>
      {endpointValidation.error && (
        <Tooltip title={endpointValidation.error} placement="right">
          <ValidationMarkerBox data-testid="ErrorIcon">
            <ErrorIcon color="error" fontSize="extra-small" />
          </ValidationMarkerBox>
        </Tooltip>
      )}
      {endpointValidation.warning && !endpointValidation.error && (
        <Tooltip title={endpointValidation.warning} placement="right">
          <ValidationMarkerBox data-testid="YellowWarningIcon">
            <WarningIconMui color="warning" fontSize="extra-small" />
          </ValidationMarkerBox>
        </Tooltip>
      )}
    </ValidationMarkersRow>
  )
})

McpEndpointValidationMarkers.displayName = 'McpEndpointValidationMarkers'

const ValidationMarkersRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flexShrink: 0,
})

const ValidationMarkerBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
})

const EndpointActionsCell = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-end',
})

function splitNonMcpFiles(
  filesMap: FileLabelsRecord,
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
): FileLabelsRecord {
  const flatFilesMap: FileLabelsRecord = {}
  for (const [fileName, entry] of Object.entries(filesMap)) {
    if (!mcpStagedFileMetaByName.has(fileName)) {
      flatFilesMap[fileName] = entry
    }
  }
  return flatFilesMap
}
