import { DdlDiffDialect, DIALECT_ID_POSTGRES } from './ddl.dialect'
import { PG_DEFAULT_SCHEMA } from './ddl.const'

/**
 * PostgreSQL diff dialect. It supplies the default-schema name and leaves the escape-hatch
 * `*RulesFor` lookups empty (unknown PG kinds fall through to the core `unclassified`
 * catch-all); `typeFamilyFor` is left unset, so the core consumption-family mapping handles
 * PG's core types. Kept deliberately parallel to api-unifier's `DIALECT_POSTGRES`.
 */
export const DIALECT_DIFF_POSTGRES: DdlDiffDialect = {
  id: DIALECT_ID_POSTGRES,
  defaultSchemaName: PG_DEFAULT_SCHEMA,
  attrRulesFor: () => undefined,
  objectRulesFor: () => undefined,
  typeRulesFor: () => undefined,
}
