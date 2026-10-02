// Private module — handles CreateStmt (CREATE TABLE).

import { deparseSync } from 'pgsql-deparser'
import type { CreateStmt, RawStmt, Node, ColumnDef, Constraint, TableLikeClause } from '@pgsql/types'
import { ObjectKind, ReferenceOption, DdlErrorKind } from '../../constants'
import { PgAttrKind, PgObjectKind, PgGeneratedExprType, PgIdentityGeneration, PgPartitionStrategy } from '../../postgres.constants'
import type { Table, Column, ColumnType, Index, IndexPart, ForeignKey, SchemaObject, TableRef } from '../../schema'
import type { Attr } from '../../attrs'
import type { Expr } from '../../exprs'
import {
  newColumn, newCheck, newForeignKey, newPrimaryKey,
  collation, generatedExpr, unsupportedType,
} from '../../factories'
import type { SchemaAccumulator, PendingIndexPart } from '../schemaAccumulator'
import { mapTypeName } from '../typeMapper'
import { strVal, stmtRangeOf, nodeToExpr, exprToString, unwrapNode } from '../astHelpers'
import { PgNode, PgConstrType } from '../pgAst'
import type { DdlNonFatalError } from '../buildFromDdl'

// ── helpers ───────────────────────────────────────────────────────────────────

