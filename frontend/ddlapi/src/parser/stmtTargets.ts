// Private module — derives, for each supported statement, the object it defines
// and (for comments) the object it targets. Shared by the table-DDL extractor so
// its qualified-name keys match buildFromDdl / the stmtHandlers exactly.
//
// Key format mirrors the handlers: "schema.table", "schema.table.column",
// "schema.typeOrIndex". Identifier strings come from strVal() (already folded by
// the parser's lexer), so keys match PostgreSQL name resolution.

import type { RawStmt, Node, CreateStmt, CommentStmt, Constraint } from '@pgsql/types'
import { strVal, stmtRangeOf, unwrapNode, stmtBody } from './astHelpers'
import { stmtTypeName } from './pgParser'
import { PgNode, PgConstrType, PgCommentObject } from './pgAst'
import type { SupportedStmtType } from './supportedStatements'
import type { SourceRange } from './positions'

// ── descriptor types ─────────────────────────────────────────────────────────

/** Discriminant values for CommentTarget. */
export const CommentTargetKind = {
  Table: 'table',
  Column: 'column',
  TableConstraint: 'tableConstraint',
  Index: 'index',
  Type: 'type',
  /** COMMENT targets buildFromDdl ignores (schema, function, …) — never table-relevant. */
  Other: 'other',
} as const

/** Discriminant values for DefinedObject. */
export const DefinedObjectKind = {
  Table: 'table',
  Index: 'index',
  Trigger: 'trigger',
  Type: 'type',
  Comment: 'comment',
} as const

/** A foreign-key reference declared in a CREATE TABLE. */
export interface ForeignKeyRef {
  /** Qualified key of the referenced table. */
  refTableKey: string
  /** Constraint name, when the DDL named it. */
  symbol?: string
}

/** What a COMMENT ON statement is about (only the targets buildFromDdl resolves). */
export type CommentTarget =
  | { kind: typeof CommentTargetKind.Table; tableKey: string }
  | { kind: typeof CommentTargetKind.Column; tableKey: string; column: string }
  | { kind: typeof CommentTargetKind.TableConstraint; tableKey: string; constraint: string }
  | { kind: typeof CommentTargetKind.Index; indexKey: string }
  | { kind: typeof CommentTargetKind.Type; typeKey: string }
  | { kind: typeof CommentTargetKind.Other }

/** The object a supported statement introduces (or, for comments, targets). */
export type DefinedObject =
  | {
    kind: typeof DefinedObjectKind.Table
    key: string
    likeSources?: string[]
    foreignKeys?: ForeignKeyRef[]
    /** Names of indexes implicitly created by named UNIQUE constraints (for COMMENT ON INDEX). */
    constraintIndexNames?: string[]
  }
  | { kind: typeof DefinedObjectKind.Index; indexKey?: string; targetTable: string }
  | { kind: typeof DefinedObjectKind.Trigger; targetTable: string }
  | { kind: typeof DefinedObjectKind.Type; key: string }
  | { kind: typeof DefinedObjectKind.Comment; target: CommentTarget }

