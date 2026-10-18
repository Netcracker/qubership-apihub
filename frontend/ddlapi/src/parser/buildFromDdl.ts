// Public entry point for DDL parsing.
// This file is re-exported from src/index.ts.

import { DdlErrorKind } from '../constants'
import { PG_DEFAULT_SCHEMA } from '../postgres.constants'
import { DDLAPI_VERSION } from '../schema'
import type { SourceRange } from './positions'
import { parseStatements, stmtTypeName } from './pgParser'
import { SUPPORTED_STMT_TYPE_SET, type SupportedStmtType } from './supportedStatements'
import { PgNode } from './pgAst'
import { stmtRangeOf, stmtBody } from './astHelpers'
import { SchemaAccumulator } from './schemaAccumulator'
import { handleCreateTable } from './stmtHandlers/createTable'
import { handleCreateIndex } from './stmtHandlers/createIndex'
import { handleCreateEnum, handleCreateCompositeType, handleCreateRangeType } from './stmtHandlers/createType'
import { handleCreateDomain } from './stmtHandlers/createDomain'
import { handleCreateTrigger } from './stmtHandlers/createTrigger'
import { handleComment } from './stmtHandlers/comment'
import { resolveReferences } from './referenceResolver'
import type { Realm } from '../schema'

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Non-fatal issue emitted via `onError` during a DDL build.
 * `kind` is machine-readable; `message` is human-readable only.
 */
export type DdlNonFatalError =
  | {
    kind: typeof DdlErrorKind.OutOfScopeStatement
    /** AST node type name from libpg-query, e.g. 'AlterTableStmt', 'DropStmt'. */
    statementType: string
    message: string
    range?: SourceRange
  }
  | {
    kind: typeof DdlErrorKind.UnresolvedReference
    /** Qualified name of the object that could not be found, e.g. 'public.customers'. */
    target: string
    message: string
    range?: SourceRange
  }
  | {
    kind: typeof DdlErrorKind.DuplicateObject
    /** 'Table', 'Index', 'EnumType', etc. */
    objectKind: string
    /** Fully-qualified name, e.g. 'public.users'. */
    qualifiedName: string
    message: string
    range?: SourceRange
  }
  | {
    kind: typeof DdlErrorKind.UnresolvedLikeSource
    /** Qualified name of the LIKE'd table being created, e.g. 'public.accounts_log'. */
    table: string
    /** Qualified name of the LIKE source that was not found. */
    likeSource: string
    message: string
    range?: SourceRange
  }

export interface BuildFromDdlOptions {
  /**
   * When true, any non-fatal issue (that would normally call onError) instead throws a
   * DdlBuildError with a `.issues` array after all statements have been processed.
   * onError and strict may coexist: onError fires per-issue, then DdlBuildError is thrown
   * if issues > 0. @default false
   */
  strict?: boolean
  /**
   * Called synchronously for each non-fatal issue during the build.
   * Absence of this callback does NOT imply the returned Realm is complete —
   * use strict: true for pipelines that require completeness.
   */
  onError?: (error: DdlNonFatalError) => void
}

/**
 * Thrown when buildFromDdl encounters a hard parse failure (invalid PostgreSQL syntax).
 */
export class DdlParseError extends Error {
  readonly code = 'DDL_PARSE_ERROR' as const
  readonly cause?: unknown

  constructor(message: string, opts?: { cause?: unknown }) {
    super(message)
    this.name = 'DdlParseError'
    if (opts?.cause !== undefined) {
      Object.defineProperty(this, 'cause', { value: opts.cause, enumerable: false })
    }
  }
}

/**
 * Thrown when strict: true and one or more non-fatal issues were encountered.
 * All issues are collected before throwing (fail-at-end, not fail-fast).
 *
 * The realm is built before the error is thrown, so callers can inspect the
 * partial result from the catch block via `err.realm`.
 */