function constIval(node: Node): number | undefined {
  // libpg-query serialises protobuf, which omits a zero-valued `ival`: the
  // integer 0 (e.g. START WITH 0) arrives with the inner field dropped. The
  // wrapper's presence already proves an integer node, so a missing inner ⇒ 0.
  // A_Const form — used in column defaults, typmods, etc.
  const c = unwrapNode(node, PgNode.A_Const)
  if (c && 'ival' in c) {
    const iv = c.ival?.ival
    return typeof iv === 'number' ? iv : 0
  }
  // Integer form — used in DefElem args (e.g. sequence options START WITH, INCREMENT BY)
  const intNode = unwrapNode(node, PgNode.Integer)
  if (intNode) {
    const iv = intNode.ival
    return typeof iv === 'number' ? iv : 0
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
  columns: string[]       // FK columns (same table)
  refTable: TableRef
  refColumns: string[]
  onUpdate?: ReferenceOption
  onDelete?: ReferenceOption
}

function buildColumn(
  cd: ColumnDef,
  schemaName: string,
  primaryKeyColNames: string[],
  pendingFKInfos: PendingFKInfo[],
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
    const con = unwrapNode(conNode, PgNode.Constraint)
    if (!con) continue
    const ct = con.contype

    if (ct === PgConstrType.NotNull) {
      nullability = false
    } else if (ct === PgConstrType.Null) {
      nullability = true
    } else if (ct === PgConstrType.Default) {
      const re = con.raw_expr
      if (re) defaultExpr = nodeToExpr(re)
    } else if (ct === PgConstrType.Check) {
      const re = con.raw_expr
      const expr = re ? exprToString(re) : ''
      attrs.push(newCheck(expr, con.conname))
    } else if (ct === PgConstrType.PrimaryKey) {
      primaryKeyColNames.push(colName)
    } else if (ct === PgConstrType.Unique) {
      const idx: Index = {
        kind: ObjectKind.Index,
        ...(con.conname ? { name: con.conname } : {}),
        unique: true,
        parts: [{ seqNo: 0, column: colName }],
      }
      tableInlineIndexes.push(idx)
    } else if (ct === PgConstrType.ForeignKey) {
      const pktable = con.pktable
      const refTable = pktable?.relname ?? ''
      const refSchema = pktable?.schemaname ?? schemaName
      const pkAttrs = con.pk_attrs ?? []
      const refColNames = pkAttrs.map(n => strVal(n) ?? '').filter(Boolean)
      const onDelete = con.fk_del_action ? fkAction(con.fk_del_action) : undefined
      const onUpdate = con.fk_upd_action ? fkAction(con.fk_upd_action) : undefined
      pendingFKInfos.push({
        symbol: con.conname,
        columns: [colName],
        refTable: { schema: refSchema, name: refTable },
        refColumns: refColNames,
        onUpdate,
        onDelete,
      })
    } else if (ct === PgConstrType.Generated) {
      const re = con.raw_expr
      const genWhen = con.generated_when
      if (re) {
        attrs.push(generatedExpr(exprToString(re), PgGeneratedExprType.Stored))
      }
    } else if (ct === PgConstrType.Identity) {
      const genWhen = con.generated_when
      const generation = genWhen === 'a' ? PgIdentityGeneration.Always : PgIdentityGeneration.ByDefault
      const options = con.options
      let seqStart: number | undefined
      let seqIncrement: number | undefined
      if (options) {
        for (const opt of options) {
          const de = unwrapNode(opt, PgNode.DefElem)
          if (!de) continue
          const name = de.defname
          const arg = de.arg
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
    }
    // COLLATE is not a constraint (no CONSTR_COLLATION in libpg-query) — it is
    // handled via cd.collClause below.
  }

  // COLLATE clause
  if (cd.collClause) {
    const collname = cd.collClause.collname?.[0]
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
      objectKind: ObjectKind.Table,
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
    const columnDef = unwrapNode(elt, PgNode.ColumnDef)
    const constraint = unwrapNode(elt, PgNode.Constraint)
    const likeClause = unwrapNode(elt, PgNode.TableLikeClause)
    if (columnDef) {
      columnDefs.push(columnDef)
    } else if (constraint) {
      tableConstraints.push(constraint)
    } else if (likeClause) {
      likeSources.push(likeClause)
    }
  }

  const primaryKeyColNames: string[] = []
  const pendingFKInfos: PendingFKInfo[] = []
  const pendingIndexParts: PendingIndexPart[] = []
  const inlineIndexes: Index[] = []

  // Build columns
  const columns: Column[] = []
  for (const cd of columnDefs) {
    columns.push(buildColumn(cd, tableSchema, primaryKeyColNames, pendingFKInfos, inlineIndexes))
  }

  // Table-level constraints
  let tablePrimaryKey: Index | undefined
  const tableIndexes: Index[] = [...inlineIndexes]
  const tableFKInfos: PendingFKInfo[] = []
  const tableAttrs: Attr[] = []
  const tableObjects: SchemaObject[] = []

  for (const con of tableConstraints) {
    const ct = con.contype

    if (ct === PgConstrType.PrimaryKey) {
      const keys = con.keys ?? []
      const pkColNames = keys.map(n => strVal(n) ?? '').filter(Boolean)
      tablePrimaryKey = newPrimaryKey(pkColNames)
      if (con.conname) {
        // Named PK — store as attrs on the index
        const namedPk: Index = { ...tablePrimaryKey, name: con.conname }
        tablePrimaryKey = namedPk
      }
    } else if (ct === PgConstrType.Unique) {
      const keys = con.keys ?? []
      const colNames = keys.map(n => strVal(n) ?? '').filter(Boolean)
      const including = con.including ?? []
      const includeColNames = including.map(n => strVal(n) ?? '').filter(Boolean)
      const attrs: Attr[] = []
      if (includeColNames.length > 0) {
        attrs.push({ kind: PgAttrKind.IndexInclude, columns: includeColNames } as Attr)
      }
      if (con.nulls_not_distinct) {
        // `value` is a descriptive rename of Atlas Go `V`; see ddlapi-authoring.
        attrs.push({ kind: PgAttrKind.IndexNullsDistinct, value: false } as Attr)
      }
      const idxParts: IndexPart[] = colNames.map((column, i) => ({ seqNo: i, column }))
      const idx: Index = {
        kind: ObjectKind.Index,
        ...(con.conname ? { name: con.conname } : {}),
        unique: true,
        ...(attrs.length > 0 && { attrs }),
        parts: idxParts,
      }
      // Pass 2 reports a column that the table does not define
      for (const column of colNames) {
        pendingIndexParts.push({ index: idx, tableKey, column })
      }
      tableIndexes.push(idx)
    } else if (ct === PgConstrType.ForeignKey) {
      const pktable = con.pktable
      const refTable = pktable?.relname ?? ''
      const refSchema = pktable?.schemaname ?? tableSchema
      const fkAttrs = con.fk_attrs ?? []
      const pkAttrs = con.pk_attrs ?? []
      const fkColNames = fkAttrs.map(n => strVal(n) ?? '').filter(Boolean)
      const refColNames = pkAttrs.map(n => strVal(n) ?? '').filter(Boolean)
      const onDelete = con.fk_del_action ? fkAction(con.fk_del_action) : undefined
      const onUpdate = con.fk_upd_action ? fkAction(con.fk_upd_action) : undefined
      tableFKInfos.push({
        symbol: con.conname,
        columns: fkColNames,
        refTable: { schema: refSchema, name: refTable },
        refColumns: refColNames,
        onUpdate,
        onDelete,
      })
    } else if (ct === PgConstrType.Check) {
      const re = con.raw_expr
      const expr = re ? exprToString(re) : ''
      tableAttrs.push(newCheck(expr, con.conname))
    } else if (ct === PgConstrType.Exclusion) {
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
    tablePrimaryKey = newPrimaryKey(primaryKeyColNames)
  }

  // Table-level storage/partition/inherit attrs
  if (stmt.partspec) {
    const strategy = stmt.partspec.strategy
    const partitionType = strategy === 'PARTITION_STRATEGY_RANGE' ? PgPartitionStrategy.Range
      : strategy === 'PARTITION_STRATEGY_LIST' ? PgPartitionStrategy.List
        : PgPartitionStrategy.Hash
    const params = stmt.partspec.partParams ?? []
    const parts = params.map(p => {
      const pe = unwrapNode(p, PgNode.PartitionElem)
      if (!pe) return undefined
      if (pe.name) return { type: 'column', name: pe.name }
      if (pe.expr) return { type: 'expr', expr: exprToString(pe.expr) }
      return undefined
    }).filter(Boolean)
    // `type` is a descriptive rename of Atlas Go `T`; see ddlapi-authoring.
    tableAttrs.push({ kind: PgAttrKind.Partition, type: partitionType, parts } as Attr)
  }

  if (stmt.inhRelations && stmt.inhRelations.length > 0) {
    const parents = stmt.inhRelations.map(r => {
      return unwrapNode(r, PgNode.RangeVar)?.relname
    }).filter(Boolean) as string[]
    tableAttrs.push({ kind: PgAttrKind.Inherits, parents } as Attr)
  }

  if (stmt.options && stmt.options.length > 0) {
    const params: Record<string, string> = {}
    for (const opt of stmt.options) {
      const de = unwrapNode(opt, PgNode.DefElem)
      if (!de) continue
      const name = de.defname
      const arg = de.arg
      if (name && arg) params[name] = deparseSync(arg as Record<string, unknown>)
    }
    if (Object.keys(params).length > 0) {
      tableAttrs.push({ kind: PgAttrKind.StorageParams, params } as Attr)
    }
  }

  const foreignKeys: ForeignKey[] = [...pendingFKInfos, ...tableFKInfos].map(info =>
    newForeignKey(info.symbol, {
      columns: info.columns,
      refTable: info.refTable,
      ...(info.refColumns.length > 0 && { refColumns: info.refColumns }),
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

  // Pass 2 reports the names that the DDL does not define
  for (const fk of foreignKeys) {
    acc.pendingFKs.push({ fk, tableKey })
  }
  if (tablePrimaryKey) {
    for (const part of tablePrimaryKey.parts ?? []) {
      if (part.column !== undefined) {
        pendingIndexParts.push({ index: tablePrimaryKey, tableKey, column: part.column })
      }
    }
  }
  acc.pendingIndexParts.push(...pendingIndexParts)

  // Handle LIKE
  if (likeSources.length > 0) {
    for (const like of likeSources) {
      const likeRel = like.relation
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

