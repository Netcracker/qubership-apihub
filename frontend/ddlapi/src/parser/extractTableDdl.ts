// Public entry point for per-table DDL extraction.
// Re-exported from src/index.ts.
//
// Two-phase: prepareDdlExtractor() parses once and builds a reusable index;
// the returned DdlExtractor.extractTable() is cheap and synchronous, designed
// for a consumer iterating over every table in a multi-table DDL.

import type { Node, RawStmt, RangeVar, TypeName } from '@pgsql/types'
import { PG_DEFAULT_SCHEMA } from '../postgres.constants'
import type { SourceRange } from './positions'
import { parseStatements, stmtTypeName } from './pgParser'
import { SUPPORTED_STMT_TYPE_SET } from './supportedStatements'
import {
  describeStatement, CommentTargetKind, DefinedObjectKind,
  type StatementDescriptor, type ForeignKeyRef,
} from './stmtTargets'
import { stmtRangeOf, unwrapNode, stmtBody } from './astHelpers'
import { PgNode } from './pgAst'
import { rawTypeName } from './typeMapper'
import { isKnownTypeName } from './knownTypeNames'
import { DdlParseError } from './buildFromDdl'
import { resolveSpans, detectNewline, assembleSlice, type ResolvedSpan } from './spanEngine'

// ── Public types ────────────────────────────────────────────────────────────────

/** A schema-qualified table identity, using normalized model identifiers. */
export interface TableRef {
  schema: string
  name: string
}

/** Discriminant values for DdlExtractorWarning. */
export const DdlExtractorWarningKind = {
  /** An FK references a table deliberately not included in the slice. */
  OmittedForeignKeyTarget: 'OmittedForeignKeyTarget',
  /** A statement unsupported by buildFromDdl named the table and was dropped. */
  OutOfScopeStatementDropped: 'OutOfScopeStatementDropped',
  /** A type reference resolved to nothing and is not a known builtin/extension. */
  UnresolvedTypeReference: 'UnresolvedTypeReference',
  /** The table is defined more than once; the first definition is used. */
  DuplicateTable: 'DuplicateTable',
} as const

/**
 * Non-fatal note attached to a TableDdlSlice. Payloads carry structured targets
 * (not flattened strings) and a source range wherever one is available.
 */
export type DdlExtractorWarning =
  | {
    kind: typeof DdlExtractorWarningKind.OmittedForeignKeyTarget
    /** The FK's referenced table. */
    refTable: TableRef
    /** FK constraint name, when the DDL named it. */
    symbol?: string
    /** Range of the FK clause / owning CREATE TABLE, when resolvable. */
    range?: SourceRange
  }
  | {
    kind: typeof DdlExtractorWarningKind.OutOfScopeStatementDropped
    /** AST node type, e.g. 'AlterTableStmt'. */
    statementType: string
    range: SourceRange
  }
  | {
    kind: typeof DdlExtractorWarningKind.UnresolvedTypeReference
    /** As written, possibly schema-qualified, e.g. 'audit.mood' or 'mood'. */
    typeName: string
  }
  | {
    kind: typeof DdlExtractorWarningKind.DuplicateTable
    /** The duplicated table identity. */
    table: TableRef
    /** Range of each ignored redefinition, when resolvable. */
    range?: SourceRange
  }

/** The extracted DDL subset relevant to one table. */
export interface TableDdlSlice {
  /** Echoes the requested table identity. */
  table: TableRef
  /** The extracted DDL text. */
  sql: string
  /** Machine-readable notes about deliberately-omitted dependencies, etc. */
  warnings: readonly DdlExtractorWarning[]
}

export interface DdlExtractor {
  /** Every table discovered (only CREATE TABLE'd tables), in source order. */
  tables(): readonly TableRef[]

  /**
   * Returns the minimal DDL subset relevant to `table`, copied verbatim from the
   * original source. Synchronous and cheap — call once per table.
   *
   * Returns `undefined` for a *lookup miss* — a table with no CREATE TABLE in the
   * DDL. This is NOT an extraction failure: all hard failures happen in
   * `prepareDdlExtractor` (which throws); every non-fatal issue is a `warning`.
   */
  extractTable(table: TableRef): TableDdlSlice | undefined
}

// ── Internal state ──────────────────────────────────────────────────────────────

function tableKey(schema: string, name: string): string {
  return `${schema}.${name}`
}

/** Schema segment of a "schema.name" key. */
function schemaOf(key: string): string {
  return key.slice(0, key.indexOf('.'))
}

