import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import type {
  VersionNotification,
  VersionNotifications,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-notifications'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import type { FetchNextNotificationsPage } from '@netcracker/qubership-apihub-ui-shared/hooks/notifications/notificationsQuery'
import type { HasNextPage, IsFetchingNextPage } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { toFirstLine } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import type { ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { type FC, memo, useMemo, useRef } from 'react'

import { NotificationSeverityMarker } from './NotificationSeverityMarker'

const TABLE_COLUMN_ID_TYPE = 'type'
const TABLE_COLUMN_ID_CATEGORY = 'category'
const TABLE_COLUMN_ID_MESSAGE = 'message'

const TABLE_COLUMN_ID_LABELS = {
  [TABLE_COLUMN_ID_TYPE]: 'Type',
  [TABLE_COLUMN_ID_CATEGORY]: 'Category',
  [TABLE_COLUMN_ID_MESSAGE]: 'Message',
}

type TableColumnLayoutConfig = {
  width: string
  maxWidth?: number
}

const TABLE_COLUMNS_LAYOUT_CONFIG: Record<string, TableColumnLayoutConfig> = {
  [TABLE_COLUMN_ID_TYPE]: {
    width: '64px',
  },
  [TABLE_COLUMN_ID_CATEGORY]: {
    width: '200px',
  },
  [TABLE_COLUMN_ID_MESSAGE]: {
    width: 'auto',
    maxWidth: 0,
  },
}

const COLUMNS: ColumnDef<VersionNotification>[] = [
  {
    id: TABLE_COLUMN_ID_TYPE,
    header: () => <CustomTableHeadCell title={TABLE_COLUMN_ID_LABELS[TABLE_COLUMN_ID_TYPE]} />,
    cell: ({ row: { original: { severity } } }) => <NotificationSeverityMarker severity={severity} />,
  },
  {
    id: TABLE_COLUMN_ID_CATEGORY,
    header: () => <CustomTableHeadCell title={TABLE_COLUMN_ID_LABELS[TABLE_COLUMN_ID_CATEGORY]} />,
    cell: ({ row: { original: { category } } }) => (
      <Typography variant="body2">
        {category}
      </Typography>
    ),
  },
  {
    id: TABLE_COLUMN_ID_MESSAGE,
    header: () => <CustomTableHeadCell title={TABLE_COLUMN_ID_LABELS[TABLE_COLUMN_ID_MESSAGE]} />,
    cell: ({ row: { original: { message } } }) => (
      <Typography variant="body2" noWrap>
        {toFirstLine(message)}
      </Typography>
    ),
  },
]

export type DocumentErrorsTableProps = {
  data: VersionNotifications
  selectedId?: string
  onSelectNotification: (id: string) => void
  fetchNextPage: FetchNextNotificationsPage
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

export const DocumentErrorsTable: FC<DocumentErrorsTableProps> = memo<DocumentErrorsTableProps>(({
  data,
  selectedId,
  onSelectNotification,
  fetchNextPage,
  isFetchingNextPage,
  hasNextPage,
}) => {
  const notifications = useMemo(() => [...data], [data])

  const { getHeaderGroups, getRowModel } = useReactTable({
    data: notifications,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  })

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isFetchingNextPage, hasNextPage, fetchNextPage)

  return (
    <StyledTableContainer>
      <Table stickyHeader data-testid="DocumentErrorsTable">
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableCell
                  key={header.id}
                  sx={{ width: TABLE_COLUMNS_LAYOUT_CONFIG[header.id].width }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <NotificationRow
              key={row.original.id}
              selected={row.original.id === selectedId}
              onClick={() => onSelectNotification(row.original.id)}
              data-testid="DocumentErrorsTableRow"
            >
              {row.getVisibleCells().map(cell => (
                <TableCell
                  key={cell.column.id}
                  data-testid={`Cell-${cell.column.id}`}
                  sx={{ maxWidth: TABLE_COLUMNS_LAYOUT_CONFIG[cell.column.id].maxWidth }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </NotificationRow>
          ))}
          <TableRow>
            {hasNextPage && COLUMNS.map(column => (
              <TableCell ref={ref} key={column.id}>
                <Skeleton variant="text" />
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </StyledTableContainer>
  )
})

DocumentErrorsTable.displayName = 'DocumentErrorsTable'

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  padding: theme.spacing(1.5, 3),
}))

const NotificationRow = styled(TableRow)({
  cursor: 'pointer',
})
