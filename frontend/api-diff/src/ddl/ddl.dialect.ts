import { CompareRules } from '../types'
import { TypeConsumptionFamily } from './ddl.const'

// Diff-side dialect-separation seam — the analogue of api-unifier's `DdlApiDialect`.
// `ddlRules` owns all core, driver-neutral SQL rules; everything dialect-specific
// (PostgreSQL escape-hatch `kind`s, the consumption-family of escape-hatch types, the
// default-schema name) is supplied through a `DdlDiffDialect`. A future dialect is a new
// module implementing this contract — no core edits. Kept structurally parallel to
// api-unifier so the two libraries stay aligned.

export const DIALECT_ID_POSTGRES = 'postgres'

export type DialectId = typeof DIALECT_ID_POSTGRES

/**
 * Registry contract a dialect implements. The `*RulesFor(kind)` lookups are consulted by
 * the core union `kind`-dispatchers for kinds the core does not classify; returning
 * `undefined` lets the core fall back to its single root-level `unclassified` catch-all.
 */
export interface DdlDiffDialect {
  readonly id: DialectId
  /** Schema whose name equals this is the default schema → the `in schema` clause is dropped. */
  readonly defaultSchemaName: string
  attrRulesFor(kind: string): CompareRules | undefined
  objectRulesFor(kind: string): CompareRules | undefined
  typeRulesFor(kind: string): CompareRules | undefined
  /** Dialect override of the SQL type → consumption-family mapping for escape-hatch types. */
  typeFamilyFor?(schemaType: unknown): TypeConsumptionFamily | undefined
}

// The PostgreSQL implementation lives in ./ddl.postgres (DIALECT_DIFF_POSTGRES).
