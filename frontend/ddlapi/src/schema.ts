import type { Attr, Check } from './attrs'
import type { Expr, NamedDefault } from './exprs'
import type { SchemaType, EnumType, DomainType } from './types'
import { ObjectKind, ReferenceOption } from './constants'

/**
 * An Object represents a generic database object.
 * Note that this union covers the top-level types used to describe their
 * relationships, and can be extended by driver-specific types.
 *
 * Ported from Go: schema.Object interface.
 */
export type SchemaObject =
  | Table | View | EnumType | DomainType | Index | Check | ForeignKey | NamedDefault | UnknownObject

/** Driver-specific or future schema objects pass through without casting. */
export interface UnknownObject { readonly kind: string; readonly [key: string]: unknown }

/** Specification format version stamp written into every Realm. */
export const DDLAPI_VERSION = '1.0.0'

/**
 * A Realm or a database describes a domain of schema resources that are
 * logically connected and can be accessed and queried in the same connection
 * (e.g. a physical database instance).
 */
export interface Realm {
  /** Specification format version and type marker (e.g. "1.0.0"). */
  readonly ddlapi: string
  readonly schemas: readonly Schema[]
  readonly attrs?: readonly Attr[]
  /** Realm-level objects (e.g., users or extensions). */
  readonly objects?: readonly SchemaObject[]
}

/** A Schema describes a database schema (i.e. named database). */
export interface Schema {
  readonly name: string
  // readonly realm?: Realm          // back-ref to parent Realm — omitted; navigate top-down
  readonly tables?: readonly Table[]
  readonly views?: readonly View[]
  /** Attrs and options. */
  readonly attrs?: readonly Attr[]
  /** Schema-level objects (e.g., types or sequences). */
  readonly objects?: readonly SchemaObject[]
}

/** A Table represents a table definition. */
export interface Table {
  readonly kind: typeof ObjectKind.Table
  readonly name: string
  // readonly schema?: Schema        // back-ref to parent Schema — omitted; navigate top-down
  readonly columns?: readonly Column[]
  readonly indexes?: readonly Index[]
  readonly primaryKey?: Index
  readonly foreignKeys?: readonly ForeignKey[]
  /** Attrs, constraints and options. */
  readonly attrs?: readonly Attr[]
  /** Table-level schema objects (e.g., ExcludeConstraint). */
  readonly objects?: readonly SchemaObject[]
  /** Objects this table depends on. */
  readonly deps?: readonly SchemaObject[]
  // readonly refs?: readonly SchemaObject[]  // back-ref — objects that depend on this table; omitted
}

/** A View represents a view definition. */
export interface View {
  readonly kind: typeof ObjectKind.View
  readonly name: string
  // readonly schema?: Schema        // back-ref to parent Schema — omitted; navigate top-down
  readonly def?: string
  readonly columns?: readonly Column[]
  readonly attrs?: readonly Attr[]
  /** Objects this view depends on. */
  readonly deps?: readonly SchemaObject[]
}

/** ColumnType represents a column type that is implemented by the dialect. */
export interface ColumnType {
  readonly type: SchemaType
  readonly raw?: string
  /**
   * Explicit nullability declaration.
   * false = NOT NULL; true = NULL (explicit); undefined = no nullability clause written.
   */
  readonly null?: boolean
}

/** A Column represents a column definition. */
export interface Column {
  readonly name: string
  readonly type?: ColumnType
  readonly default?: Expr
  readonly attrs?: readonly Attr[]
  // readonly indexes?: readonly Index[]          // back-ref — omitted; navigate top-down
  // /** Foreign keys that this column is part of their child columns. */
  // readonly foreignKeys?: readonly ForeignKey[] // back-ref — omitted; navigate top-down
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
  readonly kind: typeof ObjectKind.Index
  readonly name?: string
  readonly unique?: boolean
  // readonly table?: Table          // back-ref to owning Table — omitted; navigate top-down
  readonly attrs?: readonly Attr[]
  readonly parts?: readonly IndexPart[]
}

/**
 * An IndexPart represents an index part that can be either an expression or a column.
 */
export interface IndexPart {
  /** SeqNo represents the sequence number of the key part in the index. */
  readonly seqNo: number
  /** Desc indicates if the key part is stored in descending order. All databases use ascending order as default. */
  readonly desc?: boolean
  readonly x?: Expr                 // expression part
  readonly c?: Column               // column part
  readonly attrs?: readonly Attr[]
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
  readonly kind: typeof ObjectKind.ForeignKey
  /** Constraint name, if exists. */
  readonly symbol?: string
  // readonly table?: Table          // back-ref to owning Table — omitted; navigate top-down
  readonly columns?: readonly Column[]
  readonly refTable?: Table
  readonly refColumns?: readonly Column[]
  readonly onUpdate?: ReferenceOption
  readonly onDelete?: ReferenceOption
  readonly attrs?: readonly Attr[]
}

// NamedDefault is defined in src/exprs.ts (it is primarily an Expr).
// It is re-exported from src/schema.ts and included in the SchemaObject union here.
export type { NamedDefault } from './exprs'

// EnumType is defined in src/types.ts (it is primarily a Type).
// It is re-exported here because it is also a SchemaObject.
export type { EnumType } from './types'

// DomainType is defined in src/types.ts (it is primarily a Type).
// It is re-exported here because it is also a SchemaObject.
export type { DomainType } from './types'

// Check is defined in src/attrs.ts (it is primarily an Attr).
// It is re-exported here because it is also a SchemaObject.
export type { Check } from './attrs'
