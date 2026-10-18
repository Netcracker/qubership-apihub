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
export interface Comment { kind: typeof AttrKind.Comment; text: string }
/** Charset describes a column or a table character-set setting. */
export interface Charset { kind: typeof AttrKind.Charset; value: string /* Atlas Go: V string */ }
/** Collation describes a column or a table collation setting. */
export interface Collation { kind: typeof AttrKind.Collation; value: string /* Atlas Go: V string */ }

/** Check describes a CHECK constraint. */
export interface Check {
  kind: typeof AttrKind.Check
  /** Optional constraint name. */
  name?: string
  /** Actual CHECK expression. */
  expr: string
  /** Additional attributes (e.g. ENFORCED). */
  attrs?: Attr[]
}

/**
 * GeneratedExpr describes the expression used for generating
 * the value of a generated/virtual column.
 */
export interface GeneratedExpr {
  kind: typeof AttrKind.GeneratedExpr
  expr: string
  /** Optional type. e.g. STORED or VIRTUAL. */
  type?: string
}

/** Driver-specific or future attrs pass through without casting. */
export interface UnknownAttr { kind: string;[key: string]: unknown }
