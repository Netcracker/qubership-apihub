import { AttrKind, ExprKind, ObjectKind, ReferenceOption, TypeKind } from './constants'
import type { Attr, Check, GeneratedExpr, Comment, Charset, Collation } from './attrs'
import type { Expr, Literal, RawExpr, NamedDefault } from './exprs'
import type {
  SchemaType, BoolType, IntegerType, DecimalType, FloatType,
  StringType, BinaryType, TimeType, JSONType, SpatialType, UUIDType,
  UnsupportedType, EnumType, DomainType,
} from './types'
import type {
  Realm, Schema, Table, View, Column, ColumnType, Index, IndexPart,
  ForeignKey, SchemaObject,
} from './schema'
import { DDLAPI_VERSION } from './schema'

// ── Schema factories ─────────────────────────────────────────────────────────

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newRealm(
  schemas?: readonly Schema[],
  props?: { attrs?: readonly Attr[]; objects?: readonly SchemaObject[] },
): Realm {
  return {
    ddlapi: DDLAPI_VERSION,
    schemas: schemas ?? [],
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.objects !== undefined && { objects: props.objects }),
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newSchema(
  name: string,
  props?: {
    tables?: readonly Table[]
    views?: readonly View[]
    attrs?: readonly Attr[]
    objects?: readonly SchemaObject[]
  },
): Schema {
  return {
    name,
    ...(props?.tables !== undefined && { tables: props.tables }),
    ...(props?.views !== undefined && { views: props.views }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.objects !== undefined && { objects: props.objects }),
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newTable(
  name: string,
  props?: {
    columns?: readonly Column[]
    indexes?: readonly Index[]
    primaryKey?: Index
    foreignKeys?: readonly ForeignKey[]
    attrs?: readonly Attr[]
    deps?: readonly SchemaObject[]
  },
): Table {
  return {
    kind: ObjectKind.Table,
    name,
    ...(props?.columns !== undefined && { columns: props.columns }),
    ...(props?.indexes !== undefined && { indexes: props.indexes }),
    ...(props?.primaryKey !== undefined && { primaryKey: props.primaryKey }),
    ...(props?.foreignKeys !== undefined && { foreignKeys: props.foreignKeys }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.deps !== undefined && { deps: props.deps }),
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newView(
  name: string,
  props?: {
    def?: string
    columns?: readonly Column[]
    attrs?: readonly Attr[]
    deps?: readonly SchemaObject[]
  },
): View {
  return {
    kind: ObjectKind.View,
    name,
    ...(props?.def !== undefined && { def: props.def }),
    ...(props?.columns !== undefined && { columns: props.columns }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.deps !== undefined && { deps: props.deps }),
  }
}

// ── Column / constraint factories ────────────────────────────────────────────

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function columnType(
  type: SchemaType,
  opts?: { null?: boolean; raw?: string },
): ColumnType {
  return {
    type,
    ...(opts?.null !== undefined ? { null: opts.null } : {}),
    ...(opts?.raw !== undefined ? { raw: opts.raw } : {}),
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newColumn(
  name: string,
  props?: {
    type?: ColumnType
    default?: Expr
    attrs?: readonly Attr[]
  },
): Column {
  return {
    name,
    ...(props?.type !== undefined && { type: props.type }),
    ...(props?.default !== undefined && { default: props.default }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
  }
}

/**
 * Shorthand for a nullable column with no dialect type known at construction time.
 * Uses `UnsupportedType('')` as a placeholder — callers that know the concrete type
 * should use `newColumn(name, { type: columnType(myType, { null: true }) })` instead.
 * @remarks Pure constructor — no runtime validation.
 */
export function newNullableColumn(name: string): Column {
  return newColumn(name, { type: columnType(unsupportedType(''), { null: true }) })
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newIndex(
  name?: string,
  props?: {
    unique?: boolean
    attrs?: readonly Attr[]
    parts?: readonly IndexPart[]
  },
): Index {
  return {
    kind: ObjectKind.Index,
    ...(name !== undefined && { name }),
    ...(props?.unique !== undefined && { unique: props.unique }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.parts !== undefined && { parts: props.parts }),
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newUniqueIndex(
  name: string,
  props?: { attrs?: readonly Attr[]; parts?: readonly IndexPart[] },
): Index {
  return newIndex(name, { unique: true, ...props })
}

/**
 * Creates a primary key index. Parts are auto-assigned sequential seqNo starting at 0.
 * Back-references on columns are NOT wired — see design decision §3.
 * @remarks Pure constructor — no runtime validation.
 */
export function newPrimaryKey(columns: readonly Column[]): Index {
  const parts: IndexPart[] = columns.map((c, i) => ({ seqNo: i, c }))
  return {
    kind: ObjectKind.Index,
    parts,
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newIndexPart(props?: {
  seqNo?: number
  desc?: boolean
  x?: Expr
  c?: Column
  attrs?: readonly Attr[]
}): IndexPart {
  return {
    seqNo: props?.seqNo ?? 0,
    ...(props?.desc !== undefined && { desc: props.desc }),
    ...(props?.x !== undefined && { x: props.x }),
    ...(props?.c !== undefined && { c: props.c }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
  }
}

/**
 * Mirrors Go's NewColumnPart. seqNo defaults to 0.
 * @remarks Pure constructor — no runtime validation.
 */
export function newColumnPart(c: Column, props?: { seqNo?: number; desc?: boolean; attrs?: readonly Attr[] }): IndexPart {
  return newIndexPart({ seqNo: props?.seqNo ?? 0, c, desc: props?.desc, attrs: props?.attrs })
}

/**
 * Mirrors Go's NewExprPart. seqNo defaults to 0.
 * @remarks Pure constructor — no runtime validation.
 */
export function newExprPart(x: Expr, props?: { seqNo?: number; desc?: boolean; attrs?: readonly Attr[] }): IndexPart {
  return newIndexPart({ seqNo: props?.seqNo ?? 0, x, desc: props?.desc, attrs: props?.attrs })
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newForeignKey(
  symbol?: string,
  props?: {
    columns?: readonly Column[]
    refTable?: Table
    refColumns?: readonly Column[]
    onUpdate?: ReferenceOption
    onDelete?: ReferenceOption
    attrs?: readonly Attr[]
  },
): ForeignKey {
  return {
    kind: ObjectKind.ForeignKey,
    ...(symbol !== undefined && { symbol }),
    ...(props?.columns !== undefined && { columns: props.columns }),
    ...(props?.refTable !== undefined && { refTable: props.refTable }),
    ...(props?.refColumns !== undefined && { refColumns: props.refColumns }),
    ...(props?.onUpdate !== undefined && { onUpdate: props.onUpdate }),
    ...(props?.onDelete !== undefined && { onDelete: props.onDelete }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
  }
}

/**
 * @remarks Pure constructor — no runtime validation.
 */
export function newCheck(expr: string, name?: string): Check {
  return {
    kind: AttrKind.Check,
    expr,
    ...(name !== undefined && { name }),
  }
}

// ── Type factories ───────────────────────────────────────────────────────────

/** @remarks Pure constructor — no runtime validation. */
export function boolType(t: string): BoolType {
  return { kind: TypeKind.BoolType, t }
}

/** @remarks Pure constructor — no runtime validation. */
export function integerType(t: string, opts?: { unsigned?: boolean; attrs?: readonly Attr[] }): IntegerType {
  return {
    kind: TypeKind.IntegerType,
    t,
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function decimalType(t: string, opts?: { precision?: number; scale?: number; unsigned?: boolean }): DecimalType {
  return {
    kind: TypeKind.DecimalType,
    t,
    ...(opts?.precision !== undefined && { precision: opts.precision }),
    ...(opts?.scale !== undefined && { scale: opts.scale }),
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function floatType(t: string, opts?: { unsigned?: boolean; precision?: number }): FloatType {
  return {
    kind: TypeKind.FloatType,
    t,
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
    ...(opts?.precision !== undefined && { precision: opts.precision }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function stringType(t: string, opts?: { size?: number; attrs?: readonly Attr[] }): StringType {
  return {
    kind: TypeKind.StringType,
    t,
    ...(opts?.size !== undefined && { size: opts.size }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function binaryType(t: string, opts?: { size?: number }): BinaryType {
  return {
    kind: TypeKind.BinaryType,
    t,
    ...(opts?.size !== undefined && { size: opts.size }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function timeType(t: string, opts?: { precision?: number; scale?: number; attrs?: readonly Attr[] }): TimeType {
  return {
    kind: TypeKind.TimeType,
    t,
    ...(opts?.precision !== undefined && { precision: opts.precision }),
    ...(opts?.scale !== undefined && { scale: opts.scale }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function jsonType(t: string): JSONType {
  return { kind: TypeKind.JSONType, t }
}

/** @remarks Pure constructor — no runtime validation. */
export function spatialType(t: string): SpatialType {
  return { kind: TypeKind.SpatialType, t }
}

/** @remarks Pure constructor — no runtime validation. */
export function uuidType(t: string): UUIDType {
  return { kind: TypeKind.UUIDType, t }
}

/** @remarks Pure constructor — no runtime validation. */
export function unsupportedType(t: string): UnsupportedType {
  return { kind: TypeKind.UnsupportedType, t }
}

/** @remarks Pure constructor — no runtime validation. */
export function enumType(
  values: readonly string[],
  opts?: { t?: string; schema?: Schema; attrs?: readonly Attr[] },
): EnumType {
  return {
    kind: TypeKind.EnumType,
    values,
    ...(opts?.t !== undefined && { t: opts.t }),
    ...(opts?.schema !== undefined && { schema: opts.schema }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

/** @remarks Pure constructor — no runtime validation. */
export function domainType(
  t: string,
  baseType: SchemaType,
  opts?: { null?: boolean; default?: Expr; checks?: readonly Check[]; attrs?: readonly Attr[] },
): DomainType {
  return {
    kind: TypeKind.DomainType,
    t,
    baseType,
    ...(opts?.null !== undefined ? { null: opts.null } : {}),
    ...(opts?.default !== undefined && { default: opts.default }),
    ...(opts?.checks !== undefined && { checks: opts.checks }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

// ── Attr factories ───────────────────────────────────────────────────────────

/** @remarks Pure constructor — no runtime validation. */
export function comment(text: string): Comment {
  return { kind: AttrKind.Comment, text }
}

/** @remarks Pure constructor — no runtime validation. */
export function charset(v: string): Charset {
  return { kind: AttrKind.Charset, v }
}

/** @remarks Pure constructor — no runtime validation. */
export function collation(v: string): Collation {
  return { kind: AttrKind.Collation, v }
}

/** @remarks Pure constructor — no runtime validation. */
export function generatedExpr(expr: string, type?: string): GeneratedExpr {
  return {
    kind: AttrKind.GeneratedExpr,
    expr,
    ...(type !== undefined && { type }),
  }
}

// ── Expr factories ───────────────────────────────────────────────────────────

/** @remarks Pure constructor — no runtime validation. */
export function literal(v: string): Literal {
  return { kind: ExprKind.Literal, v }
}

/** @remarks Pure constructor — no runtime validation. */
export function rawExpr(x: string): RawExpr {
  return { kind: ExprKind.RawExpr, x }
}

/** @remarks Pure constructor — no runtime validation. */
export function namedDefault(name: string, expr: Literal | RawExpr, attrs?: readonly Attr[]): NamedDefault {
  return {
    kind: ObjectKind.NamedDefault,
    name,
    expr,
    ...(attrs !== undefined && { attrs }),
  }
}
