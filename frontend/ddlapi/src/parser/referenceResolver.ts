// Private module — pass-2 reference resolution.
//
// Resolution order (must be preserved):
//   1. LIKE expansion
//   2. Column type upgrade (UnsupportedType → registered type)
//   3. Index re-attachment (orphan → Table.indexes)
//   4. ForeignKey resolution (refTable + refColumns)
//   5. Index part column resolution (part.c)

import { TypeKind, DdlErrorKind } from '../constants'
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
    const rawName = (type as unknown as { t: string }).t
    if (!rawName) continue

    // Determine the schema scope from the column key ("schema.table.column")
    const firstDot = columnKey.indexOf('.')
    const schemaName = firstDot !== -1 ? columnKey.slice(0, firstDot) : 'public'

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

  // ── Step 4: ForeignKey resolution ─────────────────────────────────────────

  for (const { fk, refTableKey, refColumnNames } of acc.pendingFKs) {
    const refTable = acc.tableRegistry.get(refTableKey)
    if (!refTable) {
      onError({
        kind: DdlErrorKind.UnresolvedReference,
        target: refTableKey,
        message: `Foreign key references unknown table '${refTableKey}'`,
      })
      // Leave fk.refTable undefined — partial-realm guarantee
      continue
    }

    fk.refTable = refTable

    if (refColumnNames.length > 0) {
      const refColumns: Column[] = []
      for (const colName of refColumnNames) {
        const colKey = `${refTableKey}.${colName}`
        const col = acc.columnRegistry.get(colKey)
        if (col) {
          refColumns.push(col)
        } else {
          onError({
            kind: DdlErrorKind.UnresolvedReference,
            target: colKey,
            message: `Foreign key references unknown column '${colName}' in table '${refTableKey}'`,
          })
        }
      }
      if (refColumns.length > 0) {
        fk.refColumns = refColumns
      }
    }
  }

  // ── Step 5: Index part column resolution ──────────────────────────────────

  for (const { part, columnKey } of acc.pendingIndexParts) {
    const col = acc.columnRegistry.get(columnKey)
    if (col) {
      part.c = col
    }
    // Missing column is not reported — the index part stays without a column ref
  }
}