/**
 * Schema that scopes bare type names referenced by a statement (matching
 * buildFromDdl's referenceResolver): a table/type by its own schema, an
 * index/trigger by its target table's schema. Comments carry no type refs.
 */
function owningSchemaOf(d: StatementDescriptor): string | undefined {
  switch (d.defines.kind) {
    case DefinedObjectKind.Table:
    case DefinedObjectKind.Type:
      return schemaOf(d.defines.key)
    case DefinedObjectKind.Index:
    case DefinedObjectKind.Trigger:
      return schemaOf(d.defines.targetTable)
    default:
      return undefined
  }
}

/** A user-type reference found in a statement's AST. */
export interface TypeRef {
  /** Resolved "schema.type" key (bare names scoped to the owning schema — no public fallback). */
  key: string
  /** The type name as written (sans pg_catalog), e.g. 'audit.mood' or 'mood'. For diagnostics. */
  rawName: string
}

/**
 * A TypeName payload is detected structurally — it carries a `names` array and a
 * `typemod` field. This catches both the wrapped form (`{ TypeName: payload }`,
 * e.g. a range subtype or COMMENT ON TYPE) and the direct form (a `typeName`
 * field holding the payload, e.g. ColumnDef / TypeCast), because the recursion
 * reaches the payload object either way.
 */
function isTypeNamePayload(obj: Record<string, unknown>): boolean {
  return Array.isArray(obj['names']) && 'typemod' in obj
}

/**
 * Collects every user-type reference in a statement's AST by finding all TypeName
 * payloads — covering declared positions (column/field/base/subtype) AND
 * expression casts (TypeCast). Bare names are scoped to `owningSchema`, matching
 * buildFromDdl's referenceResolver (no public/search_path fallback).
 */
function collectTypeRefs(node: unknown, owningSchema: string, out: TypeRef[]): void {
  if (Array.isArray(node)) {
    for (const el of node) collectTypeRefs(el, owningSchema, out)
    return
  }
  if (!node || typeof node !== 'object') return

  const obj = node as Record<string, unknown>
  if (isTypeNamePayload(obj)) {
    const rawName = rawTypeName(obj as unknown as TypeName)
    if (rawName && rawName !== 'unknown') {
      out.push({ key: rawName.includes('.') ? rawName : `${owningSchema}.${rawName}`, rawName })
    }
  }
  for (const k of Object.keys(obj)) collectTypeRefs(obj[k], owningSchema, out)
}

/** Indexed state shared across all extractTable() calls — built once by prepareDdlExtractor. */
export interface DdlIndex {
  buf: Buffer
  spans: readonly ResolvedSpan[]
  newline: '\n' | '\r\n'
  /** Every supported statement's descriptor, in source order. */
  descriptors: readonly StatementDescriptor[]
  /** table key → statement index of the first CREATE TABLE for that key. */
  tableStmtIndex: ReadonlyMap<string, number>
  /** Discovered tables (first definition wins), in source order. */
  tableOrder: readonly TableRef[]
  /** table key → CREATE INDEX / COMMENT / CREATE TRIGGER descriptors owned by that table. */
  ownedByTable: ReadonlyMap<string, readonly StatementDescriptor[]>
  /** type key → statement index of the first CREATE TYPE/DOMAIN for that key. */
  typeStmtIndex: ReadonlyMap<string, number>
  /** statement index (table or type def) → the user-type references in its AST. */
  typeRefsByStmt: ReadonlyMap<number, readonly TypeRef[]>
  /** type key → COMMENT ON TYPE descriptors for that type. */
  commentsByType: ReadonlyMap<string, readonly StatementDescriptor[]>
  /** table key → keys of its LIKE source tables (CREATE TABLE T (LIKE U …)). */
  likeSourcesByTable: ReadonlyMap<string, readonly string[]>
  /** table key → warning-relevant metadata (FKs, redefinitions, owning range). */
  tableMeta: ReadonlyMap<string, TableMeta>
  /** table key → unsupported statements that named it and were dropped. */
  droppedByTable: ReadonlyMap<string, readonly DroppedStatement[]>
}

interface TableMeta {
  range?: SourceRange
  foreignKeys: readonly ForeignKeyRef[]
  /** Ranges of any ignored redefinitions of this table (first definition wins). */
  duplicateRanges: readonly (SourceRange | undefined)[]
}

interface DroppedStatement {
  statementType: string
  range: SourceRange
}