export interface StatementDescriptor {
  rawIndex: number
  type: SupportedStmtType
  defines: DefinedObject
  range?: SourceRange
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extracts String svals from a { List: { items: [...] } } node (COMMENT object lists). */
function listStrings(node: Node | undefined): string[] {
  const list = unwrapNode(node, PgNode.List)
  if (!list?.items) return []
  return list.items.map(n => strVal(n) ?? '').filter(Boolean)
}

/** Qualified key from a dotted-name parts array: [..., schema?, name]. */
function keyFromParts(parts: string[], defaultSchema: string): string | undefined {
  if (parts.length === 0) return undefined
  const name = parts[parts.length - 1]!
  const schema = parts.length > 1 ? parts[parts.length - 2]! : defaultSchema
  return `${schema}.${name}`
}

/** Qualified key from a list of String nodes (typeName / domainname). */
function keyFromNameNodes(nodes: Node[], defaultSchema: string): string | undefined {
  const name = strVal(nodes[nodes.length - 1])
  if (!name) return undefined
  const schema = nodes.length > 1 ? (strVal(nodes[nodes.length - 2]) ?? defaultSchema) : defaultSchema
  return `${schema}.${name}`
}

// ── per-statement target resolution ────────────────────────────────────────────

/** Extracts every foreign-key reference (inline column + table-level) from a CREATE TABLE. */
function foreignKeysOf(stmt: CreateStmt, defaultSchema: string): ForeignKeyRef[] {
  const out: ForeignKeyRef[] = []
  const push = (con: Constraint): void => {
    if (con.contype !== PgConstrType.ForeignKey) return
    const pk = con.pktable
    if (!pk?.relname) return
    out.push({ refTableKey: `${pk.schemaname ?? defaultSchema}.${pk.relname}`, ...(con.conname && { symbol: con.conname }) })
  }
  for (const elt of stmt.tableElts ?? []) {
    const cd = unwrapNode(elt, PgNode.ColumnDef)
    if (cd) {
      for (const conNode of cd.constraints ?? []) {
        const con = unwrapNode(conNode, PgNode.Constraint)
        if (con) push(con)
      }
    } else {
      const con = unwrapNode(elt, PgNode.Constraint)
      if (con) push(con)
    }
  }
  return out
}

/**
 * Names of indexes implicitly created by *named* UNIQUE constraints (inline column
 * and table-level). Mirrors buildFromDdl, which registers these for COMMENT ON INDEX
 * lookup. PRIMARY KEY constraint names are intentionally excluded — buildFromDdl does
 * not register them either.
 */
function constraintIndexNamesOf(stmt: CreateStmt): string[] {
  const out: string[] = []
  const pushUnique = (con: Constraint): void => {
    if (con.contype === PgConstrType.Unique && con.conname) out.push(con.conname)
  }
  for (const elt of stmt.tableElts ?? []) {
    const cd = unwrapNode(elt, PgNode.ColumnDef)
    if (cd) {
      for (const conNode of cd.constraints ?? []) {
        const con = unwrapNode(conNode, PgNode.Constraint)
        if (con) pushUnique(con)
      }
    } else {
      const con = unwrapNode(elt, PgNode.Constraint)
      if (con) pushUnique(con)
    }
  }
  return out
}

/** Extracts the qualified keys of every LIKE source table in a CREATE TABLE (LIKE U …). */
function likeSourcesOf(stmt: CreateStmt, defaultSchema: string): string[] {
  const out: string[] = []
  for (const elt of stmt.tableElts ?? []) {
    const like = unwrapNode(elt, PgNode.TableLikeClause)
    if (like?.relation?.relname) {
      out.push(`${like.relation.schemaname ?? defaultSchema}.${like.relation.relname}`)
    }
  }
  return out
}

function commentTarget(stmt: CommentStmt, defaultSchema: string): CommentTarget {
  const other = { kind: CommentTargetKind.Other } as const
  switch (stmt.objtype) {
    case PgCommentObject.Table: {
      const key = keyFromParts(listStrings(stmt.object), defaultSchema)
      return key ? { kind: CommentTargetKind.Table, tableKey: key } : other
    }
    case PgCommentObject.Column: {
      const parts = listStrings(stmt.object)
      if (parts.length < 2) return other
      const column = parts[parts.length - 1]!
      const tableKey = keyFromParts(parts.slice(0, -1), defaultSchema)
      return tableKey ? { kind: CommentTargetKind.Column, tableKey, column } : other
    }
    case PgCommentObject.TableConstraint: {
      const parts = listStrings(stmt.object)
      if (parts.length < 2) return other
      const constraint = parts[parts.length - 1]!
      const tableKey = keyFromParts(parts.slice(0, -1), defaultSchema)
      return tableKey ? { kind: CommentTargetKind.TableConstraint, tableKey, constraint } : other
    }
    case PgCommentObject.Index: {
      const key = keyFromParts(listStrings(stmt.object), defaultSchema)
      return key ? { kind: CommentTargetKind.Index, indexKey: key } : other
    }
    case PgCommentObject.Type: {
      const tn = unwrapNode(stmt.object, PgNode.TypeName)
      if (!tn?.names || tn.names.length === 0) return other
      const key = keyFromNameNodes(tn.names, defaultSchema)
      return key ? { kind: CommentTargetKind.Type, typeKey: key } : other
    }
    default:
      // OBJECT_SCHEMA, OBJECT_FUNCTION, … — not table-relevant.
      return other
  }
}

/**
 * Describes a supported statement: what it defines (or, for COMMENT, targets).
 * Returns undefined when the statement is not describable (e.g. PARTITION OF
 * table, or a malformed node missing its relation/name).
 */
export function describeStatement(
  rawStmt: RawStmt,
  rawIndex: number,
  defaultSchema: string,
): StatementDescriptor | undefined {
  const type = stmtTypeName(rawStmt) as SupportedStmtType
  const range = stmtRangeOf(rawStmt)
  const base = { rawIndex, type, ...(range && { range }) }

  switch (type) {
    case PgNode.CreateStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CreateStmt)
      const rel = stmt?.relation
      if (!rel?.relname || stmt!.partbound) return undefined // PARTITION OF — out of scope
      const likeSources = likeSourcesOf(stmt!, defaultSchema)
      const foreignKeys = foreignKeysOf(stmt!, defaultSchema)
      const constraintIndexNames = constraintIndexNamesOf(stmt!)
      return {
        ...base,
        defines: {
          kind: DefinedObjectKind.Table,
          key: `${rel.schemaname ?? defaultSchema}.${rel.relname}`,
          ...(likeSources.length > 0 && { likeSources }),
          ...(foreignKeys.length > 0 && { foreignKeys }),
          ...(constraintIndexNames.length > 0 && { constraintIndexNames }),
        },
      }
    }
    case PgNode.IndexStmt: {
      const stmt = stmtBody(rawStmt, PgNode.IndexStmt)
      const rel = stmt?.relation
      if (!rel?.relname) return undefined
      const schema = rel.schemaname ?? defaultSchema
      const targetTable = `${schema}.${rel.relname}`
      return {
        ...base,
        defines: {
          kind: DefinedObjectKind.Index,
          targetTable,
          ...(stmt!.idxname && { indexKey: `${schema}.${stmt!.idxname}` }),
        },
      }
    }
    case PgNode.CreateTrigStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CreateTrigStmt)
      const rel = stmt?.relation
      if (!rel?.relname) return undefined
      return { ...base, defines: { kind: DefinedObjectKind.Trigger, targetTable: `${rel.schemaname ?? defaultSchema}.${rel.relname}` } }
    }
    case PgNode.CommentStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CommentStmt)
      if (!stmt) return undefined
      return { ...base, defines: { kind: DefinedObjectKind.Comment, target: commentTarget(stmt, defaultSchema) } }
    }
    case PgNode.CreateEnumStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CreateEnumStmt)
      const key = stmt ? keyFromNameNodes(stmt.typeName ?? [], defaultSchema) : undefined
      return key ? { ...base, defines: { kind: DefinedObjectKind.Type, key } } : undefined
    }
    case PgNode.CreateRangeStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CreateRangeStmt)
      const key = stmt ? keyFromNameNodes(stmt.typeName ?? [], defaultSchema) : undefined
      return key ? { ...base, defines: { kind: DefinedObjectKind.Type, key } } : undefined
    }
    case PgNode.CreateDomainStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CreateDomainStmt)
      const key = stmt ? keyFromNameNodes(stmt.domainname ?? [], defaultSchema) : undefined
      return key ? { ...base, defines: { kind: DefinedObjectKind.Type, key } } : undefined
    }
    case PgNode.CompositeTypeStmt: {
      const stmt = stmtBody(rawStmt, PgNode.CompositeTypeStmt)
      const tv = stmt?.typevar
      if (!tv?.relname) return undefined
      return { ...base, defines: { kind: DefinedObjectKind.Type, key: `${tv.schemaname ?? defaultSchema}.${tv.relname}` } }
    }
    default:
      return undefined
  }
}
