import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import type { ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { FC } from 'react'
import { memo, useMemo, useRef } from 'react'
import { IssueSeverityMarker } from './IssueSeverityMarker'
import type { ValidationDetails } from '@apihub/entities/api-quality/document-validation-details'
import type { Issue } from '@apihub/entities/api-quality/issues'
import type { IssueSeverity } from '@apihub/entities/api-quality/issue-severities'
import { issuePathToSpecItemUri } from './utilities/transformers'

const TABLE_COLUMN_ID_TYPE = 'type'
const TABLE_COLUMN_ID_MESSAGE = 'message'

const TABLE_COLUMN_ID_LABELS = {
  [TABLE_COLUMN_ID_TYPE]: 'Type',
  [TABLE_COLUMN_ID_MESSAGE]: 'Message',
}

type TableData = {
  type: IssueSeverity
  message: string
  path: SpecItemUri // Example: /foo/bar/baz/qux/1
}

type ValidationResultsTableProps = {
  data: ValidationDetails | undefined
  loading: IsLoading
  onSelectIssue: (pathToIssue: SpecItemUri) => void
}

const ValidationResultsTableSkeleton: FC = memo(() => {
  const rows = Array(5).fill(null)

  return (
    <TableContainer>
      <Table>
        <TableHead>
          {rows.map((_, index) => (
            <TableRow key={`skeleton-row-${index}`}>
              <TableCell>
                <Skeleton variant="text" width={100} height={20} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width='80%' height={20} />
              </TableCell>
            </TableRow>
          ))}
        </TableHead>
      </Table>
    </TableContainer>
  )
})

type TableColumnLayoutConfig = {
  width: string
  whiteSpace: string
  textAlign: string
}

const TABLE_COLUMNS_LAYOUT_CONFIG: Record<string, TableColumnLayoutConfig> = {
  [TABLE_COLUMN_ID_TYPE]: {
    width: '50px',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  [TABLE_COLUMN_ID_MESSAGE]: {
    width: 'auto',
    whiteSpace: 'normal',
    textAlign: 'left',
  },
}

const COLUMNS: ColumnDef<TableData>[] = [
  {
    id: TABLE_COLUMN_ID_TYPE,
    header: () => <CustomTableHeadCell title={TABLE_COLUMN_ID_LABELS[TABLE_COLUMN_ID_TYPE]} />,
    cell: ({ row: { original: { type } } }) => {
      return (
        <Typography variant="body2">
          <IssueSeverityMarker severity={type} />
        </Typography>
      )
    },
  },
  {
    id: TABLE_COLUMN_ID_MESSAGE,
    header: () => <CustomTableHeadCell title={TABLE_COLUMN_ID_LABELS[TABLE_COLUMN_ID_MESSAGE]} />,
    cell: ({ row: { original: { message } } }) => (
      <Typography variant="body2">
        {message}
      </Typography>
    ),
  },
]

export const ValidationResultsTable: FC<ValidationResultsTableProps> = memo<ValidationResultsTableProps>(props => {
  const { data, loading, onSelectIssue } = props

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const transformedData: TableData[] = useMemo(() => (data?.issues ?? []).map((issue: Issue) => ({
    type: issue.severity,
    message: issue.message,
    path: issuePathToSpecItemUri(issue.path),
  })), [data?.issues])

  const { getHeaderGroups, getRowModel } = useReactTable({
    data: transformedData,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return <ValidationResultsTableSkeleton />
  }

  return (
    <TableContainer ref={tableContainerRef}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableCell
                  key={header.id}
                  sx={{
                    width: TABLE_COLUMNS_LAYOUT_CONFIG[header.id].width,
                    whiteSpace: TABLE_COLUMNS_LAYOUT_CONFIG[header.id].whiteSpace,
                    textAlign: TABLE_COLUMNS_LAYOUT_CONFIG[header.id].textAlign,
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <TableRow key={row.id} sx={{ cursor: 'pointer' }} onClick={() => onSelectIssue(row.original.path)}>
              {row.getVisibleCells().map(cell => (
                <TableCell
                  key={cell.column.id}
                  sx={{
                    textAlign: TABLE_COLUMNS_LAYOUT_CONFIG[cell.column.id].textAlign,
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
})
