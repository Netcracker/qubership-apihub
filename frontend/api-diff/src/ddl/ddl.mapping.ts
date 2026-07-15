import { createKeyMappingResolver, createPropertyMappingResolver, deepEqualsUniqueItemsArrayMappingResolver } from '../core'
import { MappingArrayResolver } from '../types'
import { isObject, isString } from '../utils'
import { DdlapiProperties } from './ddl.const'

// ddlapi collections are arrays whose elements have stable identity keys, so the default
// positional resolver is wrong (it reports a reorder as add+remove). These identity-based
// resolvers key elements by their logical identity.

/** schemas[] / tables[] / columns[] / indexes[] — keyed by `name`. */
export const nameMappingResolver: MappingArrayResolver = createPropertyMappingResolver(DdlapiProperties.Name)

/** foreignKeys[] — keyed by `symbol`. */
export const symbolMappingResolver: MappingArrayResolver = createPropertyMappingResolver(DdlapiProperties.Symbol)

/**
 * Builds a composite identity key for an attr/object element: `kind` for singletons
 * (one Comment/Collation/… per owner) and `kind:<id>` for named members, where `<id>` is the
 * first present of `name` (Check, NamedDefault), `symbol` (ForeignKey) or `type` (EnumType).
 * Returns `undefined` for non-object / kind-less elements so they are treated as unmatched.
 */
const attrIdentityKey = (item: unknown): string | undefined => {
  if (!isObject(item)) { return undefined }
  const kind = item[DdlapiProperties.Kind]
  if (!isString(kind)) { return undefined }
  const id = item[DdlapiProperties.Name] ?? item[DdlapiProperties.Symbol] ?? item[DdlapiProperties.Type]
  return isString(id) ? `${kind}:${id}` : kind
}

/** Referenced column name of an index part (`part.column.name`), or `undefined`. */
const indexPartColumnName = (part: unknown): string | undefined => {
  if (!isObject(part)) { return undefined }
  const column = part[DdlapiProperties.Column]
  if (!isObject(column)) { return undefined }
  const name = column[DdlapiProperties.Name]
  return isString(name) ? name : undefined
}

/**
 * attrs[] / table objects[] resolver — composite `kind`[`:name`] identity.
 * A Comment is a singleton-per-owner (keyed on `kind` alone) → powers description
 * add/remove/change; two same-kind different-name attrs (e.g. two Checks) map independently.
 */
export const attrsMappingResolver: MappingArrayResolver = createKeyMappingResolver(attrIdentityKey)

/**
 * EnumType.values[] — set semantics (the value string itself is the key). Pairs with
 * `ignoreKeyDifference` on the rule node so a reorder/position change is not reported as a
 * key rename. Powers enum value add/remove.
 */
export const enumValuesMappingResolver: MappingArrayResolver = deepEqualsUniqueItemsArrayMappingResolver

/**
 * index.parts[] — keyed by the referenced column name so that adding or removing a column is a
 * clean element diff and the two parts of a column-order swap map to themselves (the swap then
 * surfaces as `seqNo` replace diffs, not add/remove churn).
 */
export const indexPartMappingResolver: MappingArrayResolver = createKeyMappingResolver(indexPartColumnName)
