import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { TableCellSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/TableCellSkeleton'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { DEFAULT_CONTAINER_WIDTH, useColumnsSizing } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import type { DeletePersonalAccessTokenCallback, PersonalAccessToken, PersonalAccessTokens } from '@netcracker/qubership-apihub-ui-shared/types/tokens'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import type { ColumnDef, ColumnSizingInfoState, ColumnSizingState, OnChangeFn } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'

const NAME_COLUMN_ID = 'name'
const EXPIRATION_DATE_COLUMN_ID = 'expiration'
const STATUS_COLUMN_ID = 'staus'
const CREATED_AT_COLUMN_ID = 'created-at'
const DELETE_COLUMN_ID = 'delete'

const COLUMNS_MODELS: ColumnModel[] = [
  { name: NAME_COLUMN_ID, width: 300 },
  { name: EXPIRATION_DATE_COLUMN_ID, width: 120 },
  { name: STATUS_COLUMN_ID, width: 75 },
  { name: CREATED_AT_COLUMN_ID, width: 120 },
  { name: DELETE_COLUMN_ID, width: 45 },
]

const DEFAULT_EXPIRATION_DATE = '0001-01-01T00:00:00Z'

const TableSkeleton: FC = memo(() => {
  return createComponents(<RowSkeleton />, DEFAULT_NUMBER_SKELETON_ROWS)
})

const RowSkeleton: FC = memo(() => {
  return (
    <TableRow>
      <TableCellSkeleton />
      <TableCellSkeleton />
      <TableCellSkeleton />
      <TableCellSkeleton />
      <TableCell />
    </TableRow>
  )
})

export type TokensTableTableProps = {
  data: PersonalAccessTokens
  onDelete: DeletePersonalAccessTokenCallback
  loading: IsLoading
  disableDelete?: boolean
}

export const PersonalAccessTokensTable: FC<TokensTableTableProps> = memo(props => {
  const {
    data,
    onDelete: onDeletePersonalAccessToken,
    loading,
    disableDelete,
  } = props

  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: COLUMNS_MODELS,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 45,
  })

  const columns: ColumnDef<PersonalAccessToken>[] = useMemo(() => {
    return [
      {
        id: NAME_COLUMN_ID,
        header: 'Name',
        cell: ({ row: { original: { name } } }) => (
          <TextWithOverflowTooltip tooltipText={name}>
            <Typography variant="inherit">{name}</Typography>
          </TextWithOverflowTooltip>
        ),
      },
      {
        id: EXPIRATION_DATE_COLUMN_ID,
        header: 'Expiration Date',
        cell: ({ row: { original: { expiresAt } } }) => (
          <>
            {expiresAt !== DEFAULT_EXPIRATION_DATE
              ? <FormattedDate value={expiresAt} />
              : <>No expiration date</>}
          </>
        ),
      },
      {
        id: STATUS_COLUMN_ID,
        header: 'Status',
        cell: ({ row: { original: { status } } }) => (
          <CustomChip value={status} label={status} />
        ),
      },
      {
        id: CREATED_AT_COLUMN_ID,
        header: 'Created At',
        cell: ({ row: { original: { createdAt } } }) => (
          <FormattedDate value={createdAt} />
        ),
      },
      {
        id: DELETE_COLUMN_ID,
        header: '',
        cell: ({ row: { original: { id } } }) => (
          <ButtonWithHint
            area-label="delete"
            disabled={disableDelete}
            disableHint={false}
            hint={disableDelete ? 'Deleting is going now, please wait' : 'Delete'}
            size="small"
            sx={{ visibility: 'hidden', height: '20px' }}
            className="hoverable"
            startIcon={<DeleteIcon color={'#626D82'} />}
            onClick={() => onDeletePersonalAccessToken(id)}
            testId="DeleteButton"
          />
        ),
      },
    ]
  },
    [onDeletePersonalAccessToken, disableDelete],
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

  useEffect(
    () => setColumnSizing(actualColumnSizing),
    [setColumnSizing, actualColumnSizing],
  )

  return (
    <TableContainer sx={{ mt: 1 }} ref={tableContainerRef}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell
                  key={header.id}
                  align="left"
                  width={actualColumnSizing ? actualColumnSizing[header.id] : header.getSize()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.column.id} data-testid={`Cell-${cell.column.id}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {loading && <TableSkeleton />}
        </TableBody>
      </Table>
      {isEmpty(data) && !loading
        ? (
          <Placeholder
            sx={{ width: 'inherit' }}
            invisible={loading}
            area={CONTENT_PLACEHOLDER_AREA}
            message="No personal access tokens"
          />
        )
        : null
      }
    </TableContainer>
  )
})
