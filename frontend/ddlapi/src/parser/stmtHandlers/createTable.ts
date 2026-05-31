// Private module — handles CreateStmt (CREATE TABLE).

import { deparseSync } from 'pgsql-parser'
import type { CreateStmt, RawStmt, Node, ColumnDef, Constraint, TableLikeClause } from '@pgsql/types'
import { ObjectKind, AttrKind, ReferenceOption, DdlErrorKind } from '../../constants'
import { PgAttrKind, PgObjectKind } from '../../postgres.constants'
import type { Table, Column, ColumnType, Index, IndexPart, ForeignKey, SchemaObject } from '../../schema'
import type { Attr } from '../../attrs'
import type { Expr } from '../../exprs'
import {
  newColumn, columnType, newCheck, newForeignKey, newIndex, newPrimaryKey,
  comment, collation, generatedExpr, unsupportedType,
} from '../../factories'
import type { SchemaAccumulator, PendingFK, PendingIndexPart } from '../schemaAccumulator'
import { mapTypeName } from '../typeMapper'
import { strVal, stmtRangeOf, nodeToExpr, exprToString } from '../astHelpers'
import type { DdlNonFatalError } from '../buildFromDdl'

// ── helpers ───────────────────────────────────────────────────────────────────

function constIval(node: Node): number | undefined {
  // A_Const form — used in column defaults, typmods, etc.
  const c = (node as Record<string, unknown>)['A_Const'] as Record<string, unknown> | undefined
  if (c) {
    const iv = (c['ival'] as Record<string, unknown> | undefined)?.['ival']
    if (typeof iv === 'number') return iv
  }
  // Integer form — used in DefElem args (e.g. sequence options START WITH, INCREMENT BY)
  const intNode = (node as Record<string, unknown>)['Integer'] as Record<string, unknown> | undefined
  if (intNode) {
    const iv = intNode['ival']
    if (typeof iv === 'number') return iv
  }
  return undefined
}

function fkAction(ch: string): ReferenceOption {
  switch (ch) {
    case 'r': return ReferenceOption.Restrict
    case 'c': return ReferenceOption.Cascade
    case 'n': return ReferenceOption.SetNull
    case 'd': return ReferenceOption.SetDefault
    default: return ReferenceOption.NoAction
  }
}

// ── column builder ────────────────────────────────────────────────────────────

type PendingFKInfo = {
  symbol?: string
  columns: Column[]       // FK columns (same table)
  refTableKey: string
  refColumnNames: string[]
  onUpdate?: ReferenceOption
  onDelete?: ReferenceOption
}

type TableBuildResult = {
  table: Table
  pendingFKs: PendingFKInfo[]
  pendingIndexParts: Array<{ part: IndexPart; columnKey: string }>
  likeSource?: { sourceKey: string }
}

