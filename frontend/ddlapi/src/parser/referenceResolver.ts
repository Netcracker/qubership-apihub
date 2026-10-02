// Private module — pass-2 reference resolution.
//
// Resolution order (must be preserved):
//   1. LIKE expansion
//   2. Column type upgrade (UnsupportedType → registered type)
//   3. Index re-attachment (orphan → Table.indexes)
//   4. ForeignKey check (columns, refTable, refColumns)
//   5. Index part column check (part.column of indexes and the primary key)
//
// Steps 4 and 5 only report names that the DDL does not define: a ForeignKey and an
// IndexPart hold names, which pass 1 has already set.

import { TypeKind, DdlErrorKind } from '../constants'
import { PG_DEFAULT_SCHEMA, PgAttrKind } from '../postgres.constants'
import type { Column } from '../schema'
import type { SchemaAccumulator } from './schemaAccumulator'
import type { DdlNonFatalError } from './buildFromDdl'

export function resolveReferences(
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  // ── Step 1: LIKE expansion ────────────────────────────────────────────────

  for (const pl of acc.pendingLikes) {
    const { table, tableKey, sourceKey, stmtRange } = pl

    // Skip tables already discarded in a previous LIKE resolution
    if (acc.isSkipped(tableKey)) continue

    const sourceTable = acc.tableRegistry.get(sourceKey)
    if (!sourceTable) {
      onError({
        kind: DdlErrorKind.UnresolvedLikeSource,
        table: tableKey,
        likeSource: sourceKey,
        message: `LIKE source table '${sourceKey}' not found in DDL`,
        ...(stmtRange && { range: stmtRange }),
      })
      // Remove the table from the realm entirely
      const dotIdx = tableKey.indexOf('.')
      const schemaName = tableKey.slice(0, dotIdx)
      const tableName = tableKey.slice(dotIdx + 1)
      acc.removeTable(schemaName, tableName)
      acc.skipTable(tableKey)
      continue
    }

    // Copy source columns (fresh Column objects, shared type references)
    const copiedColumns: Column[] = (sourceTable.columns ?? []).map(col => ({
      name: col.name,
      ...(col.type !== undefined && { type: { ...col.type } }),
      ...(col.default !== undefined && { default: col.default }),
      ...(col.attrs !== undefined && { attrs: [...col.attrs] }),
    }))

    // Prepend copied columns before this table's own columns
    const ownColumns = (table.columns ?? []) as Column[]
    const merged = [...copiedColumns, ...ownColumns]
    if (merged.length > 0) {
      table.columns = merged
    }

    // Register the copied columns so subsequent type-upgrade and FK resolution can find them
    const dotIdx = tableKey.indexOf('.')
    const schemaName = tableKey.slice(0, dotIdx)
    const tableName = tableKey.slice(dotIdx + 1)
    for (const col of copiedColumns) {
      acc.registerColumn(schemaName, tableName, col)
    }
  }

  // ── Step 2: Column type upgrade ───────────────────────────────────────────

  for (const [columnKey, col] of acc.columnRegistry) {
    const colType = col.type
    if (!colType) continue
    const type = colType.type
    if (!type || type.kind !== TypeKind.UnsupportedType) continue
    // Cast via unknown to avoid TypeScript not narrowing through UnknownType's index signature
    const rawName = (type as unknown as { type: string }).type
    if (!rawName) continue

    // Determine the schema scope from the column key ("schema.table.column")
    const firstDot = columnKey.indexOf('.')
    const schemaName = firstDot !== -1 ? columnKey.slice(0, firstDot) : PG_DEFAULT_SCHEMA

    // For qualified names (e.g. "myschema.mytype") use as-is; otherwise scope to table's schema
    const typeKey = rawName.includes('.') ? rawName : `${schemaName}.${rawName}`
    const resolvedType = acc.typeRegistry.get(typeKey)
    if (resolvedType) {
      colType.type = resolvedType
    }
  }

  // ── Step 3: Index re-attachment ───────────────────────────────────────────
  // Orphan indexes are from forward-reference CREATE INDEX — attach silently (no error).

  for (const { index, tableKey, schemaName } of acc.orphanIndexes) {
    const table = acc.tableRegistry.get(tableKey)
    if (!table) {
      onError({
        kind: DdlErrorKind.UnresolvedReference,
        target: tableKey,
        message: `Index '${index.name ?? '(unnamed)'}' references unknown table '${tableKey}'`,
      })
      continue
    }

    // Move from Schema.objects to Table.indexes
    acc.removeFromSchemaObjects(schemaName, index)
    acc.appendTableIndex(tableKey, index)
  }

  // Steps 4 and 5 check column names only against a registered table without INHERITS. A
  // table with INHERITS also has the columns of its parents, which the parser does not copy.
  // An unregistered table has been reported already, by the step that dropped or missed it.
  const hasCheckableColumns = (tableKey: string): boolean => {
    const table = acc.tableRegistry.get(tableKey)
    return table !== undefined && !table.attrs?.some(a => a.kind === PgAttrKind.Inherits)
  }

  // ── Step 4: ForeignKey check ──────────────────────────────────────────────
  // An unresolved key keeps its names — partial-realm guarantee.

  for (const { fk, tableKey } of acc.pendingFKs) {
    if (hasCheckableColumns(tableKey)) {
      for (const colName of fk.columns ?? []) {
        const colKey = `${tableKey}.${colName}`
        if (!acc.columnRegistry.has(colKey)) {
          onError({
            kind: DdlErrorKind.UnresolvedReference,
            target: colKey,
            message: `Foreign key lists unknown column '${colName}' of table '${tableKey}'`,
          })
        }
      }
    }

    if (!fk.refTable) continue
    const refTableKey = `${fk.refTable.schema}.${fk.refTable.name}`
    if (!acc.tableRegistry.has(refTableKey)) {
      onError({
        kind: DdlErrorKind.UnresolvedReference,
        target: refTableKey,
        message: `Foreign key references unknown table '${refTableKey}'`,
      })
      continue
    }
    if (!hasCheckableColumns(refTableKey)) continue

    for (const colName of fk.refColumns ?? []) {
      const colKey = `${refTableKey}.${colName}`
      if (!acc.columnRegistry.has(colKey)) {
        onError({
          kind: DdlErrorKind.UnresolvedReference,
          target: colKey,
          message: `Foreign key references unknown column '${colName}' in table '${refTableKey}'`,
        })
      }
    }
  }

  // ── Step 5: Index part column check ───────────────────────────────────────
  // An unresolved part keeps its column name. An index on an unknown table is
  // reported by step 3.

  for (const { index, tableKey, column } of acc.pendingIndexParts) {
    if (!hasCheckableColumns(tableKey)) continue
    const columnKey = `${tableKey}.${column}`
    if (!acc.columnRegistry.has(columnKey)) {
      const owner = acc.tableRegistry.get(tableKey)?.primaryKey === index
        ? 'Primary key'
        : `Index '${index.name ?? '(unnamed)'}'`
      onError({
        kind: DdlErrorKind.UnresolvedReference,
        target: columnKey,
        message: `${owner} references unknown column '${column}' in table '${tableKey}'`,
      })
    }
  }
}
