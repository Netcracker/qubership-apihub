// Private module — lazy pgsql-parser wrapper.
// Nothing from pgsql-parser or @pgsql/types appears in the public API.
// This file is the only place that imports pgsql-parser; swap it here to change parsers.

import type { Node, RawStmt } from '@pgsql/types'

export type { Node, RawStmt }

// Module-level singleton — concurrent buildFromDdl calls share the same init promise.
// Dynamic import() ensures the WASM chunk is excluded from consumer bundles that
// never call buildFromDdl.
let _parseFn: ((query: string) => Promise<unknown>) | null = null
let _initPromise: Promise<void> | null = null

function ensureInit(): Promise<void> {
  if (!_initPromise) {
    _initPromise = import('pgsql-parser').then((mod: { parse: (q: string) => Promise<unknown> }) => {
      _parseFn = mod.parse
    })
  }
  return _initPromise
}

/**
 * Parses a DDL string and returns the raw statement array.
 * Throws the pgsql-parser error on syntax failure (caller wraps into DdlParseError).
 */
export async function parseStatements(ddl: string): Promise<RawStmt[]> {
  await ensureInit()
  const result = await _parseFn!(ddl) as { stmts?: RawStmt[] }
  return result.stmts ?? []
}

/**
 * Returns the top-level statement type key for a RawStmt, e.g. 'CreateStmt', 'IndexStmt'.
 */
export function stmtTypeName(rawStmt: RawStmt): string {
  const stmt = rawStmt.stmt
  if (stmt == null) return ''
  return Object.keys(stmt)[0] ?? ''
}

/**
 * Extracts the statement body for a known statement type key.
 * Returns unknown because Node is a union type (keyof Node = never in TypeScript);
 * callers cast the result to the expected concrete type.
 */
export function stmtBody(rawStmt: RawStmt, key: string): unknown {
  const stmt = rawStmt.stmt as Record<string, unknown> | undefined
  return stmt?.[key]
}
