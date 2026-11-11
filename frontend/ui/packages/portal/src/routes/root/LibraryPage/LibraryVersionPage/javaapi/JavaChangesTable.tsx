import { styled, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { type FC, Fragment, memo, useCallback, useMemo, useState } from 'react'

import {
  type JavaApiChangeAction,
  JavaApiChangeActions,
  type JavaApiChangeDescription,
  type JavaApiClassListItem,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
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
import {
  ChangesSubTable,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/ChangesSubTable'

import { toChangesSummary } from './java-api'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'

const COLUMN_COUNT = 3

const CHANGE_ACTION_TYPES: Record<JavaApiChangeAction, ActionType> = {
  [JavaApiChangeActions.ADDED]: ADD_ACTION_TYPE,
  [JavaApiChangeActions.REMOVED]: REMOVE_ACTION_TYPE,
  [JavaApiChangeActions.CHANGED]: REPLACE_ACTION_TYPE,
}

const MEMBER_KIND_TITLES = [
  ['FIELD', 'field', 'fields'],
  ['CONSTRUCTOR', 'constructor', 'constructors'],
  ['METHOD', 'method', 'methods'],
] as const

type JavaChangesTableProps = {
  classes: ReadonlyArray<JavaApiClassListItem>
  onOpen: (className: string) => void
}

export const JavaChangesTable: FC<JavaChangesTableProps> = memo<JavaChangesTableProps>(({ classes, onOpen }) => {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const toggle = useCallback((className: string) =>
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(className)) next.delete(className)
      else next.add(className)
      return next
    }), [])

  return (
    <TableContainer>
      <Table aria-label="JavaAPI changes">
        <TableHead>
          <TableRow>
            <TableCell>
              <CustomTableHeadCell title="Java types" />
            </TableCell>
            <TableCell width={260}>
              <CustomTableHeadCell title="Members" />
            </TableCell>
            <TableCell width={218}>
              <CustomTableHeadCell title="Changes summary" />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {classes.map(javaClass => (
            <JavaChangesRow
              key={javaClass.className}
              javaClass={javaClass}
              isExpanded={expanded.has(javaClass.className)}
              onToggle={toggle}
              onOpen={onOpen}
            />
          ))}
          {!classes.length && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>No changes match your filters.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

JavaChangesTable.displayName = 'JavaChangesTable'

type JavaChangesRowProps = {
  javaClass: JavaApiClassListItem
  isExpanded: boolean
  onToggle: (className: string) => void
  onOpen: (className: string) => void
}

const JavaChangesRow: FC<JavaChangesRowProps> = memo<JavaChangesRowProps>(
  ({ javaClass, isExpanded, onToggle, onOpen }) => {
    const { className, changeAction, changes, changeCounts, memberKindCounts } = javaClass
    const changesSummary = useMemo(() => toChangesSummary(changeCounts), [changeCounts])
    const members = useMemo(() => formatMemberCounts(memberKindCounts), [memberKindCounts])
    const changeLines: OperationChanges = useMemo(
      () =>
        // TODO(api-doc-viewer): drop the annotations once its .d.ts includes the next-data-model types, which
        // resolve to any in the portal today
        changes.map(({ severity, description }: JavaApiChangeDescription, index: number) => ({
          description: description,
          severity: severity,
          action: REPLACE_ACTION_TYPE,
          scope: `${index}`,
        })),
      [changes],
    )

    return (
      <Fragment>
        <ActionTableRow action={changeAction ? CHANGE_ACTION_TYPES[changeAction] : undefined}>
          <TableCell data-testid="Cell-java-types">
            <ExpandableItem
              expanded={isExpanded}
              showToggler={changes.length > 0}
              onToggle={() => onToggle(className)}
            >
              <JavaClassTitleWithMeta javaClass={javaClass} onTitleClick={() => onOpen(className)} />
            </ExpandableItem>
          </TableCell>
          <TableCell data-testid="Cell-members">
            <TextWithOverflowTooltip tooltipText={members}>{members}</TextWithOverflowTooltip>
          </TableCell>
          <TableCell data-testid="Cell-changes">
            <Changes value={changesSummary} mode="compact" />
          </TableCell>
        </ActionTableRow>
        {isExpanded && <ChangesSubTable changes={changeLines} isLoading={false} columnCount={COLUMN_COUNT} />}
      </Fragment>
    )
  },
)

JavaChangesRow.displayName = 'JavaChangesRow'

type ActionTableRowProps = {
  action: ActionType | undefined
}

const ActionTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== 'action',
})<ActionTableRowProps>(({ action }) => ({
  backgroundColor: action ? ACTION_TYPE_COLOR_MAP[action] : undefined,
}))

function formatMemberCounts(counts: JavaApiClassListItem['memberKindCounts']): string {
  const parts = MEMBER_KIND_TITLES
    .filter(([kind]) => counts[kind] > 0)
    .map(([kind, one, many]) => `${counts[kind]} ${counts[kind] === 1 ? one : many}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}
