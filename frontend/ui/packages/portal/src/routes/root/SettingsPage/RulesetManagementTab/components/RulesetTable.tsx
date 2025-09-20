import { Box, capitalize, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { type Ruleset, RulesetStatuses } from '@netcracker/qubership-apihub-ui-portal/src/entities/api-quality/rulesets'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { TableCellSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/TableCellSkeleton'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import {
  type ColumnModel,
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import {
  type ColumnSizingInfoState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  type OnChangeFn,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/table-core'
import { isEmpty } from 'lodash'
import { type FC, Fragment, memo, useEffect, useRef, useState } from 'react'
import { ActivationHistoryContent } from './ActivationHistoryContent'
import { RulesetActions } from './RulesetActions'

const RULESET_NAME_COLUMN_ID = 'ruleset-name'
const ACTIVATION_HISTORY_COLUMN_ID = 'activation-history'
const STATUS_COLUMN_ID = 'status'
const CREATED_AT_COLUMN_ID = 'created-at'
const CONTROLS_COLUMN_ID = 'controls'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: RULESET_NAME_COLUMN_ID },
  { name: ACTIVATION_HISTORY_COLUMN_ID, fixedWidth: 224 },
  { name: STATUS_COLUMN_ID, fixedWidth: 116 },
  { name: CREATED_AT_COLUMN_ID, fixedWidth: 132 },
  { name: CONTROLS_COLUMN_ID, fixedWidth: 168 },
]

const STYLE_TABLE_CONTAINER = {
  mt: 1,
  maxHeight: 'calc(100vh - 260px)',
} as const

type RulesetTableProps = {
  rulesets: Ruleset[]
  isLoading: boolean
}

const COLUMNS: ColumnDef<Ruleset>[] = [
  {
    id: RULESET_NAME_COLUMN_ID,
    header: () => <CustomTableHeadCell title="Ruleset Name" />,
    cell: ({ row: { original: { name } } }) => (
      <Box display="flex" alignItems="center">
        <TextWithOverflowTooltip tooltipText={name}>
          {name}
        </TextWithOverflowTooltip>
      </Box>
    ),
  },
  {
    id: ACTIVATION_HISTORY_COLUMN_ID,
    header: () => <CustomTableHeadCell title="Activation History" />,
    cell: ({ row: { original: ruleset } }) => <ActivationHistoryContent ruleset={ruleset} />,
  },
  {
    id: STATUS_COLUMN_ID,
    header: () => <CustomTableHeadCell title="Status" />,
    cell: ({ row: { original: { status } } }) => (
      <Chip
        label={capitalize(status)}
        size="small"
        color={status === RulesetStatuses.ACTIVE ? 'release' : 'default'}
        sx={{ fontWeight: 500 }}
      />
    ),
  },
  {
    id: CREATED_AT_COLUMN_ID,
    header: () => <CustomTableHeadCell title="Created At" />,
    cell: ({ row: { original: { createdAt } } }) => <FormattedDate value={createdAt} />,
  },
  {
    id: CONTROLS_COLUMN_ID,
    header: () => '',
    cell: ({ row: { original: ruleset } }) => <RulesetActions ruleset={ruleset} />,
  },
]

export const RulesetTable: FC<RulesetTableProps> = memo<RulesetTableProps>(({
  rulesets,
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
    defaultMinColumnSize: 60,
  })

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: rulesets,
    columns: COLUMNS,
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

  if (isEmpty(rulesets) && !isLoading) {
    return (
      <Placeholder
        sx={{ width: 'inherit' }}
        invisible={isLoading}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No Rulesets"
      />
    )
  }

  return (
    <TableContainer
      ref={tableContainerRef}
      sx={STYLE_TABLE_CONTAINER}
    >
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((headerColumn) => (
                <TableCell
                  key={headerColumn.id}
                  align="left"
                  width={actualColumnSizing ? actualColumnSizing[headerColumn.id] : headerColumn.getSize()}
                >
                  {flexRender(headerColumn.column.columnDef.header, headerColumn.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <TableRow>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            </Fragment>
          ))}
          {isLoading && <TableSkeleton />}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      {Array.from({ length: COLUMNS_MODELS.length }, (_, index) => <TableCellSkeleton key={index} />)}
    </TableRow>
  )
})

RulesetTable.displayName = 'RulesetTable'
