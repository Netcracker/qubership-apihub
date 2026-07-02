import { PgTypeKind, TypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { DdlApiTreeNodeKind, DdlApiTreeNodeKinds } from '../types/node-kind'

/**
 * View-model for one rendered line in {@link DdlTableViewer}.
 *
 * Each tree node kind maps to a row-shaped value object. The viewer reads plain
 * fields (names, labels, booleans) and does not walk ddlapi `Realm`/`Table`/`Column`.
 * A tree builder is responsible for formatting `SchemaType` into {@link DdlApiColumnTypeValue}
 * and for resolving chips from table/column/index metadata.
 *
 * ## Tree layout (one table document)
 *
 * ```
 * TABLE          →  tableName  [schemaName?]
 * COLUMNS        →  title: "Columns"
 * COLUMN (×N)    →  columnName columnType.label [chips…] [(fkTarget?)]
 * INDEXES        →  title: "Indexes"
 * INDEX (×M)     →  indexName (part1, part2, …) [unique?]
 * ```
 *
 * `table.primaryKey` is never emitted as an INDEX row; PK is surfaced only as
 * {@link DdlApiColumnRowValue.isPrimaryKey} on column rows.
 */

/** Optional COMMENT ON text attached to a table, column, or index. Source: `findAttr(attrs, Comment).text`. */
export interface DdlApiRowDescription {
  readonly description?: string
}

/**
 * Header row: table identity.
 *
 * | Field | ddlapi source |
 * |-------|---------------|
 * | `tableName` | `Table.name` |
 * | `schemaName` | parent `Schema.name` (omit when UI hides default schema) |
 * | `description` | `findAttr(table.attrs, Comment)?.text` |
 */
export interface DdlApiTableRowValue extends DdlApiRowDescription {
  readonly tableName: string
  readonly schemaName?: string
}

/** Static section heading (`"Columns"` or `"Indexes"`). No ddlapi backing object. */
export interface DdlApiSectionHeaderRowValue {
  readonly title: string
}

/**
 * Target of an inline / table-level FOREIGN KEY shown in parentheses after the FK chip.
 *
 * | Field | ddlapi source |
 * |-------|---------------|
 * | `schemaName` | `Schema.name` of the schema that owns `ForeignKey.refTable`, or the
 *                owning table's schema when `refTable` is embedded in a partial realm |
 * | `tableName` | `ForeignKey.refTable.name` |
 * | `columnName` | `ForeignKey.refColumns[j].name` where `j` is the index of the column inside `ForeignKey.columns` |
 */
export interface DdlApiForeignKeyTarget {
  readonly schemaName: string
  readonly tableName: string
  readonly columnName: string
}

/**
 * Pre-rendered column type token for the row (`column_name` **type** …).
 *
 * Mirrors every member of ddlapi `SchemaType` from `types.d.ts`, plus fallbacks.
 * Always includes {@link DdlApiColumnTypeValue.label} — the exact string the viewer
 * prints between column name and chips (e.g. `character varying (30)`, `numeric (10, 2)`).
 *
 * Builder formatting rules (one variant per `SchemaType.kind`):
 *
 * | `kind` | Typical `typeName` / extras | `label` example |
 * |--------|----------------------------|-----------------|
 * | `BoolType` | `boolean` | `boolean` |
 * | `IntegerType` | `integer`, `bigint`, `smallint`, `serial`, … | `integer` |
 * | `DecimalType` | `numeric`, `decimal` + `precision`/`scale` | `numeric (10, 2)` |
 * | `FloatType` | `real`, `double precision` + optional `precision` | `double precision` |
 * | `StringType` | `varchar`, `char`, `character varying`, … + optional `size` | `varchar (255)` |
 * | `BinaryType` | `bytea`, `blob`, … + optional `size` | `bytea` |
 * | `TimeType` | `date`, `time`, `timestamp`, `timestamptz`, … + optional `precision`/`scale` | `timestamp (6)` |
 * | `JSONType` | `json`, `jsonb` | `jsonb` |
 * | `SpatialType` | `point`, `polygon`, … | `point` |
 * | `UUIDType` | `uuid` | `uuid` |
 * | `EnumType` | optional named `type` + `values[]` | `status` or first value list in detailed mode |
 * | `UnsupportedType` | `text`, `interval`, `money`, `inet`, arrays, … | dialect spelling in `typeName` (e.g. `bit (8)`) |
 * | `Domain` (`PgTypeKind`) | PostgreSQL domain object on column | domain name, optionally with base type |
 * | `UnknownType` | any other escape-hatch `kind` string | best-effort from object fields |
 * | `Raw` | `ColumnType.raw` when `type` is absent or unmapped | raw SQL fragment |
 */
export type DdlApiColumnTypeValue =
  | DdlApiColumnTypeBool
  | DdlApiColumnTypeInteger
  | DdlApiColumnTypeDecimal
  | DdlApiColumnTypeFloat
  | DdlApiColumnTypeString
  | DdlApiColumnTypeBinary
  | DdlApiColumnTypeTime
  | DdlApiColumnTypeJson
  | DdlApiColumnTypeSpatial
  | DdlApiColumnTypeUuid
  | DdlApiColumnTypeEnum
  | DdlApiColumnTypeUnsupported
  | DdlApiColumnTypePgDomain
  | DdlApiColumnTypeUnknown
  | DdlApiColumnTypeRaw

interface DdlApiColumnTypeBase {
  /** Ready-to-display type text for the column row. */
  readonly label: string
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.BoolType`. */
export interface DdlApiColumnTypeBool extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.BoolType
  readonly typeName: string
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.IntegerType`. */
export interface DdlApiColumnTypeInteger extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.IntegerType
  readonly typeName: string
  readonly unsigned?: boolean
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.DecimalType`. */
export interface DdlApiColumnTypeDecimal extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.DecimalType
  readonly typeName: string
  readonly precision?: number
  readonly scale?: number
  readonly unsigned?: boolean
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.FloatType`. */
export interface DdlApiColumnTypeFloat extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.FloatType
  readonly typeName: string
  readonly precision?: number
  readonly unsigned?: boolean
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.StringType`. */
export interface DdlApiColumnTypeString extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.StringType
  readonly typeName: string
  readonly size?: number
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.BinaryType`. */
export interface DdlApiColumnTypeBinary extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.BinaryType
  readonly typeName: string
  readonly size?: number
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.TimeType`. */
export interface DdlApiColumnTypeTime extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.TimeType
  readonly typeName: string
  readonly precision?: number
  readonly scale?: number
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.JSONType`. */
export interface DdlApiColumnTypeJson extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.JSONType
  readonly typeName: string
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.SpatialType`. */
export interface DdlApiColumnTypeSpatial extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.SpatialType
  readonly typeName: string
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.UUIDType`. */
export interface DdlApiColumnTypeUuid extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.UUIDType
  readonly typeName: string
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.EnumType`. */
export interface DdlApiColumnTypeEnum extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.EnumType
  readonly typeName?: string
  readonly values: readonly string[]
}

/** Source: `ColumnType.type` when `type.kind === TypeKind.UnsupportedType`. */
export interface DdlApiColumnTypeUnsupported extends DdlApiColumnTypeBase {
  readonly kind: typeof TypeKind.UnsupportedType
  readonly typeName: string
}

/**
 * Source: `ColumnType.type` when `type.kind === PgTypeKind.Domain` (`'Domain'` / `'pg:domain'`).
 * Same object may also appear in `Schema.objects`.
 */
export interface DdlApiColumnTypePgDomain extends DdlApiColumnTypeBase {
  readonly kind: typeof PgTypeKind.Domain
  readonly name: string
  readonly schemaName?: string
  /** Display of the domain base type when resolved. */
  readonly baseTypeLabel?: string
}

/** Source: `ColumnType.type` with any other `kind` string (driver escape hatch). */
export interface DdlApiColumnTypeUnknown extends DdlApiColumnTypeBase {
  readonly kind: string
}

/**
 * Fallback when `Column.type` is missing or only `ColumnType.raw` is populated.
 * Source: `ColumnType.raw`.
 */
export interface DdlApiColumnTypeRaw extends DdlApiColumnTypeBase {
  readonly kind: 'Raw'
  readonly raw: string
}

/**
 * One column line:
 * `columnName columnType.label [PK] [FK (schema.table.column)] [generated] [unique] [not null]`
 *
 * | Field | Show when | ddlapi source |
 * |-------|-----------|---------------|
 * | `columnName` | always | `Column.name` |
 * | `columnType` | always | `Column.type` → {@link DdlApiColumnTypeValue} |
 * | `isPrimaryKey` | column ∈ PK | `Table.primaryKey.parts[*].column === column` |
 * | `isForeignKey` | column ∈ FK | `Table.foreignKeys[*].columns` contains column |
 * | `foreignKeyTarget` | `isForeignKey` | resolved from matching `ForeignKey` |
 * | `isGenerated` | IDENTITY or GENERATED AS | `column.attrs`: `Identity` or `GeneratedExpr` |
 * | `generatedBy` | `isGenerated` | `'identity'` → `PgAttrKind.Identity`; `'expression'` → `AttrKind.GeneratedExpr`. Stored for API consumers; api-doc-viewer always shows badge **generated** and does not surface identity vs expression in the UI. |
 * | `isUnique` | single-column unique index/constraint | `Table.indexes[*].unique && parts.length === 1 && parts[0].column === column` |
 * | `isNotNull` | explicit NOT NULL | `ColumnType.null === false` (`undefined` → false; explicit `NULL` → false) |
 * | `description` | COMMENT ON COLUMN | `findAttr(column.attrs, Comment)?.text` |
 * | `defaultValue` | `Column.default` present | `Column.default` → {@link formatDdlExpr} |
 * | `generatedExpression` | `GeneratedExpr` attr (not IDENTITY) | `findAttr(column.attrs, GeneratedExpr).expr` |
 * | `enumValues` | `columnType.kind === EnumType` | `Column.type.type.values` (same list as {@link DdlApiColumnTypeEnum.values}) |
 */
export interface DdlApiColumnRowValue extends DdlApiRowDescription {
  readonly columnName: string
  readonly columnType: DdlApiColumnTypeValue
  /** Enum literals when {@link columnType} is {@link DdlApiColumnTypeEnum}; omitted for other types. */
  readonly enumValues?: readonly string[]
  readonly isPrimaryKey: boolean
  readonly isForeignKey: boolean
  readonly foreignKeyTarget?: DdlApiForeignKeyTarget
  readonly isGenerated: boolean
  /** ddlapi source kind when {@link isGenerated}; not reflected in column badge text (viewer uses **generated** for both). */
  readonly generatedBy?: 'identity' | 'expression'
  readonly isUnique: boolean
  readonly isNotNull: boolean
  readonly defaultValue?: string
  readonly generatedExpression?: string
}

/**
 * One index line:
 * `indexName (part1, part2, …, partN) [unique]`
 *
 * Lists `Table.indexes` only (not `Table.primaryKey`).
 *
 * | Field | ddlapi source |
 * |-------|---------------|
 * | `indexName` | `Index.name` (may be absent for unnamed inline UNIQUE) |
 * | `partNames` | ordered display for each `IndexPart`: `part.column.name` or formatted `part.expr` |
 * | `isUnique` | `Index.unique === true` |
 * | `description` | COMMENT ON INDEX | `findAttr(index.attrs, Comment)?.text` |
 */
export interface DdlApiIndexRowValue extends DdlApiRowDescription {
  readonly indexName?: string
  readonly partNames: readonly string[]
  readonly isUnique: boolean
}

/** Maps each tree node kind to its row value shape. */
export type DdlApiTreeNodeValue<K extends DdlApiTreeNodeKind = DdlApiTreeNodeKind> =
  K extends typeof DdlApiTreeNodeKinds.TABLE ? DdlApiTableRowValue
  : K extends typeof DdlApiTreeNodeKinds.COLUMNS ? DdlApiSectionHeaderRowValue
  : K extends typeof DdlApiTreeNodeKinds.COLUMN ? DdlApiColumnRowValue
  : K extends typeof DdlApiTreeNodeKinds.INDEXES ? DdlApiSectionHeaderRowValue
  : K extends typeof DdlApiTreeNodeKinds.INDEX ? DdlApiIndexRowValue
  : never
