import { AttrKind, ExprKind, ObjectKind, ReferenceOption, TypeKind } from './constants'
import type { Attr, Check, GeneratedExpr, Comment, Charset, Collation } from './attrs'
import type { Expr, Literal, RawExpr, NamedDefault } from './exprs'
import type {
  SchemaType, BoolType, IntegerType, DecimalType, FloatType,
  StringType, BinaryType, TimeType, JSONType, SpatialType, UUIDType,
  UnsupportedType, EnumType,
} from './types'
import type {
  Realm, Schema, Table, View, Column, ColumnType, Index, IndexPart,
  ForeignKey, SchemaObject,
} from './schema'
import { DDLAPI_VERSION } from './schema'

// All factory functions in this module are pure constructors — they build typed
// objects directly from their arguments with no runtime validation.

// ── Schema factories ─────────────────────────────────────────────────────────

export function newRealm(
  schemas?: Schema[],
  props?: { attrs?: Attr[]; objects?: SchemaObject[] },
): Realm {
  return {
    ddlapi: DDLAPI_VERSION,
    schemas: schemas ?? [],
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.objects !== undefined && { objects: props.objects }),
  }
}

export function newSchema(
  name: string,
  props?: {
    tables?: Table[]
    attrs?: Attr[]
    objects?: SchemaObject[]
  },
): Schema {
  return {
    name,
    ...(props?.tables !== undefined && { tables: props.tables }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
    ...(props?.objects !== undefined && { objects: props.objects }),
  }
}

export function newTable(
  name: string,
  props?: {
    columns?: Column[]
    indexes?: Index[]
    primaryKey?: Index
    foreignKeys?: ForeignKey[]
    attrs?: Attr[]
    deps?: SchemaObject[]
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

export function newView(
  name: string,
  props?: {
    def?: string
    columns?: Column[]
    attrs?: Attr[]
    deps?: SchemaObject[]
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

export function newColumn(
  name: string,
  props?: {
    type?: ColumnType
    default?: Expr
    attrs?: Attr[]
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
 */
export function newNullableColumn(name: string): Column {
  return newColumn(name, { type: columnType(unsupportedType(''), { null: true }) })
}

export function newIndex(
  name?: string,
  props?: {
    unique?: boolean
    attrs?: Attr[]
    parts?: IndexPart[]
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

export function newUniqueIndex(
  name: string,
  props?: { attrs?: Attr[]; parts?: IndexPart[] },
): Index {
  return newIndex(name, { unique: true, ...props })
}

/**
 * Creates a primary key index. Parts are auto-assigned sequential seqNo starting at 0.
 * Back-references on columns are NOT wired — see design decision §3.
 */
export function newPrimaryKey(columns: Column[]): Index {
  const parts: IndexPart[] = columns.map((column, i) => ({ seqNo: i, column }))
  return {
    kind: ObjectKind.Index,
    parts,
  }
}

export function newIndexPart(props?: {
  seqNo?: number
  desc?: boolean
  expr?: Expr
  column?: Column
  attrs?: Attr[]
}): IndexPart {
  return {
    seqNo: props?.seqNo ?? 0,
    ...(props?.desc !== undefined && { desc: props.desc }),
    ...(props?.expr !== undefined && { expr: props.expr }),
    ...(props?.column !== undefined && { column: props.column }),
    ...(props?.attrs !== undefined && { attrs: props.attrs }),
  }
}

/** Mirrors Go's NewColumnPart. seqNo defaults to 0. */
export function newColumnPart(column: Column, props?: { seqNo?: number; desc?: boolean; attrs?: Attr[] }): IndexPart {
  return newIndexPart({ seqNo: props?.seqNo ?? 0, column, desc: props?.desc, attrs: props?.attrs })
}

/** Mirrors Go's NewExprPart. seqNo defaults to 0. */
export function newExprPart(expr: Expr, props?: { seqNo?: number; desc?: boolean; attrs?: Attr[] }): IndexPart {
  return newIndexPart({ seqNo: props?.seqNo ?? 0, expr, desc: props?.desc, attrs: props?.attrs })
}

export function newForeignKey(
  symbol?: string,
  props?: {
    columns?: Column[]
    refTable?: Table
    refColumns?: Column[]
    onUpdate?: ReferenceOption
    onDelete?: ReferenceOption
    attrs?: Attr[]
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

export function newCheck(expr: string, name?: string): Check {
  return {
    kind: AttrKind.Check,
    expr,
    ...(name !== undefined && { name }),
  }
}

// ── Type factories ───────────────────────────────────────────────────────────

export function boolType(type: string): BoolType {
  return { kind: TypeKind.BoolType, type }
}

export function integerType(type: string, opts?: { unsigned?: boolean; attrs?: Attr[] }): IntegerType {
  return {
    kind: TypeKind.IntegerType,
    type,
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

export function decimalType(type: string, opts?: { precision?: number; scale?: number; unsigned?: boolean }): DecimalType {
  return {
    kind: TypeKind.DecimalType,
    type,
    ...(opts?.precision !== undefined && { precision: opts.precision }),
    ...(opts?.scale !== undefined && { scale: opts.scale }),
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
  }
}

export function floatType(type: string, opts?: { unsigned?: boolean; precision?: number }): FloatType {
  return {
    kind: TypeKind.FloatType,
    type,
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
    ...(opts?.precision !== undefined && { precision: opts.precision }),
  }
}

export function stringType(type: string, opts?: { size?: number; attrs?: Attr[] }): StringType {
  return {
    kind: TypeKind.StringType,
    type,
    ...(opts?.size !== undefined && { size: opts.size }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

export function binaryType(type: string, opts?: { size?: number }): BinaryType {
  return {
    kind: TypeKind.BinaryType,
    type,
    ...(opts?.size !== undefined && { size: opts.size }),
  }
}

export function timeType(type: string, opts?: { precision?: number; scale?: number; attrs?: Attr[] }): TimeType {
  return {
    kind: TypeKind.TimeType,
    type,
    ...(opts?.precision !== undefined && { precision: opts.precision }),
    ...(opts?.scale !== undefined && { scale: opts.scale }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

export function jsonType(type: string): JSONType {
  return { kind: TypeKind.JSONType, type }
}

export function spatialType(type: string): SpatialType {
  return { kind: TypeKind.SpatialType, type }
}

export function uuidType(type: string): UUIDType {
  return { kind: TypeKind.UUIDType, type }
}

export function unsupportedType(type: string): UnsupportedType {
  return { kind: TypeKind.UnsupportedType, type }
}

export function enumType(
  values: string[],
  opts?: { type?: string; schema?: Schema; attrs?: Attr[] },
): EnumType {
  return {
    kind: TypeKind.EnumType,
    values,
    ...(opts?.type !== undefined && { type: opts.type }),
    ...(opts?.schema !== undefined && { schema: opts.schema }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}

// ── Attr factories ───────────────────────────────────────────────────────────

export function comment(text: string): Comment {
  return { kind: AttrKind.Comment, text }
}

export function charset(value: string): Charset {
  return { kind: AttrKind.Charset, value }
}

export function collation(value: string): Collation {
  return { kind: AttrKind.Collation, value }
}

export function generatedExpr(expr: string, type?: string): GeneratedExpr {
  return {
    kind: AttrKind.GeneratedExpr,
    expr,
    ...(type !== undefined && { type }),
  }
}

// ── Expr factories ───────────────────────────────────────────────────────────

export function literal(value: string): Literal {
  return { kind: ExprKind.Literal, value }
}

export function rawExpr(expr: string): RawExpr {
  return { kind: ExprKind.RawExpr, expr }
}

export function namedDefault(name: string, expr: Literal | RawExpr, attrs?: Attr[]): NamedDefault {
  return {
    kind: ObjectKind.NamedDefault,
    name,
    expr,
    ...(attrs !== undefined && { attrs }),
  }
}