/** As-written RangeVar → qualified key; accepts the wrapped or direct node form. */
function rangeVarKey(node: unknown, defaultSchema: string): string | undefined {
  const rv = unwrapNode(node as Node | undefined, PgNode.RangeVar) ?? (node as RangeVar | undefined)
  if (!rv?.relname) return undefined
  return `${rv.schemaname ?? defaultSchema}.${rv.relname}`
}

/** Best-effort target relation keys of an unsupported statement (for the dropped-statement warning). */
function droppedRelationKeys(body: Record<string, unknown>, defaultSchema: string): string[] {
  const out: string[] = []
  const single = rangeVarKey(body['relation'], defaultSchema)
  if (single) out.push(single)
  const rels = body['relations']
  if (Array.isArray(rels)) {
    for (const r of rels) {
      const key = rangeVarKey(r, defaultSchema)
      if (key) out.push(key)
    }
  }
  return out
}

/** Builds the table-ownership map: every statement directly owned by a table. */
function buildOwnedByTable(descriptors: readonly StatementDescriptor[]): Map<string, StatementDescriptor[]> {
  // index key (schema.indexName) → owning table, from standalone CREATE INDEX and
  // from named UNIQUE constraints that implicitly create an index.
  const indexKeyToTable = new Map<string, string>()
  for (const d of descriptors) {
    if (d.defines.kind === DefinedObjectKind.Index && d.defines.indexKey) {
      indexKeyToTable.set(d.defines.indexKey, d.defines.targetTable)
    } else if (d.defines.kind === DefinedObjectKind.Table && d.defines.constraintIndexNames) {
      const schema = schemaOf(d.defines.key)
      for (const name of d.defines.constraintIndexNames) {
        indexKeyToTable.set(`${schema}.${name}`, d.defines.key)
      }
    }
  }

  const owned = new Map<string, StatementDescriptor[]>()
  const add = (tableKey: string, d: StatementDescriptor): void => {
    const list = owned.get(tableKey)
    if (list) list.push(d)
    else owned.set(tableKey, [d])
  }

  for (const d of descriptors) {
    switch (d.defines.kind) {
      case DefinedObjectKind.Index:
      case DefinedObjectKind.Trigger:
        add(d.defines.targetTable, d)
        break
      case DefinedObjectKind.Comment: {
        const t = d.defines.target
        if (t.kind === CommentTargetKind.Table || t.kind === CommentTargetKind.Column || t.kind === CommentTargetKind.TableConstraint) {
          add(t.tableKey, d)
        } else if (t.kind === CommentTargetKind.Index) {
          const tableKey = indexKeyToTable.get(t.indexKey)
          if (tableKey) add(tableKey, d)
        }
        // CommentTargetKind.Type is handled by the type closure; Other is ignored.
        break
      }
      // Table definitions are seeded directly; nothing to own here.
    }
  }
  return owned
}

/**
 * Computes the set of statement indices relevant to the root table: the table
 * itself plus everything it owns (indexes, triggers, table-owned comments) plus
 * the transitive closure of the user types it references (and their COMMENT ON
 * TYPE statements).
 *
 * Implemented as worklists over table keys and type keys so later tasks can
 * extend it — LIKE-source closure pushes more table keys. The `seenTables` /
 * `seenTypes` sets guard against cycles and de-duplicate.
 */
interface Selection {
  /** Statement indices to emit. */
  selected: Set<number>
  /** Table keys actually included (defined here and pulled into the slice). */
  includedTables: Set<string>
}

