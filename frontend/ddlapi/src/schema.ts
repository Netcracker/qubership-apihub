import type { Attr, Check } from './attrs'
import type { Expr, NamedDefault } from './exprs'
import type { SchemaType, EnumType } from './types'
import { ObjectKind, ReferenceOption } from './constants'

/**
 * An Object represents a generic database object.
 * Note that this union covers the top-level types used to describe their
 * relationships, and can be extended by driver-specific types.
 *
 * Ported from Go: schema.Object interface.
 */
export type SchemaObject =
  | Table | View | EnumType | Index | Check | ForeignKey | NamedDefault | UnknownObject

/** Driver-specific or future schema objects pass through without casting. */
export interface UnknownObject { kind: string;[key: string]: unknown }

/** Specification format version stamp written into every Realm. */
export const DDLAPI_VERSION = '1.0.0'

/**
 * A Realm or a database describes a domain of schema resources that are
 * logically connected and can be accessed and queried in the same connection
 * (e.g. a physical database instance).
 */
export interface Realm {
  /** Specification format version and type marker (e.g. "1.0.0"). */
  ddlapi: string
  schemas: Schema[]
  attrs?: Attr[]
  /** Realm-level objects (e.g., users or extensions). */
  objects?: SchemaObject[]
}

/** A Schema describes a database schema (i.e. named database). */
export interface Schema {
  name: string
  // realm?: Realm          // back-ref to parent Realm — omitted; navigate top-down
  tables?: Table[]
  // views?: View[] // not supported for now
  /** Attrs and options. */
  attrs?: Attr[]
  /** Schema-level objects (e.g., types or sequences). */
  objects?: SchemaObject[]
}

/** A Table represents a table definition. */
export interface Table {
  kind: typeof ObjectKind.Table
  name: string
  // schema?: Schema        // back-ref to parent Schema — omitted; navigate top-down
  columns?: Column[]
  indexes?: Index[]
  primaryKey?: Index
  foreignKeys?: ForeignKey[]
  /** Attrs, constraints and options. */
  attrs?: Attr[]
  /** Table-level schema objects (e.g., ExcludeConstraint). */
  objects?: SchemaObject[]
  /** Objects this table depends on. */
  deps?: SchemaObject[]
  // refs?: SchemaObject[]  // back-ref — objects that depend on this table; omitted
}

/** A View represents a view definition. */
export interface View {
  kind: typeof ObjectKind.View
  name: string
  // schema?: Schema        // back-ref to parent Schema — omitted; navigate top-down
  def?: string
  columns?: Column[]
  attrs?: Attr[]
  /** Objects this view depends on. */
  deps?: SchemaObject[]
}

/** ColumnType represents a column type that is implemented by the dialect. */
export interface ColumnType {
  type: SchemaType
  raw?: string
  /**
   * Explicit nullability declaration.
   * false = NOT NULL; true = NULL (explicit); undefined = no nullability clause written.
   */
  null?: boolean
}

/** A Column represents a column definition. */
export interface Column {
  name: string
  type?: ColumnType
  default?: Expr
  attrs?: Attr[]
  // indexes?: Index[]          // back-ref — omitted; navigate top-down
  // /** Foreign keys that this column is part of their child columns. */
  // foreignKeys?: ForeignKey[] // back-ref — omitted; navigate top-down
}

/**
 * An Index represents an index definition.
 *
 * NOTE: `kind` is not present in the Go model (Go uses an empty marker method `obj()`
 * instead). It is added here to allow Index to participate in the SchemaObject
 * discriminated union without a wrapper type, avoiding constant unwrapping when
 * traversing deps/refs arrays.
 */
export interface Index {
  kind: typeof ObjectKind.Index
  name?: string
  unique?: boolean
  // table?: Table          // back-ref to owning Table — omitted; navigate top-down
  attrs?: Attr[]
  parts?: IndexPart[]
}

/**
 * An IndexPart represents an index part that can be either an expression or a column.
 */
export interface IndexPart {
  /** SeqNo represents the sequence number of the key part in the index. */
  seqNo: number
  /** Desc indicates if the key part is stored in descending order. All databases use ascending order as default. */
  desc?: boolean
  x?: Expr                 // expression part
  c?: Column               // column part
  attrs?: Attr[]
}

/**
 * A ForeignKey represents a foreign-key definition.
 *
 * NOTE: The Go source comment reads "A ForeignKey represents an index definition" —
 * this is a known copy-paste error in the upstream code; the intent is foreign-key.
 *
 * NOTE: `kind` is not present in the Go model — same reasoning as Index above.
 */
export interface ForeignKey {
  kind: typeof ObjectKind.ForeignKey
  /** Constraint name, if exists. */
  symbol?: string
  // table?: Table          // back-ref to owning Table — omitted; navigate top-down
  columns?: Column[]
  refTable?: Table
  refColumns?: Column[]
  onUpdate?: ReferenceOption
  onDelete?: ReferenceOption
  attrs?: Attr[]
}

// NamedDefault is defined in src/exprs.ts (it is primarily an Expr).
// It is re-exported from src/schema.ts and included in the SchemaObject union here.
export type { NamedDefault } from './exprs'

// EnumType is defined in src/types.ts (it is primarily a Type).
// It is re-exported here because it is also a SchemaObject.
export type { EnumType } from './types'

// Check is defined in src/attrs.ts (it is primarily an Attr).
// It is re-exported here because it is also a SchemaObject.
export type { Check } from './attrs'