function buildColumn(
  cd: ColumnDef,
  schemaName: string,
  tableName: string,
  primaryKeyColNames: string[],
  pendingFKInfos: PendingFKInfo[],
  pendingIndexParts: Array<{ part: IndexPart; columnKey: string }>,
  tableInlineIndexes: Index[],
): Column {
  const colName = cd.colname ?? 'unknown'
  const tn = cd.typeName
  const baseType = tn ? mapTypeName(tn) : unsupportedType('unknown')

  let nullability: boolean | undefined
  const attrs: Attr[] = []
  let defaultExpr: Expr | undefined

  const constraints = cd.constraints ?? []

  for (const conNode of constraints) {
    const con = (conNode as Record<string, unknown>)['Constraint'] as Constraint | undefined
    if (!con) continue
    const ct = con.contype as string | undefined

    if (ct === 'CONSTR_NOTNULL') {
      nullability = false
    } else if (ct === 'CONSTR_NULL') {
      nullability = true
    } else if (ct === 'CONSTR_DEFAULT') {
      const re = con.raw_expr as Node | undefined
      if (re) defaultExpr = nodeToExpr(re)
    } else if (ct === 'CONSTR_CHECK') {
      const re = con.raw_expr as Node | undefined
      const expr = re ? exprToString(re) : ''
      attrs.push(newCheck(expr, con.conname))
    } else if (ct === 'CONSTR_PRIMARY') {
      primaryKeyColNames.push(colName)
    } else if (ct === 'CONSTR_UNIQUE') {
      const idx: Index = {
        kind: ObjectKind.Index,
        ...(con.conname ? { name: con.conname } : {}),
        unique: true,
        parts: [{ seqNo: 0 }],  // part.c resolved in pass 2
      }
      pendingIndexParts.push({ part: idx.parts![0] as IndexPart, columnKey: `${schemaName}.${tableName}.${colName}` })
      tableInlineIndexes.push(idx)
    } else if (ct === 'CONSTR_FOREIGN') {
      const pktable = con.pktable as { relname?: string; schemaname?: string } | undefined
      const refTable = pktable?.relname ?? ''
      const refSchema = pktable?.schemaname ?? schemaName
      const fkAttrs = (con.fk_attrs as Node[] | undefined) ?? []
      const pkAttrs = (con.pk_attrs as Node[] | undefined) ?? []
      const refColNames = pkAttrs.map(n => strVal(n) ?? '').filter(Boolean)
      const onDelete = con.fk_del_action ? fkAction(con.fk_del_action as string) : undefined
      const onUpdate = con.fk_upd_action ? fkAction(con.fk_upd_action as string) : undefined
      // Build FK with empty columns[] — will add this column after creation
      pendingFKInfos.push({
        symbol: con.conname,
        columns: [],    // filled after column is created
        refTableKey: `${refSchema}.${refTable}`,
        refColumnNames: refColNames,
        onUpdate,
        onDelete,
      })
    } else if (ct === 'CONSTR_GENERATED') {
      const re = con.raw_expr as Node | undefined
      const genWhen = (con as Record<string, unknown>)['generated_when'] as string | undefined
      if (re) {
        attrs.push(generatedExpr(exprToString(re), 'STORED'))
      }
    } else if (ct === 'CONSTR_IDENTITY') {
      const genWhen = (con as Record<string, unknown>)['generated_when'] as string | undefined
      const generation = genWhen === 'a' ? 'ALWAYS' : 'BY DEFAULT'
      const options = (con as Record<string, unknown>)['options'] as Node[] | undefined
      let seqStart: number | undefined
      let seqIncrement: number | undefined
      if (options) {
        for (const opt of options) {
          const de = (opt as Record<string, unknown>)['DefElem'] as Record<string, unknown> | undefined
          if (!de) continue
          const name = de['defname'] as string | undefined
          const arg = de['arg'] as Node | undefined
          const v = arg ? constIval(arg) : undefined
          if (name === 'start' && v !== undefined) seqStart = v
          if (name === 'increment' && v !== undefined) seqIncrement = v
        }
      }
      attrs.push({
        kind: PgAttrKind.Identity,
        generation,
        ...(seqStart !== undefined && { seqStart }),
        ...(seqIncrement !== undefined && { seqIncrement }),
      } as Attr)
    } else if (ct === 'CONSTR_COLLATION') {
      // handled below via collClause
    }
  }

  // COLLATE clause
  if (cd.collClause) {
    const collname = ((cd.collClause as Record<string, unknown>)['collname'] as Node[] | undefined)?.[0]
    const v = collname ? strVal(collname) : undefined
    if (v) attrs.push(collation(v))
  }

  const colType: ColumnType = {
    type: baseType,
    ...(nullability !== undefined ? { null: nullability } : {}),
  }

  const col = newColumn(colName, {
    type: colType,
    ...(defaultExpr !== undefined && { default: defaultExpr }),
    ...(attrs.length > 0 && { attrs }),
  })

  return col
}

// ── main handler ──────────────────────────────────────────────────────────────

