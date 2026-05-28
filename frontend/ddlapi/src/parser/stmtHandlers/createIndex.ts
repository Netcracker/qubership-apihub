// Private module — handles IndexStmt (CREATE [UNIQUE] INDEX).

import { deparseSync } from 'pgsql-parser'
import type { IndexStmt, RawStmt, Node, IndexElem } from '@pgsql/types'
import { ObjectKind, DdlErrorKind } from '../../constants'
import type { Index, IndexPart } from '../../schema'
import type { Attr } from '../../attrs'
import type { Expr } from '../../exprs'
import { rawExpr } from '../../factories'
import type { SchemaAccumulator } from '../schemaAccumulator'
import { strVal, stmtRangeOf } from '../astHelpers'
import type { DdlNonFatalError } from '../buildFromDdl'

export function handleCreateIndex(
  stmt: IndexStmt,
  rawStmt: RawStmt,
  defaultSchemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const rel = stmt.relation
  if (!rel) return

  const tableName = rel.relname ?? 'unknown'
  const tableSchema = rel.schemaname ?? defaultSchemaName
  const tableKey = `${tableSchema}.${tableName}`
  const indexName = stmt.idxname
  const range = stmtRangeOf(rawStmt)

  // Duplicate-index check — mirrors the duplicate-object semantics for tables/types
  if (indexName) {
    const indexKey = `${tableSchema}.${indexName}`
    if (acc.indexRegistry.has(indexKey)) {
      onError({
        kind: DdlErrorKind.DuplicateObject,
        objectKind: 'Index',
        qualifiedName: indexKey,
        message: `Duplicate index: ${indexKey}`,
        ...(range && { range }),
      })
      return
    }
  }

  // Build index parts
  const indexParams = (stmt.indexParams ?? []) as Node[]
  const parts: IndexPart[] = []
  const pendingParts: Array<{ part: IndexPart; columnKey: string }> = []

  for (let i = 0; i < indexParams.length; i++) {
    const elemNode = indexParams[i] as Node
    const elem = (elemNode as Record<string, unknown>)['IndexElem'] as IndexElem | undefined
    if (!elem) continue

    const partAttrs: Attr[] = []
    const desc = elem.ordering === 'SORTBY_DESC'

    // NULLS FIRST / NULLS LAST
    if (elem.nulls_ordering === 'SORTBY_NULLS_FIRST') {
      partAttrs.push({ kind: 'IndexColumnProp', nullsFirst: true, nullsLast: false } as Attr)
    } else if (elem.nulls_ordering === 'SORTBY_NULLS_LAST') {
      partAttrs.push({ kind: 'IndexColumnProp', nullsFirst: false, nullsLast: true } as Attr)
    }

    // Operator class
    if (elem.opclass && elem.opclass.length > 0) {
      const opclassName = strVal(elem.opclass[0])
      if (opclassName) {
        partAttrs.push({ kind: 'IndexOpClass', name: opclassName } as Attr)
      }
    }

    const part: IndexPart = {
      seqNo: i,
      ...(desc && { desc }),
      ...(partAttrs.length > 0 && { attrs: partAttrs }),
    }

    if (elem.name) {
      // Column reference — resolve in pass 2
      pendingParts.push({ part, columnKey: `${tableSchema}.${tableName}.${elem.name}` })
    } else if (elem.expr) {
      // Expression part — deparsed to string, set immediately
      const exprStr = deparseSync(elem.expr as Record<string, unknown>)
        ; ((part as unknown) as Record<string, unknown>)['x'] = rawExpr(exprStr) as Expr
    }

    parts.push(part)
  }

  // Index-level attrs
  const indexAttrs: Attr[] = []

  // Access method — only record if not the default btree
  if (stmt.accessMethod && stmt.accessMethod !== 'btree') {
    indexAttrs.push({ kind: 'IndexType', T: stmt.accessMethod } as Attr)
  }

  // WHERE predicate
  if (stmt.whereClause) {
    const pred = deparseSync(stmt.whereClause as Record<string, unknown>)
    indexAttrs.push({ kind: 'IndexPredicate', P: pred } as Attr)
  }

  // CONCURRENTLY
  if (stmt.concurrent) {
    indexAttrs.push({ kind: 'Concurrently' } as Attr)
  }

  // NULLS [NOT] DISTINCT
  if (stmt.nulls_not_distinct) {
    indexAttrs.push({ kind: 'IndexNullsDistinct', V: false } as Attr)
  }

  // INCLUDE columns
  const includingParams = (stmt.indexIncludingParams ?? []) as Node[]
  if (includingParams.length > 0) {
    const includeColNames = includingParams.map(n => {
      const elem = (n as Record<string, unknown>)['IndexElem'] as IndexElem | undefined
      return elem?.name ?? ''
    }).filter(Boolean)
    if (includeColNames.length > 0) {
      indexAttrs.push({ kind: 'IndexInclude', columns: includeColNames } as Attr)
    }
  }

  // WITH storage params
  if (stmt.options && stmt.options.length > 0) {
    const params: Record<string, string> = {}
    for (const opt of stmt.options as Node[]) {
      const de = (opt as Record<string, unknown>)['DefElem'] as Record<string, unknown> | undefined
      if (!de) continue
      const name = de['defname'] as string | undefined
      const arg = de['arg'] as Node | undefined
      if (name && arg) params[name] = deparseSync(arg as Record<string, unknown>)
    }
    if (Object.keys(params).length > 0) {
      indexAttrs.push({ kind: 'StorageParams', params } as Attr)
    }
  }

  const index: Index = {
    kind: ObjectKind.Index,
    ...(indexName ? { name: indexName } : {}),
    ...(stmt.unique && { unique: true }),
    ...(indexAttrs.length > 0 && { attrs: indexAttrs }),
    ...(parts.length > 0 && { parts }),
  }

  // Register pending index part column resolutions
  for (const pp of pendingParts) {
    acc.pendingIndexParts.push(pp)
  }

  // Register in indexRegistry for COMMENT ON INDEX lookup
  if (indexName) {
    acc.indexRegistry.set(`${tableSchema}.${indexName}`, index)
  }

  // Look up the target table
  if (acc.tableRegistry.has(tableKey)) {
    acc.appendTableIndex(tableKey, index)
  } else {
    // Forward-reference — register as orphan; resolved silently in pass 2
    acc.registerOrphanIndex(index, tableKey, tableSchema)
  }
}
