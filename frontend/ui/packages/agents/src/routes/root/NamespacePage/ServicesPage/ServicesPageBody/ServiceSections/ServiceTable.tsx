import {
  Checkbox,
  Skeleton,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  type Cell,
  type ColumnDef,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type ExpandedState,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getExpandedRowModel,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type Table as ReactTable,
  useReactTable,
} from '@tanstack/react-table'
import {
  type FC,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import {
  type ColumnModel,
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { createComponents, genericMemo } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

import type { Service } from '@agents/entities/services'
import { selectAllStateOf } from './serviceRows'

export const SERVICE_OR_DOCUMENTATION_COLUMN_ID = 'service-or-documentation'
export const SERVICE_LABELS_COLUMN_ID = 'service-labels'
export const BASELINE_PACKAGE_COLUMN_ID = 'baseline-package'

const SELECTION_COLUMN_ID = 'selection'
const LINK_COLUMN_ID = 'link'
const MIN_COLUMN_WIDTH: Pixel = 180
// The controls that a service row renders: the chevron, "View Package" and the other links, and "Error Details"
const ROW_CONTROL_SELECTOR = 'a, button'

const SELECTION_COLUMN_MODEL: ColumnModel = { name: SELECTION_COLUMN_ID, fixedWidth: 60 }
const LINK_COLUMN_MODEL: ColumnModel = { name: LINK_COLUMN_ID, fixedWidth: 180 }

/** A row of a service, or of one of its API documents under it. */
export type ServiceTableRow<TRow> = Partial<{
  service: Service
  spec: Spec
  children: TRow[]
}>

export type ServiceTableColumn<TRow> = Readonly<{
  id: string
  header: string
  cell: (row: Row<TRow>) => ReactNode
}>

/** Renders the content at the right end of a row, such as a link shown while the pointer is over the row. */
export type ServiceTableLink<TRow> = (row: Row<TRow>) => ReactNode

export type ServiceSelection = Readonly<{
  selected: ReadonlyArray<ServiceKey>
  onSelect: (selected: ServiceKey[]) => void
  /** A service it returns false for gets a disabled checkbox. */
  isSelectable: (service: Service) => boolean
}>

type ServiceTableProps<TRow extends ServiceTableRow<TRow>> = {
  columns: ReadonlyArray<ServiceTableColumn<TRow>>
  link?: ServiceTableLink<TRow>
  rows: TRow[]
  selection?: ServiceSelection
  isLoading: boolean
}

function ServiceTableComponent<TRow extends ServiceTableRow<TRow>>({
  columns,
  link,
  rows,
  selection,
  isLoading,
}: ServiceTableProps<TRow>): ReactElement {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>()
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)

  const hasSelection = selection !== undefined
  const hasLink = link !== undefined

  // The ids alone decide the sizes, so a step that builds its columns again keeps the widths the user set
  const columnIds = columns.map(({ id }) => id).join(' ')
  const columnModels = useMemo<ColumnModel[]>(() => [
    ...(hasSelection ? [SELECTION_COLUMN_MODEL] : []),
    ...columnIds.split(' ').map(id => ({ name: id })),
    ...(hasLink ? [LINK_COLUMN_MODEL] : []),
  ], [columnIds, hasLink, hasSelection])

  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: columnModels,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: MIN_COLUMN_WIDTH,
  })

  const tableColumns = useMemo<ColumnDef<TRow>[]>(() => [
    ...(hasSelection ? [selectionColumnOf<TRow>()] : []),
    ...columns.map(({ id, header, cell }): ColumnDef<TRow> => ({
      id: id,
      header: header,
      cell: ({ row }) => cell(row),
    })),
    ...(link ? [linkColumnOf(link)] : []),
  ], [columns, hasSelection, link])

  // The step keeps the selected service keys, so every section of the step shows the same selection
  const selected = selection?.selected
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries((selected ?? []).map(key => [key, true])),
    [selected],
  )
  const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(updater => {
    const nextRowSelection = functionalUpdate(updater, rowSelection)
    selection?.onSelect(Object.keys(nextRowSelection).filter(key => nextRowSelection[key]))
  }, [rowSelection, selection])

  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: rows,
    columns: tableColumns,
    columnResizeMode: 'onChange',
    state: { expanded: expanded, rowSelection: rowSelection },
    getRowId: serviceTableRowIdOf,
    getSubRows: row => row.children,
    // Only a service row has a checkbox, and selecting it leaves its documents as they are
    enableRowSelection: ({ original: { service } }) => !!service && !!selection?.isSelectable(service),
    enableSubRowSelection: false,
    onExpandedChange: setExpanded,
    onRowSelectionChange: onRowSelectionChange,
    onColumnSizingChange: setHandlingColumnSizing as OnChangeFn<ColumnSizingState>,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <TableContainer ref={tableContainerRef}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <HeadTableCell
                  key={header.id}
                  data-testid={`HeadCell-${header.id}`}
                  align="left"
                  width={actualColumnSizing[header.id]}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {index !== headerGroup.headers.length - 1 && <ColumnDelimiter header={header} resizable={true} />}
                </HeadTableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <ServiceTableBodyRow
              key={row.id}
              cells={row.getVisibleCells()}
              expanded={row.getIsExpanded()}
              selected={row.getIsSelected()}
              selectable={row.getCanSelect()}
            />
          ))}
          {isLoading && <TableSkeleton columnIds={columnModels.map(({ name }) => name)} />}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

ServiceTableComponent.displayName = 'ServiceTable'

export const ServiceTable = genericMemo(ServiceTableComponent)

type SelectAllCheckboxProps<TRow> = {
  table: ReactTable<TRow>
}

