/** Discriminants for the SchemaObject union. Mirrors Go's Object marker interface (obj()). */
export const ObjectKind = {
  Table:        'Table',
  View:         'View',
  Index:        'Index',        // `kind` field is TS-only; Go uses struct type + obj() marker
  ForeignKey:   'ForeignKey',   // `kind` field is TS-only; Go uses struct type + obj() marker
  Check:        'Check',        // also in AttrKind
  NamedDefault: 'NamedDefault', // also in ExprKind (NamedDefault embeds Expr in Go)
  EnumType:     'EnumType',     // also in TypeKind
} as const
export type ObjectKind = typeof ObjectKind[keyof typeof ObjectKind]

/** Discriminants for the SchemaType union. Mirrors Go's Type marker interface (typ()). */
export const TypeKind = {
  BoolType:        'BoolType',
  EnumType:        'EnumType',     // also in ObjectKind
  IntegerType:     'IntegerType',
  DecimalType:     'DecimalType',
  FloatType:       'FloatType',
  StringType:      'StringType',
  BinaryType:      'BinaryType',
  TimeType:        'TimeType',
  JSONType:        'JSONType',
  SpatialType:     'SpatialType',
  UUIDType:        'UUIDType',
  UnsupportedType: 'UnsupportedType',
} as const
export type TypeKind = typeof TypeKind[keyof typeof TypeKind]

/** Discriminants for the Expr union. Mirrors Go's Expr marker interface (expr()). */
export const ExprKind = {
  Literal: 'Literal',
  RawExpr: 'RawExpr',
} as const
export type ExprKind = typeof ExprKind[keyof typeof ExprKind]

/** Discriminants for the Attr union. Mirrors Go's Attr marker interface (attr()). */
export const AttrKind = {
  Comment:       'Comment',
  Charset:       'Charset',
  Collation:     'Collation',
  Check:         'Check',        // also in ObjectKind
  GeneratedExpr: 'GeneratedExpr',
} as const
export type AttrKind = typeof AttrKind[keyof typeof AttrKind]

/** Discriminants for DdlNonFatalError.kind. */
export const DdlErrorKind = {
  OutOfScopeStatement:  'out-of-scope-statement',
  UnresolvedReference:  'unresolved-reference',
  DuplicateObject:      'duplicate-object',
  UnresolvedLikeSource: 'unresolved-like-source',
} as const
export type DdlErrorKind = typeof DdlErrorKind[keyof typeof DdlErrorKind]

/**
 * Canonical SQL type name strings written into SchemaType.type.
 * These are ANSI SQL standard names shared across dialects.
 * PostgreSQL-only type names live in PgSqlTypeName (postgres.constants.ts).
 */
export const SqlTypeName = {
  // BoolType
  Boolean:          'boolean',
  // IntegerType
  SmallInt:         'smallint',
  Integer:          'integer',
  BigInt:           'bigint',
  // FloatType
  Real:             'real',
  DoublePrecision:  'double precision',
  // DecimalType
  Numeric:          'numeric',
  // StringType
  Varchar:          'varchar',
  Char:             'char',
  // TimeType
  Date:             'date',
  Time:             'time',
  Timestamp:        'timestamp',
} as const
export type SqlTypeName = typeof SqlTypeName[keyof typeof SqlTypeName]

/**
 * Reference options (actions) specified by ON UPDATE and ON DELETE
 * subclauses of the FOREIGN KEY clause.
 */
export const ReferenceOption = {
  NoAction:   'NO ACTION',
  Restrict:   'RESTRICT',
  Cascade:    'CASCADE',
  SetNull:    'SET NULL',
  SetDefault: 'SET DEFAULT',
} as const
export type ReferenceOption = typeof ReferenceOption[keyof typeof ReferenceOption]