export function handleCreateTable(
  stmt: CreateStmt,
  rawStmt: RawStmt,
  schemaName: string,
  acc: SchemaAccumulator,
  onError: (e: DdlNonFatalError) => void,
): void {
  const rel = stmt.relation
  if (!rel) return

  const tableName = rel.relname ?? 'unknown'
  const tableSchema = rel.schemaname ?? schemaName

  const tableKey = `${tableSchema}.${tableName}`
  const stmtRange_ = stmtRangeOf(rawStmt)

  // Check duplicate
  if (acc.tableRegistry.has(tableKey)) {
    onError({
      kind: DdlErrorKind.DuplicateObject,
      objectKind: 'Table',
      qualifiedName: tableKey,
      message: `Duplicate table: ${tableKey}`,
      ...(stmtRange_ && { range: stmtRange_ }),
    })
    return
  }

  const tableElts = stmt.tableElts ?? []

  // Check for PARTITION OF (out of scope)
  if (stmt.partbound) {
    onError({
      kind: DdlErrorKind.OutOfScopeStatement,
      statementType: 'CreateStmt(PARTITION OF)',
      message: 'CREATE TABLE ... PARTITION OF is not supported',
      ...(stmtRange_ && { range: stmtRange_ }),
    })
    return
  }

  // Separate columns, table-level constraints, and LIKE clauses
  const columnDefs: ColumnDef[] = []
  const tableConstraints: Constraint[] = []
  let likeSources: TableLikeClause[] = []

  for (const elt of tableElts) {
    const e = elt as Record<string, unknown>
    if (e['ColumnDef']) {
      columnDefs.push(e['ColumnDef'] as ColumnDef)
    } else if (e['Constraint']) {
      tableConstraints.push(e['Constraint'] as Constraint)
    } else if (e['TableLikeClause']) {
      likeSources.push(e['TableLikeClause'] as TableLikeClause)
    }
  }

  const primaryKeyColNames: string[] = []
  const pendingFKInfos: PendingFKInfo[] = []
  const inlinePendingIndexParts: Array<{ part: IndexPart; columnKey: string }> = []
  const inlineIndexes: Index[] = []

  // Build columns
  const columns: Column[] = []
  for (const cd of columnDefs) {
    const col = buildColumn(
      cd,
      tableSchema,
      tableName,
      primaryKeyColNames,
      pendingFKInfos,
      inlinePendingIndexParts,
      inlineIndexes,
    )
    // Attach inline FK columns reference
    const lastFKInfo = pendingFKInfos[pendingFKInfos.length - 1]
    if (lastFKInfo && lastFKInfo.columns.length === 0) {
      lastFKInfo.columns.push(col)
    }
    columns.push(col)
  }

  // Table-level constraints
  let tablePrimaryKey: Index | undefined
  const tableIndexes: Index[] = [...inlineIndexes]
  const tableFKInfos: PendingFKInfo[] = []
  const tableAttrs: Attr[] = []
  const tableObjects: SchemaObject[] = []

  for (const con of tableConstraints) {
    const ct = con.contype as string | undefined

    if (ct === 'CONSTR_PRIMARY') {
      const keys = (con.keys as Node[] | undefined) ?? []
      const pkColNames = keys.map(n => strVal(n) ?? '').filter(Boolean)
      const pkCols = pkColNames.map(name => columns.find(c => c.name === name)).filter(Boolean) as Column[]
      tablePrimaryKey = newPrimaryKey(pkCols)
      if (con.conname) {
        // Named PK — store as attrs on the index
        const namedPk: Index = { ...tablePrimaryKey, name: con.conname }
        tablePrimaryKey = namedPk
      }
    } else if (ct === 'CONSTR_UNIQUE') {
      const keys = (con.keys as Node[] | undefined) ?? []
      const colNames = keys.map(n => strVal(n) ?? '').filter(Boolean)
      const including = (con.including as Node[] | undefined) ?? []
      const includeColNames = including.map(n => strVal(n) ?? '').filter(Boolean)
      const attrs: Attr[] = []
      if (includeColNames.length > 0) {
        attrs.push({ kind: PgAttrKind.IndexInclude, columns: includeColNames } as Attr)
      }
      if (con.nulls_not_distinct) {
        attrs.push({ kind: PgAttrKind.IndexNullsDistinct, V: false } as Attr)
      }
      const idxParts: IndexPart[] = colNames.map((_, i) => ({ seqNo: i }))
      const idx: Index = {
        kind: ObjectKind.Index,
        ...(con.conname ? { name: con.conname } : {}),
        unique: true,
        ...(attrs.length > 0 && { attrs }),
        parts: idxParts,
      }
      // Register parts for column resolution
      for (let i = 0; i < colNames.length; i++) {
        inlinePendingIndexParts.push({ part: idxParts[i], columnKey: `${tableSchema}.${tableName}.${colNames[i]}` })
      }
      tableIndexes.push(idx)
    } else if (ct === 'CONSTR_FOREIGN') {
      const pktable = con.pktable as { relname?: string; schemaname?: string } | undefined
      const refTable = pktable?.relname ?? ''
      const refSchema = pktable?.schemaname ?? tableSchema
      const fkAttrs = (con.fk_attrs as Node[] | undefined) ?? []
      const pkAttrs = (con.pk_attrs as Node[] | undefined) ?? []
      const fkColNames = fkAttrs.map(n => strVal(n) ?? '').filter(Boolean)
      const refColNames = pkAttrs.map(n => strVal(n) ?? '').filter(Boolean)
      const onDelete = con.fk_del_action ? fkAction(con.fk_del_action as string) : undefined
      const onUpdate = con.fk_upd_action ? fkAction(con.fk_upd_action as string) : undefined
      const fkCols = fkColNames.map(name => columns.find(c => c.name === name)).filter(Boolean) as Column[]
      tableFKInfos.push({
        symbol: con.conname,
        columns: fkCols,
        refTableKey: `${refSchema}.${refTable}`,
        refColumnNames: refColNames,
        onUpdate,
        onDelete,
      })
    } else if (ct === 'CONSTR_CHECK') {
      const re = con.raw_expr as Node | undefined
      const expr = re ? exprToString(re) : ''
      tableAttrs.push(newCheck(expr, con.conname))
    } else if (ct === 'CONSTR_EXCLUSION') {
      tableObjects.push({
        kind: PgObjectKind.ExcludeConstraint,
        ...(con.conname !== undefined && { name: con.conname }),
        method: con.access_method,
        exclusions: con.exclusions,
      } as SchemaObject)
    }
  }

  // Handle inline primary key columns
  if (primaryKeyColNames.length > 0 && !tablePrimaryKey) {
    const pkCols = primaryKeyColNames.map(name => columns.find(c => c.name === name)).filter(Boolean) as Column[]
    tablePrimaryKey = newPrimaryKey(pkCols)
  }

  // Table-level storage/partition/inherit attrs
  if (stmt.partspec) {
    const ps = stmt.partspec as Record<string, unknown>
    const strategy = ps['strategy'] as string | undefined
    const T = strategy === 'PARTITION_STRATEGY_RANGE' ? 'RANGE'
      : strategy === 'PARTITION_STRATEGY_LIST' ? 'LIST'
        : 'HASH'
    const params = (ps['partParams'] as Node[] | undefined) ?? []
    const parts = params.map(p => {
      const pe = (p as Record<string, unknown>)['PartitionElem'] as Record<string, unknown> | undefined
      if (!pe) return undefined
      if (pe['name']) return { type: 'column', name: pe['name'] }
      if (pe['expr']) return { type: 'expr', expr: exprToString(pe['expr'] as Node) }
      return undefined
    }).filter(Boolean)
    tableAttrs.push({ kind: PgAttrKind.Partition, T, parts } as Attr)
  }

  if (stmt.inhRelations && stmt.inhRelations.length > 0) {
    const parents = stmt.inhRelations.map(r => {
      const rv = (r as Record<string, unknown>)['RangeVar'] as Record<string, unknown> | undefined
      return rv?.['relname'] as string | undefined
    }).filter(Boolean) as string[]
    tableAttrs.push({ kind: PgAttrKind.Inherits, parents } as Attr)
  }

  if (stmt.options && stmt.options.length > 0) {
    const params: Record<string, string> = {}
    for (const opt of stmt.options) {
      const de = (opt as Record<string, unknown>)['DefElem'] as Record<string, unknown> | undefined
      if (!de) continue
      const name = de['defname'] as string | undefined
      const arg = de['arg'] as Node | undefined
      if (name && arg) params[name] = deparseSync(arg as Record<string, unknown>)
    }
    if (Object.keys(params).length > 0) {
      tableAttrs.push({ kind: PgAttrKind.StorageParams, params } as Attr)
    }
  }

  // Build all ForeignKey objects (no refTable/refColumns yet)
  const allFKInfos = [...pendingFKInfos, ...tableFKInfos]
  const foreignKeys: ForeignKey[] = allFKInfos.map(info =>
    newForeignKey(info.symbol, {
      columns: info.columns,
      onUpdate: info.onUpdate,
      onDelete: info.onDelete,
    })
  )

  // Build the table
  const table: Table = {
    kind: ObjectKind.Table,
    name: tableName,
    ...(columns.length > 0 && { columns }),
    ...(tableIndexes.length > 0 && { indexes: tableIndexes }),
    ...(tablePrimaryKey && { primaryKey: tablePrimaryKey }),
    ...(foreignKeys.length > 0 && { foreignKeys }),
    ...(tableAttrs.length > 0 && { attrs: tableAttrs }),
    ...(tableObjects.length > 0 && { objects: tableObjects }),
  }

  // Register
  acc.registerTable(tableSchema, table)
  for (const col of columns) {
    acc.registerColumn(tableSchema, tableName, col)
  }

  // Register named inline/constraint unique indexes for COMMENT ON INDEX lookup
  for (const idx of tableIndexes) {
    if (idx.name) {
      acc.indexRegistry.set(`${tableSchema}.${idx.name}`, idx)
    }
  }

  // Register pending FK resolutions
  for (let i = 0; i < allFKInfos.length; i++) {
    const info = allFKInfos[i]
    const fk = foreignKeys[i]
    acc.pendingFKs.push({
      fk,
      tableKey,
      refTableKey: info.refTableKey,
      refColumnNames: info.refColumnNames,
    })
  }

  // Register pending index part resolutions
  for (const pip of inlinePendingIndexParts) {
    acc.pendingIndexParts.push(pip)
  }

  // Handle LIKE
  if (likeSources.length > 0) {
    for (const like of likeSources) {
      const likeRel = like.relation as { relname?: string; schemaname?: string } | undefined
      if (!likeRel) continue
      const srcTable = likeRel.relname ?? ''
      const srcSchema = likeRel.schemaname ?? tableSchema
      const sourceKey = `${srcSchema}.${srcTable}`
      acc.pendingLikes.push({
        table,
        tableKey,
        sourceKey,
        ...(stmtRange_ && { stmtRange: stmtRange_ }),
      })
    }
  }
}

