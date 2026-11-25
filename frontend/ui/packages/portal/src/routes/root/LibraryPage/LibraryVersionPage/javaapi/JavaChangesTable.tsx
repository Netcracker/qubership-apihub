import { styled, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { Path } from '@remix-run/router'
import {
  type ColumnDef,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  type OnChangeFn,
  useReactTable,
} from '@tanstack/react-table'
import { type FC, Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'

import {
  type JavaApiChangeAction,
  JavaApiChangeActions,
  type JavaApiChangeDescription,
  type JavaApiClassListItem,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { ColumnDelimiter } from '@netcracker/qubership-apihub-ui-shared/components/ColumnDelimiter'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { ExpandableItem } from '@netcracker/qubership-apihub-ui-shared/components/ExpandableItem'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import {
  ACTION_TYPE_COLOR_MAP,
  type ActionType,
  ADD_ACTION_TYPE,
  REMOVE_ACTION_TYPE,
  REPLACE_ACTION_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { OperationChanges } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import {
  type ColumnModel,
  DEFAULT_CONTAINER_WIDTH,
  useColumnsSizing,
} from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import { sortChanges } from '@netcracker/qubership-apihub-ui-shared/utils/api-changes'
import { ChangesSubTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/ChangesSubTable'

import { formatMemberCounts, toChangesSummary } from './javaApi'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'

const JAVA_TYPES_COLUMN_ID = 'java-types'
const MEMBERS_COLUMN_ID = 'members'
const CHANGES_COLUMN_ID = 'changes'
// Three equal columns as in the design; the changes column keeps the package table's minimum width
const COLUMN_PERCENTAGE = 1 / 3
const CHANGES_COLUMN_MIN_WIDTH = 218
const COLUMN_MODELS: ColumnModel[] = [
  { name: JAVA_TYPES_COLUMN_ID, percentage: COLUMN_PERCENTAGE },
  { name: MEMBERS_COLUMN_ID, percentage: COLUMN_PERCENTAGE },
  { name: CHANGES_COLUMN_ID, percentage: COLUMN_PERCENTAGE, minWidth: CHANGES_COLUMN_MIN_WIDTH },
]

const CHANGE_ACTION_TYPES: Record<JavaApiChangeAction, ActionType> = {
  [JavaApiChangeActions.ADDED]: ADD_ACTION_TYPE,
  [JavaApiChangeActions.REMOVED]: REMOVE_ACTION_TYPE,
  [JavaApiChangeActions.CHANGED]: REPLACE_ACTION_TYPE,
}

type JavaChangesTableProps = Readonly<{
  classes: ReadonlyArray<JavaApiClassListItem>
  prepareLinkFn: (javaClass: JavaApiClassListItem) => Partial<Path>
  onLinkClick: () => void
}>

export const JavaChangesTable: FC<JavaChangesTableProps> = memo(({ classes, prepareLinkFn, onLinkClick }) => {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH)
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>()
  const [, setHandlingColumnSizing] = useState<ColumnSizingState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const tableContainerRef = useRef<HTMLDivElement>(null)
  useResizeObserver(tableContainerRef, setContainerWidth)
  const actualColumnSizing = useColumnsSizing({
    containerWidth: containerWidth,
    columnModels: COLUMN_MODELS,
    columnSizingInfo: columnSizingInfo,
    defaultMinColumnSize: 60,
  })
  const columns: ColumnDef<JavaApiClassListItem>[] = useMemo(() => [
    {
      id: JAVA_TYPES_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Java types" />,
      cell: ({ row }) => (
        <ExpandableItem
          expanded={row.getIsExpanded()}
          showToggler={row.getCanExpand()}
          onToggle={row.getToggleExpandedHandler()}
        >
          <JavaClassTitleWithMeta
            javaClass={row.original}
            link={prepareLinkFn(row.original)}
            onLinkClick={onLinkClick}
          />
        </ExpandableItem>
      ),
    },
    {
      id: MEMBERS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Members" />,
      cell: ({ row: { original } }) => {
        const members = formatMemberCounts(original.memberKindCounts, ' · ')
        return <TextWithOverflowTooltip tooltipText={members}>{members}</TextWithOverflowTooltip>
      },
    },
    {
      id: CHANGES_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Changes summary" />,
      cell: ({ row: { original } }) => <Changes value={toChangesSummary(original.changeCounts)} mode="compact" />,
    },
  ], [prepareLinkFn, onLinkClick])
  const data = useMemo(() => [...classes], [classes])
  const { getHeaderGroups, getRowModel, setColumnSizing } = useReactTable({
    data: data,
    columns: columns,
    state: { expanded },
    getRowId: javaClass => javaClass.className,
    getRowCanExpand: row => row.original.changes.length > 0,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    columnResizeMode: 'onChange',
    onColumnSizingChange: setHandlingColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo as OnChangeFn<ColumnSizingInfoState>,
  })
  useEffect(() => setColumnSizing(actualColumnSizing), [setColumnSizing, actualColumnSizing])

  return (
    <TableContainer ref={tableContainerRef}>
      <Table aria-label="JavaAPI changes">
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((headerColumn, index) => (
                <ResizableHeadCell key={headerColumn.id} align="left" width={actualColumnSizing[headerColumn.id]}>
                  {flexRender(headerColumn.column.columnDef.header, headerColumn.getContext())}
                  {index !== headerGroup.headers.length - 1 && <ColumnDelimiter header={headerColumn} resizable />}
                </ResizableHeadCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <Fragment key={row.id}>
              <ActionTableRow
                action={row.original.changeAction ? CHANGE_ACTION_TYPES[row.original.changeAction] : undefined}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </ActionTableRow>
              {row.getIsExpanded() && <JavaChangesSubTable changes={row.original.changes} />}
            </Fragment>
          ))}
          {!classes.length && (
            <TableRow>
              <TableCell colSpan={COLUMN_MODELS.length}>No changes match your filters.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
})
JavaChangesTable.displayName = 'JavaChangesTable'

const JavaChangesSubTable: FC<Readonly<{ changes: ReadonlyArray<JavaApiChangeDescription> }>> = memo(({ changes }) => {
  const changeLines: OperationChanges = useMemo(() => {
    const lines = changes.map(({ severity, description, typeChange }, index) => ({
      description: description,
      severity: severity,
      typeChange: typeChange,
      action: REPLACE_ACTION_TYPE,
      scope: `${index}`,
    } as const))
    return [
      ...lines.filter(line => line.typeChange),
      ...sortChanges(lines.filter(line => !line.typeChange)),
    ]
  }, [changes])
  return <ChangesSubTable changes={changeLines} isLoading={false} columnCount={COLUMN_MODELS.length} />
})
JavaChangesSubTable.displayName = 'JavaChangesSubTable'

const ResizableHeadCell = styled(TableCell)(({ theme }) => ({
  '&:hover': { borderRight: `2px solid ${theme.palette.divider}` },
}))

const ActionTableRow = styled(TableRow, { shouldForwardProp: prop => prop !== 'action' })<
  Readonly<{ action: ActionType | undefined }>
>(({ action }) => ({
  backgroundColor: action ? ACTION_TYPE_COLOR_MAP[action] : undefined,
}))
