// Private module — string constants for libpg-query AST values.
//
// These node-type keys, Constraint.contype values, and CommentStmt.objtype
// values are used for bracket access (`node['ColumnDef']`) and plain string
// comparison, neither of which TypeScript type-checks — a typo silently returns
// undefined or never matches. Naming them once here keeps every parser module
// agreeing on the same spellings.

/** libpg-query node-type keys: statement bodies (`stmtBody`) and wrapped child nodes. */
export const PgNode = {
  // statement nodes
  CreateStmt: 'CreateStmt',
  IndexStmt: 'IndexStmt',
  CommentStmt: 'CommentStmt',
  CreateDomainStmt: 'CreateDomainStmt',
  CreateEnumStmt: 'CreateEnumStmt',
  CompositeTypeStmt: 'CompositeTypeStmt',
  CreateRangeStmt: 'CreateRangeStmt',
  CreateTrigStmt: 'CreateTrigStmt',
  // structural / child nodes
  A_Const: 'A_Const',
  ColumnDef: 'ColumnDef',
  Constraint: 'Constraint',
  DefElem: 'DefElem',
  IndexElem: 'IndexElem',
  Integer: 'Integer',
  List: 'List',
  PartitionElem: 'PartitionElem',
  RangeVar: 'RangeVar',
  TableLikeClause: 'TableLikeClause',
  TypeName: 'TypeName',
} as const

/** libpg-query Constraint.contype values. */
export const PgConstrType = {
  NotNull: 'CONSTR_NOTNULL',
  Null: 'CONSTR_NULL',
  Default: 'CONSTR_DEFAULT',
  Check: 'CONSTR_CHECK',
  PrimaryKey: 'CONSTR_PRIMARY',
  Unique: 'CONSTR_UNIQUE',
  ForeignKey: 'CONSTR_FOREIGN',
  Generated: 'CONSTR_GENERATED',
  Identity: 'CONSTR_IDENTITY',
  Exclusion: 'CONSTR_EXCLUSION',
} as const

/** libpg-query CommentStmt.objtype values. */
export const PgCommentObject = {
  Table: 'OBJECT_TABLE',
  Column: 'OBJECT_COLUMN',
  TableConstraint: 'OBJECT_TABCONSTRAINT',
  Index: 'OBJECT_INDEX',
  Type: 'OBJECT_TYPE',
  Schema: 'OBJECT_SCHEMA',
} as const