export class DdlBuildError extends Error {
  readonly code = 'DDL_BUILD_ERROR' as const
  readonly issues: readonly DdlNonFatalError[]
  /** The (partial) Realm built before the error was thrown. */
  readonly realm: Realm

  constructor(issues: readonly DdlNonFatalError[], realm: Realm) {
    super(`DDL build completed with ${issues.length} issue(s)`)
    this.name = 'DdlBuildError'
    this.issues = issues
    this.realm = realm
  }
}

// ── Statement dispatch ────────────────────────────────────────────────────────

/**
 * Compile-time exhaustiveness sentinel: fails to type-check if `x` is not `never`.
 * Guarantees the dispatch switch covers every SupportedStmtType — adding a name to
 * SUPPORTED_STMT_TYPES without a handler case makes the default branch non-`never`.
 */
function assertNever(x: never): never {
  throw new Error(`Unhandled supported statement type: ${String(x)}`)
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Builds a Realm from PostgreSQL DDL.
 *
 * Resolves after WASM init (first call only) and full parse.
 * onError is invoked synchronously during the build, before the promise resolves.
 *
 * Absence of onError does NOT imply the returned Realm is complete.
 * Use strict: true for pipelines that require completeness.
 */
export async function buildFromDdl(ddl: string, options?: BuildFromDdlOptions): Promise<Realm> {
  const strict = options?.strict ?? false
  const onErrorCallback = options?.onError

  const issues: DdlNonFatalError[] = []

  function onError(e: DdlNonFatalError): void {
    issues.push(e)
    onErrorCallback?.(e)
  }

  // Fast path — empty input
  if (!ddl.trim()) {
    return { ddlapi: DDLAPI_VERSION, schemas: [] }
  }

  // Parse all statements (WASM init on first call)
  let rawStmts: Awaited<ReturnType<typeof parseStatements>>
  try {
    rawStmts = await parseStatements(ddl)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new DdlParseError(msg, { cause: err })
  }

  const acc = new SchemaAccumulator()

  // Pass 1 — dispatch each statement to its handler
  for (const rawStmt of rawStmts) {
    const typeName = stmtTypeName(rawStmt)
    const range = stmtRangeOf(rawStmt)

    if (!SUPPORTED_STMT_TYPE_SET.has(typeName)) {
      onError({
        kind: DdlErrorKind.OutOfScopeStatement,
        statementType: typeName || 'unknown',
        message: `Statement type '${typeName || 'unknown'}' is not supported`,
        ...(range && { range }),
      })
      continue
    }

    const supported: SupportedStmtType = typeName as SupportedStmtType
    switch (supported) {
      case PgNode.CreateStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CreateStmt)
        if (stmt) handleCreateTable(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.IndexStmt: {
        const stmt = stmtBody(rawStmt, PgNode.IndexStmt)
        if (stmt) handleCreateIndex(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.CommentStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CommentStmt)
        if (stmt) handleComment(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.CreateDomainStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CreateDomainStmt)
        if (stmt) handleCreateDomain(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.CreateEnumStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CreateEnumStmt)
        if (stmt) handleCreateEnum(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.CompositeTypeStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CompositeTypeStmt)
        if (stmt) handleCreateCompositeType(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.CreateRangeStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CreateRangeStmt)
        if (stmt) handleCreateRangeType(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      case PgNode.CreateTrigStmt: {
        const stmt = stmtBody(rawStmt, PgNode.CreateTrigStmt)
        if (stmt) handleCreateTrigger(stmt, rawStmt, PG_DEFAULT_SCHEMA, acc, onError)
        break
      }
      default:
        // Unreachable: the SUPPORTED_STMT_TYPE_SET guard above filters out every
        // non-supported type. `supported` is `never` here iff every
        // SupportedStmtType has a case — see assertNever.
        assertNever(supported)
    }
  }

  // Pass 2 — resolve cross-statement references
  resolveReferences(acc, onError)

  const realm = acc.buildRealm()

  if (strict && issues.length > 0) {
    throw new DdlBuildError(issues, realm)
  }

  return realm
}
