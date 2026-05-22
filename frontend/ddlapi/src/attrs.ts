import { AttrKind } from './constants'

/**
 * Attr represents a schema element attribute.
 *
 * Ported from Go: schema.Attr interface.
 */
export type Attr =
  | Comment | Charset | Collation | Check | GeneratedExpr | Pos | UnknownAttr

/** Comment describes a schema element comment. */
export interface Comment { readonly kind: typeof AttrKind.Comment; readonly text: string }
/** Charset describes a column or a table character-set setting. */
export interface Charset { readonly kind: typeof AttrKind.Charset; readonly v: string }
/** Collation describes a column or a table collation setting. */
export interface Collation { readonly kind: typeof AttrKind.Collation; readonly v: string }

/** Check describes a CHECK constraint. */
export interface Check {
  readonly kind: typeof AttrKind.Check
  /** Optional constraint name. */
  readonly name?: string
  /** Actual CHECK expression. */
  readonly expr: string
  /** Additional attributes (e.g. ENFORCED). */
  readonly attrs?: readonly Attr[]
}

/**
 * GeneratedExpr describes the expression used for generating
 * the value of a generated/virtual column.
 */
export interface GeneratedExpr {
  readonly kind: typeof AttrKind.GeneratedExpr
  readonly expr: string
  /** Optional type. e.g. STORED or VIRTUAL. */
  readonly type?: string
}

/** Pos is an attribute that holds the position of a schema element. */
export interface Pos {
  readonly kind: typeof AttrKind.Pos
  /** The name (or full path) of the file which loaded the schema element. */
  readonly filename?: string
  /** Start and End represent the bounds of this range. */
  readonly start?: PosPoint
  readonly end?: PosPoint
}

/** Line, column, and byte offset within a source file (mirrors hcl.Pos fields). */
export interface PosPoint { readonly line: number; readonly column: number; readonly byte: number }

/** Driver-specific or future attrs pass through without casting. */
export interface UnknownAttr { readonly kind: string; readonly [key: string]: unknown }