// Counts the rows of this section only: the selection of the step also holds the keys of its other sections
function SelectAllCheckbox<TRow>({ table }: SelectAllCheckboxProps<TRow>): ReactElement {
  const { checked, indeterminate, disabled } = selectAllStateOf(
    table.getCoreRowModel().rows.map(row => ({
      canSelect: row.getCanSelect(),
      isSelected: row.getIsSelected(),
    })),
  )

  return (
    <CompactCheckbox
      disabled={disabled}
      checked={checked}
      indeterminate={indeterminate}
      inputProps={{ 'aria-label': 'Select all services' }}
      onChange={table.getToggleAllRowsSelectedHandler()}
    />
  )
}

SelectAllCheckbox.displayName = 'SelectAllCheckbox'

/**
 * `expanded`, `selected`, and `selectable` are the state that the cells read through the methods of the TanStack row.
 * The row and its cells stay the same objects when this state changes, so these props make `memo` render the row again.
 */
type ServiceTableBodyRowProps<TRow> = {
  cells: ReadonlyArray<Cell<TRow, unknown>>
  expanded: boolean
  selected: boolean
  selectable: boolean
}

function ServiceTableBodyRowComponent<TRow>({ cells }: ServiceTableBodyRowProps<TRow>): ReactElement {
  return (
    <TableRow>
      {cells.map(cell => <ServiceTableBodyCell key={cell.column.id} cell={cell} />)}
    </TableRow>
  )
}

ServiceTableBodyRowComponent.displayName = 'ServiceTableBodyRow'

// Opening or selecting a row and resizing a column render only the rows whose props changed
const ServiceTableBodyRow = genericMemo(ServiceTableBodyRowComponent)

type ServiceTableBodyCellProps<TRow> = {
  cell: Cell<TRow, unknown>
}

/**
 * A click on the cell opens or closes a row with API documents, outside the checkbox column. A drag that ends in
 * another cell leaves the row as it is: the browser sends its click to the row, which holds both cells.
 */
function ServiceTableBodyCell<TRow>({ cell }: ServiceTableBodyCellProps<TRow>): ReactElement {
  const { row, column } = cell
  const togglesRow = row.getCanExpand() && column.id !== SELECTION_COLUMN_ID

  const handleClick = (event: MouseEvent<HTMLTableCellElement>): void => {
    if (!togglesRow) {
      return
    }
    const { target } = event
    // A tooltip renders through a portal, and React still passes a click in it up to this cell
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) {
      return
    }
    // A control does only its own job
    if (target.closest(ROW_CONTROL_SELECTOR)) {
      return
    }
    // The user released the button after selecting text, also past the end of the text
    if (window.getSelection()?.isCollapsed === false) {
      return
    }
    row.toggleExpanded()
  }

  return (
    <BodyTableCell
      data-testid={`Cell-${column.id}`}
      align={column.id === LINK_COLUMN_ID ? 'right' : 'left'}
      clickable={togglesRow}
      onClick={handleClick}
    >
      {flexRender(column.columnDef.cell, cell.getContext())}
    </BodyTableCell>
  )
}

ServiceTableBodyCell.displayName = 'ServiceTableBodyCell'

type TableSkeletonProps = {
  columnIds: ReadonlyArray<string>
}

const TableSkeleton: FC<TableSkeletonProps> = ({ columnIds }) => (
  createComponents(<RowSkeleton columnIds={columnIds} />, DEFAULT_NUMBER_SKELETON_ROWS)
)

TableSkeleton.displayName = 'TableSkeleton'

const RowSkeleton: FC<TableSkeletonProps> = ({ columnIds }) => (
  <TableRow>
    {columnIds.map(id => (
      <TableCell key={id}>
        {id !== SELECTION_COLUMN_ID && id !== LINK_COLUMN_ID && <Skeleton variant="rectangular" width="80%" />}
      </TableCell>
    ))}
  </TableRow>
)

RowSkeleton.displayName = 'RowSkeleton'

const CompactCheckbox = styled(Checkbox)({
  paddingTop: 0,
  paddingBottom: 0,
})

const BodyTableCell = styled(TableCell, {
  shouldForwardProp: prop => prop !== 'clickable',
})<{ clickable: boolean }>(({ clickable }) => ({
  cursor: clickable ? 'pointer' : undefined,
}))

const HeadTableCell = styled(TableCell)({
  '&:hover': {
    borderRight: '2px solid rgba(224, 224, 224, 1)',
  },
})

function selectionColumnOf<TRow extends ServiceTableRow<TRow>>(): ColumnDef<TRow> {
  return {
    id: SELECTION_COLUMN_ID,
    header: ({ table }) => <SelectAllCheckbox table={table} />,
    cell: ({ row }) => {
      const { service } = row.original
      return service && (
        <CompactCheckbox
          disabled={!row.getCanSelect()}
          checked={row.getIsSelected()}
          inputProps={{ 'aria-label': `Select ${service.key}` }}
          onChange={row.getToggleSelectedHandler()}
        />
      )
    },
  }
}

function linkColumnOf<TRow>(link: ServiceTableLink<TRow>): ColumnDef<TRow> {
  return {
    id: LINK_COLUMN_ID,
    cell: ({ row }) => link(row),
  }
}

// A service row takes the key of its service as its id, so that a search keeps the selection and the open rows
function serviceTableRowIdOf<TRow extends ServiceTableRow<TRow>>(row: TRow, index: number, parent?: Row<TRow>): string {
  if (parent) {
    return `${parent.id}.${index}`
  }
  return row.service?.key ?? String(index)
}
