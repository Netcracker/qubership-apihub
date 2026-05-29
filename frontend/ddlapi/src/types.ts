import type { Attr, Check } from './attrs'
import type { Expr } from './exprs'
import type { Schema } from './schema'
import { TypeKind } from './constants'

/**
 * A Type represents a database type. The variants below can be used for
 * describing schemas.
 *
 * The union can also be extended for driver-specific types outside this
 * package — pass an object satisfying UnknownType as the escape hatch:
 *
 *   const spatialPoint: UnknownType = { kind: 'point', srid: 4326 }
 *   const col: Column = { name: 'geom', type: columnType(spatialPoint) }
 *
 * Ported from Go: schema.Type interface.
 */
export type SchemaType =
  | BoolType | EnumType | DomainType | IntegerType | DecimalType | FloatType
  | StringType | BinaryType | TimeType | JSONType | SpatialType
  | UUIDType | UnsupportedType | UnknownType

/** BoolType represents a boolean type. */
export interface BoolType { kind: typeof TypeKind.BoolType; t: string }
/** JSONType represents a JSON type. */
export interface JSONType { kind: typeof TypeKind.JSONType; t: string }
/** SpatialType represents a spatial/geometric type. */
export interface SpatialType { kind: typeof TypeKind.SpatialType; t: string }
/** A UUIDType defines a UUID type. */
export interface UUIDType { kind: typeof TypeKind.UUIDType; t: string }
/** UnsupportedType represents a type that is not supported by the drivers. */
export interface UnsupportedType { kind: typeof TypeKind.UnsupportedType; t: string }
/** Driver-specific or future types pass through without casting. */
export interface UnknownType { kind: string;[key: string]: unknown }

/** EnumType represents an enum type. */
export interface EnumType {
  kind: typeof TypeKind.EnumType
  /** Optional type name (e.g. a named enum in PostgreSQL). */
  t?: string
  /** Enum values. */
  values: string[]
  /** Optional schema. */
  schema?: Schema
  /** Extra attributes. */
  attrs?: Attr[]
}

/** IntegerType represents an int type. */
export interface IntegerType {
  kind: typeof TypeKind.IntegerType
  t: string
  unsigned?: boolean
  attrs?: Attr[]
}

/** DecimalType represents a fixed-point type that stores exact numeric values. */
export interface DecimalType {
  kind: typeof TypeKind.DecimalType
  t: string
  precision?: number
  scale?: number
  unsigned?: boolean
}

/** FloatType represents a floating-point type that stores approximate numeric values. */
export interface FloatType {
  kind: typeof TypeKind.FloatType
  t: string
  unsigned?: boolean
  precision?: number
}

/**
 * StringType represents a string type.
 *
 * NOTE on size: in Go, StringType.Size is a plain `int` where 0 is the zero value
 * meaning "not set". In TypeScript, absent size is represented as `undefined` (field
 * omitted). Callers MUST omit size rather than pass 0; 0 is semantically absent by
 * Go convention but this library cannot enforce it in a pure constructor.
 */
export interface StringType {
  kind: typeof TypeKind.StringType
  t: string
  size?: number
  attrs?: Attr[]
}

/**
 * BinaryType represents a type that stores binary data.
 *
 * NOTE on size: in Go, BinaryType.Size is `*int` (pointer), so nil = absent and
 * &0 = explicitly size 0. In TypeScript this maps cleanly to `size?: number` where
 * undefined = absent. Unlike StringType, a size value of 0 is semantically valid here.
 */
export interface BinaryType {
  kind: typeof TypeKind.BinaryType
  t: string
  size?: number
}

/** TimeType represents a date/time type. */
export interface TimeType {
  kind: typeof TypeKind.TimeType
  t: string
  precision?: number
  scale?: number
  attrs?: Attr[]
}

/**
 * DomainType represents a PostgreSQL domain — a named type alias with optional
 * constraints. Dual-role: both a SchemaType (column type reference) and a
 * SchemaObject (top-level object in Schema.objects).
 *
 * baseType may itself be a DomainType (PostgreSQL allows CREATE DOMAIN d2 AS d1).
 *
 * Atlas Go equivalent: schema.DomainType (sql/schema/schema.go)
 */
export interface DomainType {
  kind: typeof TypeKind.DomainType
  /** Qualified type name as written (e.g. "public.positive_int"). */
  t: string
  /** Back-ref to owning schema — not populated; navigate top-down from Realm. */
  schema?: Schema
  /** Underlying type; may itself be a DomainType. */
  baseType: SchemaType
  /** Domain-level NOT NULL constraint (false = NOT NULL; undefined = no constraint). */
  null?: boolean
  /** Domain DEFAULT expression. */
  default?: Expr
  /** Domain CHECK constraints. */
  checks?: Check[]
  attrs?: Attr[]
}
