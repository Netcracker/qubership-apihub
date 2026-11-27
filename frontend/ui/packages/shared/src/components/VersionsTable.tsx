import type { PackageKind } from '../entities/packages'
import type { PackageVersion } from '../entities/versions'
import type { PackageVersionsSortBy } from '../types/sorting'
import { SORT_BY_CREATED_AT } from '../types/sorting'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnModel } from '../hooks/table-resizing/useColumnResizing'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '../hooks/table-resizing/useColumnResizing'
import type {
  ColumnSizingInfoState,
  ColumnSizingState,
  ExpandedState,
  OnChangeFn,
  VisibilityState,
} from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { useResizeObserver } from '../hooks/common/useResizeObserver'
import type { ColumnDef } from '@tanstack/table-core'
import { CustomTableHeadCell } from './CustomTableHeadCell'
import { VersionErrorIndicator } from './ErrorIndicators/VersionErrorIndicator'
import { getSplittedVersionKey } from '../utils/versions'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'
import { FormattedDate } from './FormattedDate'
import { OverflowTooltip } from './OverflowTooltip'
import { Box, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { CustomChip } from './CustomChip'
import { ColumnDelimiter } from './ColumnDelimiter'
import { createComponents } from '../utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '../utils/constants'

const LAST_REVISION_DATE_COLUMN_TITLE = 'Last Revision Date'
const FIRST_PUBLICATION_DATE_COLUMN_TITLE = 'First Publication Date'

type VersionsTableProps = {
  value: ReadonlyArray<PackageVersion>
  onClickVersion: (version: PackageVersion | undefined) => void
  isLoading: boolean
  sortBy: PackageVersionsSortBy
  kind?: PackageKind
}

export const VersionsTable: FC<VersionsTableProps> = memo<VersionsTableProps>(({
  value,
  onClickVersion,
  isLoading,
  sortBy,
  kind,
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
    defaultMinColumnSize: 60,
  })

  const isLastRevisionDateSort = sortBy === SORT_BY_CREATED_AT
  const columns: ColumnDef<TableData>[] = useMemo(() => [
    {
      id: VERSION_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Version" />,
      cell: ({ row: { original: { version } } }) => {
        const { versionKey } = getSplittedVersionKey(version?.key)
        return (
          <Box display="flex" alignItems="center" gap={1} overflow="hidden">
            <TextWithOverflowTooltip tooltipText={versionKey} sx={{ minWidth: 0, flexShrink: 1 }}>
              <Link>{versionKey}</Link>
            </TextWithOverflowTooltip>
            <VersionErrorIndicator
              kind={kind}
              versionKey={versionKey}
              hasErrors={version?.hasErrors}
              changelogHasErrors={version?.changelogHasErrors}
              apiProcessorVersion={version?.apiProcessorVersion}
              fontSize='extra-small'
            />
          </Box>
        )
      },
    },
    {
      id: PUBLICATION_DATE_COLUMN_ID,
      header: () => (
        <CustomTableHeadCell
          title={isLastRevisionDateSort ? LAST_REVISION_DATE_COLUMN_TITLE : FIRST_PUBLICATION_DATE_COLUMN_TITLE}
        />
      ),
      cell: ({ row: { original: { version } } }) => (
        <FormattedDate value={isLastRevisionDateSort ? version?.createdAt : version?.firstPublishedAt} />
      ),
    },
    {
      id: LABELS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Labels" />,
      cell: ({ row: { original: { version } } }) => {
        const versionLabels = version?.versionLabels
        return (
          <OverflowTooltip
            title={versionLabels?.map((label => <Box key={`${version?.key}-${label}-tooltip`}>{label}</Box>))}
          >
            <Box sx={{ display: 'flex' }}>
              {versionLabels?.map(label =>
                <CustomChip
                  key={`${version?.key}-${label}-chip`}
                  sx={{ mr: 1 }}
                  value={label}
                  label={
                    <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </Box>
                  }
                />,
              )}
            </Box>
          </OverflowTooltip>
        )
      },
    },
  ], [isLastRevisionDateSort, kind])

  const data: TableData[] = useMemo(() => value.map(version => ({
    version: version,
  })), [value])

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    state: { expanded, columnVisibility },
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

  return (
    <TableContainer ref={tableContainerRef} sx={{ mt: 1 }}>
      <Table>
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
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.column.id}
                  onClick={() => onClickVersion(cell.row?.original?.version)}
                  data-testid={`Cell-${cell.column.id}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {isLoading && <TableSkeleton />}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

const VERSION_COLUMN_ID = 'version'
const PUBLICATION_DATE_COLUMN_ID = 'publication-date'
const LABELS_COLUMN_ID = 'labels'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: VERSION_COLUMN_ID, width: 200 },
  { name: PUBLICATION_DATE_COLUMN_ID, fixedWidth: 136 },
  { name: LABELS_COLUMN_ID },
]

type TableData = Partial<{
  version: PackageVersion
}>

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="rectangular" width='80%' />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width='80%' />
      </TableCell>
      <TableCell>
        <Skeleton variant="rectangular" width='80%' />
      </TableCell>
    </TableRow>
  )
})
