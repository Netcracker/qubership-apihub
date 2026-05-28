// Public entry point for DDL parsing.
// This file is re-exported from src/index.ts.

import type {
  CreateStmt, IndexStmt, CommentStmt, CreateDomainStmt,
  CreateEnumStmt, CompositeTypeStmt, CreateRangeStmt, CreateTrigStmt,
} from '@pgsql/types'
import { DdlErrorKind } from '../constants'
import { DDLAPI_VERSION } from '../schema'
import type { SourceRange } from './positions'
import { parseStatements, stmtTypeName, stmtBody } from './pgParser'
import { stmtRangeOf } from './astHelpers'
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
    /** AST node type name from pgsql-parser, e.g. 'AlterTableStmt', 'DropStmt'. */
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

/** Statement type names that are out of scope — skipped with onError. */
const OUT_OF_SCOPE_STMTS = new Set([
  'AlterTableStmt',
  'DropStmt',
  'CreateSeqStmt',
  'AlterSeqStmt',
  'CreateSchemaStmt',
  'CreateExtensionStmt',
  'CreateFunctionStmt',
  'AlterFunctionStmt',
  'ViewStmt',
  'SelectStmt',
  'InsertStmt',
  'UpdateStmt',
  'DeleteStmt',
  'TruncateStmt',
  'GrantStmt',
  'RevokeStmt',
  'TransactionStmt',
  'CreateRoleStmt',
  'AlterRoleStmt',
])

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

    if (OUT_OF_SCOPE_STMTS.has(typeName)) {
      onError({
        kind: DdlErrorKind.OutOfScopeStatement,
        statementType: typeName,
        message: `Statement type '${typeName}' is not supported`,
        ...(range && { range }),
      })
      continue
    }

    switch (typeName) {
      case 'CreateStmt': {
        const stmt = stmtBody(rawStmt, 'CreateStmt') as CreateStmt | undefined
        if (stmt) handleCreateTable(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'IndexStmt': {
        const stmt = stmtBody(rawStmt, 'IndexStmt') as IndexStmt | undefined
        if (stmt) handleCreateIndex(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'CommentStmt': {
        const stmt = stmtBody(rawStmt, 'CommentStmt') as CommentStmt | undefined
        if (stmt) handleComment(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'CreateDomainStmt': {
        const stmt = stmtBody(rawStmt, 'CreateDomainStmt') as CreateDomainStmt | undefined
        if (stmt) handleCreateDomain(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'CreateEnumStmt': {
        const stmt = stmtBody(rawStmt, 'CreateEnumStmt') as CreateEnumStmt | undefined
        if (stmt) handleCreateEnum(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'CompositeTypeStmt': {
        const stmt = stmtBody(rawStmt, 'CompositeTypeStmt') as CompositeTypeStmt | undefined
        if (stmt) handleCreateCompositeType(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'CreateRangeStmt': {
        const stmt = stmtBody(rawStmt, 'CreateRangeStmt') as CreateRangeStmt | undefined
        if (stmt) handleCreateRangeType(stmt, rawStmt, 'public', acc, onError)
        break
      }
      case 'CreateTrigStmt': {
        const stmt = stmtBody(rawStmt, 'CreateTrigStmt') as CreateTrigStmt | undefined
        if (stmt) handleCreateTrigger(stmt, rawStmt, 'public', acc, onError)
        break
      }
      default: {
        onError({
          kind: DdlErrorKind.OutOfScopeStatement,
          statementType: typeName || 'unknown',
          message: `Statement type '${typeName || 'unknown'}' is not supported`,
          ...(range && { range }),
        })
        break
      }
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
