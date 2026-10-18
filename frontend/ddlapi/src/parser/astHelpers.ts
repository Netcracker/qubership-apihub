// Shared AST helper utilities for libpg-query node extraction.
//
// Identifier normalisation contract (PostgreSQL §4.1.1):
//   libpg-query's lexer folds unquoted identifiers to lower-case and preserves
//   the original case of double-quoted identifiers — exactly mirroring what the
//   PostgreSQL backend does.  Every `sval` string returned by `strVal()` has
//   already been through this folding, so registry keys formed from strVal() calls
//   match PostgreSQL's own name-resolution behaviour without a secondary pass.
//
// Consequence: swapping the underlying parser (or upgrading its version) could
// change normalisation output.  strVal() is the single point where raw AST
// strings enter the rest of the codebase; update it here if the parser changes.

import { deparseSync } from 'pgsql-deparser'
import type { Node, RawStmt } from '@pgsql/types'
import type { Expr } from '../exprs'
import { literal, rawExpr } from '../factories'
import type { SourceRange } from './positions'

/**
 * The payload type of a wrapped libpg-query node for key K.
 * `Node` is a union of single-key wrappers (`{ ColumnDef: ColumnDef } | …`), so
 * NodeValue<'ColumnDef'> resolves to ColumnDef.
 */
export type NodeValue<K extends string> = Extract<Node, Record<K, unknown>> extends Record<K, infer V> ? V : never

/**
 * Unwraps a wrapped libpg-query node `{ Key: Payload }` to its typed payload, or
 * undefined when the node is absent or of a different kind. The lone unavoidable
 * cast (the AST arrives as a `Node` union that cannot be indexed generically) is
 * centralised here so call sites stay fully typed.
 */
export function unwrapNode<K extends string>(node: Node | undefined, key: K): NodeValue<K> | undefined {
  return (node as Record<string, unknown> | undefined)?.[key] as NodeValue<K> | undefined
}

/**
 * Extracts the typed statement body for a statement type key, e.g.
 * stmtBody(rawStmt, 'CreateStmt') returns a CreateStmt. Just unwrapNode applied to
 * the RawStmt's wrapped statement node, so call sites need no cast.
 */
export function stmtBody<K extends string>(rawStmt: RawStmt, key: K): NodeValue<K> | undefined {
  return unwrapNode(rawStmt.stmt, key)
}

/**
 * Extracts the string value (sval) from a libpg-query String node.
 * Returns undefined for any other node shape.
 *
 * Identifier normalisation is performed upstream by libpg-query's lexer:
 * unquoted identifiers arrive lower-cased; quoted identifiers preserve case.
 */
export function strVal(node: Node | undefined): string | undefined {
  if (!node) return undefined
  return ((node as Record<string, unknown>)['String'] as Record<string, unknown> | undefined)
    ?.['sval'] as string | undefined
}

/**
 * Returns the byte-range of the whole SQL statement (stmt_location + stmt_len).
 * Returns undefined when stmt_len is absent (libpg-query omits it for the last
 * statement in a script).
 */
export function stmtRangeOf(rawStmt: RawStmt): SourceRange | undefined {
  const loc = rawStmt.stmt_location ?? 0
  const len = rawStmt.stmt_len
  if (len === undefined) return undefined
  return { location: loc, len }
}

/**
 * Converts an A_Const AST node to a typed Expr.
 * Integer, float, bool, and string constants become Literal; everything else
 * falls back to a RawExpr holding the deparsed SQL text.
 */
export function nodeToExpr(node: Node): Expr {
  const c = (node as Record<string, unknown>)['A_Const'] as Record<string, unknown> | undefined
  if (c) {
    // libpg-query serialises protobuf, which omits zero-valued scalar fields:
    // DEFAULT 0 arrives as `ival: {}` and DEFAULT false as `boolval: {}` (the
    // inner field is dropped). Fall back to the protobuf default — 0 / false —
    // not '', so zero literals round-trip correctly.
    if (c['ival']) return literal(String((c['ival'] as Record<string, unknown>)['ival'] ?? 0))
    if (c['sval']) return literal(deparseSync(node as Record<string, unknown>))
    if (c['fval']) return literal(String((c['fval'] as Record<string, unknown>)['fval'] ?? ''))
    if (c['boolval']) return literal(String((c['boolval'] as Record<string, unknown>)['boolval'] ?? false))
  }
  return rawExpr(deparseSync(node as Record<string, unknown>))
}

/**
 * Deparses any libpg-query AST node to its SQL text representation.
 */
export function exprToString(node: Node): string {
  return deparseSync(node as Record<string, unknown>)
}
