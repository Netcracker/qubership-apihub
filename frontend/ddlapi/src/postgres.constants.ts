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
