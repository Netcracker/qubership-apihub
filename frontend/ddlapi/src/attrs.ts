import { AttrKind } from './constants'

/**
 * Attr represents a schema element attribute.
 *
 * Ported from Go: schema.Attr interface.
 * Note: PCompared to Atlas Go, Pos attr is deliberately omitted from this API,
 * since it is technical data not related to DB schema.
 */
export type Attr =
  | Comment | Charset | Collation | Check | GeneratedExpr | UnknownAttr

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

/** Driver-specific or future attrs pass through without casting. */
export interface UnknownAttr { readonly kind: string; readonly [key: string]: unknown }
