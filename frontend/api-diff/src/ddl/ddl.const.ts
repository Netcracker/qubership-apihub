// Property-name / kind constants for the ddlapi diff rules. The model enums are
// re-exported from ddlapi so the rule tree, classifiers, mappings and description
// calculators never hand-duplicate the string literals (apply the ddlapi-using skill).
export {
  AttrKind,
  DdlapiProperties,
  ExprKind,
  ObjectKind,
  ReferenceOption,
  SqlTypeName,
  TypeKind,
} from '@netcracker/qubership-apihub-ddlapi'
export {
  PG_DEFAULT_SCHEMA,
  PgSqlTypeName,
} from '@netcracker/qubership-apihub-ddlapi'

import { SPEC_TYPE_DDL_API_1 } from '@netcracker/qubership-apihub-api-unifier'

export type DdlApiSpecVersion = typeof SPEC_TYPE_DDL_API_1

// --- description template-param keys ---
export const TEMPLATE_PARAM_FACET = 'facet'
export const TEMPLATE_PARAM_TABLE_NAME = 'tableName'
export const TEMPLATE_PARAM_COLUMN_NAME = 'columnName'
export const TEMPLATE_PARAM_SCHEMA_NAME = 'schemaName'
export const TEMPLATE_PARAM_ENUM_TYPE_NAME = 'enumTypeName'
export const TEMPLATE_PARAM_ENUM_VALUE = 'enumValue'
export const TEMPLATE_PARAM_OLD_VALUE = 'oldValue'
export const TEMPLATE_PARAM_NEW_VALUE = 'newValue'
export const TEMPLATE_PARAM_INDEX_NAME = 'indexName'
export const TEMPLATE_PARAM_FK_NAME = 'fkName'
export const TEMPLATE_PARAM_CHECK_NAME = 'checkName'
// The short, single value carried inline on an add/delete (e.g. a default, collation,
// comment text, check expression). Distinct from old/new which carry a change's endpoints.
export const TEMPLATE_PARAM_VALUE = 'value'
// `index` / `unique index` — the index kind word, switched on the index's `unique` flag.
export const TEMPLATE_PARAM_INDEX_KIND = 'indexKind'
// Precomposed key-column clause for an index / primary key: `column 'a'` or `columns 'a', 'b'`.
export const TEMPLATE_PARAM_COLUMNS_CLAUSE = 'columnsClause'
// Precomposed single index-part clause: `column 'b'` or `expression 'lower(a)'`.
export const TEMPLATE_PARAM_PART_CLAUSE = 'partClause'
// Precomposed foreign-key clauses (each carries its own `in schema` suffix when non-default):
// local = `on column 'a' of table 'u'`, ref = `referencing column 'x' of table 't'`.
export const TEMPLATE_PARAM_LOCAL_CLAUSE = 'localClause'
export const TEMPLATE_PARAM_REF_CLAUSE = 'refClause'
// `on-delete action` / `on-update action` — the changed referential-action word for an FK.
export const TEMPLATE_PARAM_FK_ACTION = 'fkAction'

// --- description facet values (the `{{facet}}` slot) ---
export const FACET_TYPE = 'type'
// NULL / NOT NULL is modelled as a column constraint in DDL, so the facet word reads
// `constraint` (the rendered values are the `NULL` / `NOT NULL` keywords themselves).
export const FACET_NULLABILITY = 'constraint'
export const FACET_DEFAULT = 'default'
export const FACET_DESCRIPTION = 'description'
export const FACET_COLLATION = 'collation'
export const FACET_GENERATED = 'generated expression'

// Free-text values (comment text, check / generated / default expressions) are truncated to
// this many characters in a description, with an ellipsis appended, so a long value cannot
// bloat the message. Short, controlled values (keywords, type names, seqNos) are never cut.
export const DESCRIPTION_VALUE_MAX_LENGTH = 40

/**
 * How a dashboard/`SELECT` consumes a column's values. Type-change classification is expressed
 * in terms of these families rather than raw SQL type names: a same-family change
 * keeps every previously-valid operation type-valid (non-breaking); a cross-family change
 * invalidates an operation (breaking). `Opaque` is the conservative catch-all (dialect
 * escape-hatch / undecidable) and is never "same family" as anything. This is a core-SQL
 * concept; a dialect only references it to map its escape-hatch types (`typeFamilyFor`).
 */
export const TypeConsumptionFamily = {
  Numeric: 'numeric',
  Textual: 'textual',
  Temporal: 'temporal',
  Boolean: 'boolean',
  Binary: 'binary',
  Uuid: 'uuid',
  Json: 'json',
  Enum: 'enum',
  Opaque: 'opaque',
} as const
export type TypeConsumptionFamily = typeof TypeConsumptionFamily[keyof typeof TypeConsumptionFamily]
