import type { Attr } from './attrs'
import { ExprKind, ObjectKind } from './constants'

/**
 * Expr defines an SQL expression in schema DDL.
 *
 * The union can also be extended for driver-specific expressions outside
 * this package — use UnknownExpr as the escape hatch.
 *
 * Ported from Go: schema.Expr interface.
 */
export type Expr = Literal | RawExpr | NamedDefault | UnknownExpr

/**
 * Literal represents a basic literal expression like 1, or '1'.
 * String literals are usually quoted with single or double quotes.
 */
export interface Literal { kind: typeof ExprKind.Literal; v: string }

/**
 * RawExpr represents a raw expression like "uuid()" or "current_timestamp()".
 * Unlike literals, raw expressions are usually inlined as-is on migration.
 */
export interface RawExpr { kind: typeof ExprKind.RawExpr; x: string }

/**
 * NamedDefault defines a named default expression (e.g. DEFAULT NEXT VALUE FOR <seq>).
 *
 * NOTE: NamedDefault is both an Expr and a SchemaObject in Go (it implements both
 * the expr() and obj() marker interfaces). It lives in exprs.ts here because Expr
 * is its primary role; schema.ts imports it from exprs.ts for the SchemaObject union.
 * Its `kind` field uses ObjectKind.NamedDefault (not an ExprKind entry) — use that
 * constant when switching over Expr values.
 */
export interface NamedDefault {
  kind: typeof ObjectKind.NamedDefault
  expr: Literal | RawExpr
  name: string
  attrs?: Attr[]
}

/** Driver-specific or future expressions pass through without casting. */
export interface UnknownExpr { kind: string;[key: string]: unknown }