function selectForTable(index: DdlIndex, rootKey: string): Selection {
  const selected = new Set<number>()
  const includedTables = new Set<string>()
  const seenTables = new Set<string>()
  const seenTypes = new Set<string>()
  const tableQueue: string[] = [rootKey]
  const typeQueue: string[] = []

  const enqueueTypeRefs = (stmtIndex: number): void => {
    for (const ref of index.typeRefsByStmt.get(stmtIndex) ?? []) {
      if (index.typeStmtIndex.has(ref.key)) typeQueue.push(ref.key)
    }
  }

  while (tableQueue.length > 0 || typeQueue.length > 0) {
    if (tableQueue.length > 0) {
      const tk = tableQueue.pop()!
      if (seenTables.has(tk)) continue
      seenTables.add(tk)

      const tableStmt = index.tableStmtIndex.get(tk)
      if (tableStmt === undefined) continue // table not defined here (e.g. an absent LIKE source)
      selected.add(tableStmt)
      includedTables.add(tk)

      for (const d of index.ownedByTable.get(tk) ?? []) {
        selected.add(d.rawIndex)
        enqueueTypeRefs(d.rawIndex) // index expressions / trigger WHEN casts may reference types
      }
      enqueueTypeRefs(tableStmt)
      // LIKE sources are pulled in as full closures (their own indexes/types/…),
      // since the table is unbuildable without them. seenTables guards cycles.
      for (const src of index.likeSourcesByTable.get(tk) ?? []) tableQueue.push(src)
      continue
    }

    const tyKey = typeQueue.pop()!
    if (seenTypes.has(tyKey)) continue
    seenTypes.add(tyKey)

    const typeStmt = index.typeStmtIndex.get(tyKey)
    if (typeStmt === undefined) continue // not defined here (builtin / external / unresolved)
    selected.add(typeStmt)

    for (const d of index.commentsByType.get(tyKey) ?? []) selected.add(d.rawIndex)
    enqueueTypeRefs(typeStmt) // transitive: composite field types, domain base, range subtype, casts
  }

  return { selected, includedTables }
}

/** Splits a "schema.name" key into a TableRef (schema is the first segment). */
function refFromKey(key: string): TableRef {
  const dot = key.indexOf('.')
  return { schema: key.slice(0, dot), name: key.slice(dot + 1) }
}

/** Derives the per-slice warnings from the computed selection. */
function collectWarnings(index: DdlIndex, sel: Selection): DdlExtractorWarning[] {
  const warnings: DdlExtractorWarning[] = []

  for (const tk of sel.includedTables) {
    const meta = index.tableMeta.get(tk)
    if (meta) {
      // FK to a table that was deliberately not included.
      for (const fk of meta.foreignKeys) {
        if (!sel.includedTables.has(fk.refTableKey)) {
          warnings.push({
            kind: DdlExtractorWarningKind.OmittedForeignKeyTarget,
            refTable: refFromKey(fk.refTableKey),
            ...(fk.symbol !== undefined && { symbol: fk.symbol }),
            ...(meta.range && { range: meta.range }),
          })
        }
      }
      // Duplicate definitions of this table (first won).
      for (const range of meta.duplicateRanges) {
        warnings.push({ kind: DdlExtractorWarningKind.DuplicateTable, table: refFromKey(tk), ...(range && { range }) })
      }
    }
    // Unsupported statements that named this table and were dropped.
    for (const dropped of index.droppedByTable.get(tk) ?? []) {
      warnings.push({ kind: DdlExtractorWarningKind.OutOfScopeStatementDropped, statementType: dropped.statementType, range: dropped.range })
    }
  }

  // Type references that resolve to nothing and are not known builtins/extensions.
  const seenUnresolved = new Set<string>()
  for (const stmtIndex of sel.selected) {
    for (const ref of index.typeRefsByStmt.get(stmtIndex) ?? []) {
      if (index.typeStmtIndex.has(ref.key)) continue
      if (isKnownTypeName(ref.rawName)) continue
      if (seenUnresolved.has(ref.rawName)) continue
      seenUnresolved.add(ref.rawName)
      warnings.push({ kind: DdlExtractorWarningKind.UnresolvedTypeReference, typeName: ref.rawName })
    }
  }

  return warnings
}

class DdlExtractorImpl implements DdlExtractor {
  constructor(private readonly index: DdlIndex) { }

  tables(): readonly TableRef[] {
    return this.index.tableOrder
  }

