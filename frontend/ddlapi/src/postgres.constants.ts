/** Discriminants for PostgreSQL escape-hatch attrs emitted by buildFromDdl. */
export const PgAttrKind = {
  Identity:           'Identity',
  Partition:          'Partition',
  Inherits:           'Inherits',
  StorageParams:      'StorageParams',
  Trigger:            'Trigger',
  IndexInclude:       'IndexInclude',
  IndexNullsDistinct: 'IndexNullsDistinct',
  IndexType:          'IndexType',
  IndexPredicate:     'IndexPredicate',
  Concurrently:       'Concurrently',
  IndexColumnProp:    'IndexColumnProp',
  IndexOpClass:       'IndexOpClass',
} as const
export type PgAttrKind = typeof PgAttrKind[keyof typeof PgAttrKind]

/** Discriminants for PostgreSQL escape-hatch schema objects emitted by buildFromDdl. */
export const PgObjectKind = {
  ExcludeConstraint: 'ExcludeConstraint',
  CompositeType:     'CompositeType',
  RangeType:         'RangeType',
  Domain:            'Domain',  // also in PgTypeKind
} as const
export type PgObjectKind = typeof PgObjectKind[keyof typeof PgObjectKind]

/** Discriminants for PostgreSQL escape-hatch types emitted by buildFromDdl. */
export const PgTypeKind = {
  Domain: 'Domain',  // also in PgObjectKind
} as const
export type PgTypeKind = typeof PgTypeKind[keyof typeof PgTypeKind]

/** Default schema name in a PostgreSQL database. */
export const PG_DEFAULT_SCHEMA = 'public'

/** Values for GeneratedExpr.type (GENERATED … stored-vs-virtual). */
export const PgGeneratedExprType = {
  Stored:  'STORED',
  Virtual: 'VIRTUAL',
} as const
export type PgGeneratedExprType = typeof PgGeneratedExprType[keyof typeof PgGeneratedExprType]

/** Values for the Identity attr's `generation` field. */
export const PgIdentityGeneration = {
  Always:    'ALWAYS',
  ByDefault: 'BY DEFAULT',
} as const
export type PgIdentityGeneration = typeof PgIdentityGeneration[keyof typeof PgIdentityGeneration]

/** Partition strategy values for the Partition attr's `type` field. */
export const PgPartitionStrategy = {
  Range: 'RANGE',
  List:  'LIST',
  Hash:  'HASH',
} as const
export type PgPartitionStrategy = typeof PgPartitionStrategy[keyof typeof PgPartitionStrategy]

/** Values for the Trigger attr's `timing` field. */
export const PgTriggerTiming = {
  Before:    'BEFORE',
  After:     'AFTER',
  InsteadOf: 'INSTEAD OF',
} as const
export type PgTriggerTiming = typeof PgTriggerTiming[keyof typeof PgTriggerTiming]

/** Values for entries of the Trigger attr's `events` array. */
export const PgTriggerEvent = {
  Insert:   'INSERT',
  Update:   'UPDATE',
  Delete:   'DELETE',
  Truncate: 'TRUNCATE',
} as const
export type PgTriggerEvent = typeof PgTriggerEvent[keyof typeof PgTriggerEvent]

/**
 * PostgreSQL-specific SQL type name strings written into SchemaType.type.
 * ANSI SQL standard names shared across dialects live in SqlTypeName (constants.ts).
 */
export const PgSqlTypeName = {
  // StringType
  Text:        'text',
  // BinaryType
  Bytea:       'bytea',
  // JSONType
  Json:        'json',
  Jsonb:       'jsonb',
  // UUIDType
  Uuid:        'uuid',
  // IntegerType — serial aliases (sugar for integer + sequence)
  SmallSerial: 'smallserial',
  Serial:      'serial',
  BigSerial:   'bigserial',
  // SpatialType
  Point:       'point',
  Line:        'line',
  Lseg:        'lseg',
  Box:         'box',
  Path:        'path',
  Polygon:     'polygon',
  Circle:      'circle',
} as const
export type PgSqlTypeName = typeof PgSqlTypeName[keyof typeof PgSqlTypeName]
