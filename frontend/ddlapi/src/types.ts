import type { Attr } from './attrs'
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
  | BoolType | EnumType | IntegerType | DecimalType | FloatType
  | StringType | BinaryType | TimeType | JSONType | SpatialType
  | UUIDType | UnsupportedType | UnknownType

/** BoolType represents a boolean type. */
export interface BoolType { readonly kind: typeof TypeKind.BoolType; readonly t: string }
/** JSONType represents a JSON type. */
export interface JSONType { readonly kind: typeof TypeKind.JSONType; readonly t: string }
/** SpatialType represents a spatial/geometric type. */
export interface SpatialType { readonly kind: typeof TypeKind.SpatialType; readonly t: string }
/** A UUIDType defines a UUID type. */
export interface UUIDType { readonly kind: typeof TypeKind.UUIDType; readonly t: string }
/** UnsupportedType represents a type that is not supported by the drivers. */
export interface UnsupportedType { readonly kind: typeof TypeKind.UnsupportedType; readonly t: string }
/** Driver-specific or future types pass through without casting. */
export interface UnknownType { readonly kind: string; readonly [key: string]: unknown }

/** EnumType represents an enum type. */
export interface EnumType {
  readonly kind: typeof TypeKind.EnumType
  /** Optional type name (e.g. a named enum in PostgreSQL). */
  readonly t?: string
  /** Enum values. */
  readonly values: readonly string[]
  /** Optional schema. */
  readonly schema?: Schema
  /** Extra attributes. */
  readonly attrs?: readonly Attr[]
}

/** IntegerType represents an int type. */
export interface IntegerType {
  readonly kind: typeof TypeKind.IntegerType
  readonly t: string
  readonly unsigned?: boolean
  readonly attrs?: readonly Attr[]
}

/** DecimalType represents a fixed-point type that stores exact numeric values. */
export interface DecimalType {
  readonly kind: typeof TypeKind.DecimalType
  readonly t: string
  readonly precision?: number
  readonly scale?: number
  readonly unsigned?: boolean
}

/** FloatType represents a floating-point type that stores approximate numeric values. */
export interface FloatType {
  readonly kind: typeof TypeKind.FloatType
  readonly t: string
  readonly unsigned?: boolean
  readonly precision?: number
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
  readonly kind: typeof TypeKind.StringType
  readonly t: string
  readonly size?: number
  readonly attrs?: readonly Attr[]
}

/**
 * BinaryType represents a type that stores binary data.
 *
 * NOTE on size: in Go, BinaryType.Size is `*int` (pointer), so nil = absent and
 * &0 = explicitly size 0. In TypeScript this maps cleanly to `size?: number` where
 * undefined = absent. Unlike StringType, a size value of 0 is semantically valid here.
 */
export interface BinaryType {
  readonly kind: typeof TypeKind.BinaryType
  readonly t: string
  readonly size?: number
}

/** TimeType represents a date/time type. */
export interface TimeType {
  readonly kind: typeof TypeKind.TimeType
  readonly t: string
  readonly precision?: number
  readonly scale?: number
  readonly attrs?: readonly Attr[]
}
