import { NormalizationRules } from '../types'
import { DefaultValueMapping } from '../unifies/defaults'

// Dialect-separation seam. The core ddlapi rules (`ddlApiRules`) handle the
// closed, driver-neutral unions; everything dialect-specific (PostgreSQL escape-hatch
// `kind`s and dialect-only primitive defaults) is supplied through a `DdlApiDialect`
// registry so the core stays ignorant of any one dialect. Adding a future dialect is a
// new module implementing this contract — no core edits.

export const DIALECT_ID_POSTGRES = 'postgres'

export type DialectId = typeof DIALECT_ID_POSTGRES

/**
 * Registry contract a dialect implements. The `*RulesFor(kind)` lookups are consulted
 * by the core union `kind`-dispatchers for kinds the core does not recognise; returning
 * `undefined` lets the core fall back to its generic `Unknown*` passthrough, so every
 * dialect shares one fallback.
 *
 * Returns `NormalizationRules`  so a dialect kind can carry nested child-path rules (e.g. Partition.parts).
 */
export interface DdlApiDialect {
  readonly id: DialectId
  attrRulesFor(kind: string): NormalizationRules | undefined
  objectRulesFor(kind: string): NormalizationRules | undefined
  typeRulesFor(kind: string): NormalizationRules | undefined
  /** Dialect-only primitive defaults (e.g. `unsigned`, `GeneratedExpr.type`). */
  readonly primitiveDefaults?: DefaultValueMapping
}

// The PostgreSQL implementation of DdlApiDialect lives in ./ddlapi.postgres (DIALECT_POSTGRES).