  extractTable(table: TableRef): TableDdlSlice | undefined {
    const key = tableKey(table.schema, table.name)
    if (!this.index.tableStmtIndex.has(key)) return undefined
    const sel = selectForTable(this.index, key)
    const sql = assembleSlice(this.index.buf, this.index.spans, [...sel.selected], this.index.newline)
    return { table, sql, warnings: collectWarnings(this.index, sel) }
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────────

/**
 * Parses the DDL once and builds a reusable extractor. Async because the
 * underlying parser initialises a WASM module on first use.
 *
 * Throws DdlParseError on a hard parse failure (invalid PostgreSQL syntax).
 * No options parameter in v1 — there are no tuning knobs yet.
 */
export async function prepareDdlExtractor(ddl: string): Promise<DdlExtractor> {
  const buf = Buffer.from(ddl, 'utf8')
  const newline = detectNewline(buf)

  // Fast path — empty/whitespace-only input (parseStatements rejects empty input).
  if (!ddl.trim()) {
    return new DdlExtractorImpl({
      buf, spans: [], newline, descriptors: [], tableStmtIndex: new Map(), tableOrder: [],
      ownedByTable: new Map(), typeStmtIndex: new Map(), typeRefsByStmt: new Map(), commentsByType: new Map(),
      likeSourcesByTable: new Map(), tableMeta: new Map(), droppedByTable: new Map(),
    })
  }

  let rawStmts: RawStmt[]
  try {
    rawStmts = await parseStatements(ddl)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new DdlParseError(msg, { cause: err })
  }

  const spans = resolveSpans(
    buf,
    rawStmts.map(s => ({ location: s.stmt_location ?? 0, len: s.stmt_len })),
  )

  // Build a descriptor for every supported statement (in source order); scan
  // unsupported statements for the table they name (dropped-statement warning).
  const descriptors: StatementDescriptor[] = []
  const tableStmtIndex = new Map<string, number>()
  const tableOrder: TableRef[] = []
  const typeStmtIndex = new Map<string, number>()
  const commentsByType = new Map<string, StatementDescriptor[]>()
  const likeSourcesByTable = new Map<string, readonly string[]>()
  const tableMeta = new Map<string, TableMeta & { foreignKeys: ForeignKeyRef[]; duplicateRanges: (SourceRange | undefined)[] }>()
  const droppedByTable = new Map<string, DroppedStatement[]>()

  for (let i = 0; i < rawStmts.length; i++) {
    const typeName = stmtTypeName(rawStmts[i]!)

    if (!SUPPORTED_STMT_TYPE_SET.has(typeName)) {
      const range = stmtRangeOf(rawStmts[i]!)
      const body = stmtBody(rawStmts[i]!, typeName) as Record<string, unknown> | undefined
      if (range && body) {
        for (const key of droppedRelationKeys(body, PG_DEFAULT_SCHEMA)) {
          const list = droppedByTable.get(key)
          const entry = { statementType: typeName, range }
          if (list) list.push(entry)
          else droppedByTable.set(key, [entry])
        }
      }
      continue
    }

    const d = describeStatement(rawStmts[i]!, i, PG_DEFAULT_SCHEMA)
    if (!d) continue
    descriptors.push(d)
    if (d.defines.kind === DefinedObjectKind.Table) {
      if (tableStmtIndex.has(d.defines.key)) {
        // Duplicate — first definition wins; record the ignored redefinition's range.
        tableMeta.get(d.defines.key)?.duplicateRanges.push(d.range)
        continue
      }
      tableStmtIndex.set(d.defines.key, i)
      const dot = d.defines.key.indexOf('.')
      tableOrder.push({ schema: d.defines.key.slice(0, dot), name: d.defines.key.slice(dot + 1) })
      if (d.defines.likeSources) likeSourcesByTable.set(d.defines.key, d.defines.likeSources)
      tableMeta.set(d.defines.key, {
        ...(d.range && { range: d.range }),
        foreignKeys: d.defines.foreignKeys ?? [],
        duplicateRanges: [],
      })
    } else if (d.defines.kind === DefinedObjectKind.Type) {
      if (!typeStmtIndex.has(d.defines.key)) typeStmtIndex.set(d.defines.key, i) // first wins
    } else if (d.defines.kind === DefinedObjectKind.Comment && d.defines.target.kind === CommentTargetKind.Type) {
      const tk = d.defines.target.typeKey
      const list = commentsByType.get(tk)
      if (list) list.push(d)
      else commentsByType.set(tk, [d])
    }
  }

  // Collect the user-type references in each table, type-definition, index, and
  // trigger statement (whole-AST TypeName walk — declared positions and expression
  // casts, including index expressions/predicates and trigger WHEN clauses).
  const typeRefsByStmt = new Map<number, TypeRef[]>()
  for (const d of descriptors) {
    const owningSchema = owningSchemaOf(d)
    if (owningSchema === undefined) continue // comments carry no type refs
    const refs: TypeRef[] = []
    collectTypeRefs(rawStmts[d.rawIndex]!.stmt, owningSchema, refs)
    if (refs.length > 0) typeRefsByStmt.set(d.rawIndex, refs)
  }

  const ownedByTable = buildOwnedByTable(descriptors)

  return new DdlExtractorImpl({
    buf, spans, newline, descriptors, tableStmtIndex, tableOrder, ownedByTable,
    typeStmtIndex, typeRefsByStmt, commentsByType, likeSourcesByTable, tableMeta, droppedByTable,
  })
}
