// Private module — libpg-query parse wrapper.
// Nothing from libpg-query or @pgsql/types appears in the public API.
// This file is the only place that imports the parser; swap it here to change parsers.
//
// We import `parse` straight from libpg-query (the WASM parser); deparsing goes straight
// to pgsql-deparser elsewhere. Avoiding the old pgsql-parser wrapper keeps the '/parser'
// build to only what it uses, with no extra CJS interop layer. This
// module is only reachable from the package's '/parser' entry (never the model root),
// and that entry bundles libpg-query with the WASM inlined. `parse` lazily initialises
// the WASM on first call, so importing this module is cheap.

import { parse } from 'libpg-query'
import type { Node, RawStmt } from '@pgsql/types'

export type { Node, RawStmt }

/**
 * Parses a DDL string and returns the raw statement array.
 * Throws the libpg-query error on syntax failure (caller wraps into DdlParseError).
 */
export async function parseStatements(ddl: string): Promise<RawStmt[]> {
  const result = await parse(ddl) as { stmts?: RawStmt[] }
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
