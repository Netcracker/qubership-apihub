// Private module — handles CreateTrigStmt (CREATE TRIGGER).

import { deparseSync } from 'pgsql-parser'
import type { CreateTrigStmt, RawStmt, Node } from '@pgsql/types'
import { DdlErrorKind } from '../../constants'
import { PgAttrKind, PgTriggerTiming, PgTriggerEvent } from '../../postgres.constants'
import type { Attr } from '../../attrs'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf } from '../astHelpers'
import type { DdlNonFatalError } from '../buildFromDdl'

// PostgreSQL internal trigger timing bitmask values
const TIMING_BEFORE  = 2
const TIMING_INSTEAD = 64

// PostgreSQL internal trigger event bitmask values
const EVENT_INSERT   = 4
const EVENT_UPDATE   = 16
const EVENT_DELETE   = 8
const EVENT_TRUNCATE = 32

export function handleCreateTrigger(
  stmt: CreateTrigStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const rel = stmt.relation
  if (!rel) return

  const tableName = rel.relname ?? 'unknown'
  const tableSchema = (rel as { schemaname?: string }).schemaname ?? defaultSchemaName
  const tableKey = `${tableSchema}.${tableName}`
  const range = stmtRangeOf(rawStmt)

  // Decode timing
  const timingVal = stmt.timing ?? 0
  let timing: PgTriggerTiming
  if (timingVal === TIMING_INSTEAD) {
    timing = PgTriggerTiming.InsteadOf
  } else if (timingVal === TIMING_BEFORE) {
    timing = PgTriggerTiming.Before
  } else {
    timing = PgTriggerTiming.After
  }

  // Find the target table
  const table = acc.tableRegistry.get(tableKey)

  if (!table) {
    // For INSTEAD OF triggers, the target is a view (not a table).
    // Since CREATE VIEW is out-of-scope, views are never registered — always error.
    // For BEFORE/AFTER triggers on tables, an unregistered table is also an error.
    const triggerKind = timing === 'INSTEAD OF' ? 'view' : 'table'
    onError({
      kind: DdlErrorKind.UnresolvedReference,
      target: tableKey,
      message: `Trigger '${stmt.trigname ?? ''}' references unknown ${triggerKind} '${tableKey}'`,
      ...(range && { range }),
    })
    return
  }

  // Decode events bitmask
  const eventsVal = stmt.events ?? 0
  const events: string[] = []
  if (eventsVal & EVENT_INSERT) events.push(PgTriggerEvent.Insert)
  if (eventsVal & EVENT_UPDATE) events.push(PgTriggerEvent.Update)
  if (eventsVal & EVENT_DELETE) events.push(PgTriggerEvent.Delete)
  if (eventsVal & EVENT_TRUNCATE) events.push(PgTriggerEvent.Truncate)

  // Function name — list of String nodes
  const funcnameParts = (stmt.funcname ?? []) as Node[]
  const funcName = funcnameParts.map(n => strVal(n) ?? '').filter(Boolean).join('.')

  // WHEN clause — deparse if present
  let whenClause: string | undefined
  if (stmt.whenClause) {
    whenClause = deparseSync(stmt.whenClause as Record<string, unknown>)
  }

  const triggerAttr: Attr = {
    kind: PgAttrKind.Trigger,
    name: stmt.trigname ?? '',
    timing,
    events,
    forEachRow: stmt.row ?? false,
    funcName,
    ...(whenClause !== undefined && { when: whenClause }),
    ...(stmt.isconstraint && { isConstraint: true }),
    ...(stmt.deferrable && { deferrable: true }),
    ...(stmt.initdeferred && { initDeferred: true }),
  } as Attr

  acc.appendTableAttr(tableKey, triggerAttr)
}
