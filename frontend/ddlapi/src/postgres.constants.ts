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
