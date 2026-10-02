import { createKeyMappingResolver, createPropertyMappingResolver, deepEqualsUniqueItemsArrayMappingResolver } from '../core'
import { MappingArrayResolver } from '../types'
import { isArray, isObject, isString } from '../utils'
import { DdlapiProperties } from './ddl.const'

// ddlapi collections are arrays whose elements have stable identity keys, so the default
// positional resolver is wrong (it reports a reorder as add+remove). These identity-based
// resolvers key elements by their logical identity.

/** schemas[] / tables[] / columns[] — keyed by `name`. */
export const nameMappingResolver: MappingArrayResolver = createPropertyMappingResolver(DdlapiProperties.Name)

/**
 * foreignKeys[] identity — the constraint name, or, for a key that has none, the columns it
 * covers. An inline `REFERENCES` clause parses to a key with no `symbol`, and a key-less element
 * is left unmatched by the resolver: without the fallback, a key that only changes its referenced
 * table or columns reports the whole key as removed and re-added. The `columns:` prefix keeps the
 * two key spaces apart so a named key can never collide with an unnamed one.
 */
const foreignKeyIdentityKey = (item: unknown): string | undefined => {
  if (!isObject(item)) { return undefined }
  const symbol = item[DdlapiProperties.Symbol]
  if (isString(symbol)) { return symbol }
  const columns = item[DdlapiProperties.Columns]
  return isArray(columns) && columns.length > 0 && columns.every(isString)
    ? `columns:${columns.join(',')}`
    : undefined
}

/** foreignKeys[] — keyed by `symbol`, falling back to the covered columns for an unnamed key. */
export const foreignKeyMappingResolver: MappingArrayResolver = createKeyMappingResolver(foreignKeyIdentityKey)

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

/** Column name of an index part (`part.column`), or `undefined` for an expression part. */
const indexPartColumnName = (part: unknown): string | undefined => {
  if (!isObject(part)) { return undefined }
  const column = part[DdlapiProperties.Column]
  return isString(column) ? column : undefined
}

/**
 * indexes[] identity — the index name, or, for an index that has none, the columns it covers.
 * An inline `UNIQUE` column constraint parses to an index with no `name`, and a key-less element
 * is left unmatched by the resolver: without the fallback, two identical unnamed indexes on the
 * same table map to nothing and an *unchanged* table reports every index as removed and re-added.
 * The `columns:` prefix keeps the two key spaces apart so a named index can never collide with an
 * unnamed one. An index whose parts are not all plain column references (an expression index) has
 * no stable fallback identity and stays unmatched.
 */
const indexIdentityKey = (item: unknown): string | undefined => {
  if (!isObject(item)) { return undefined }
  const name = item[DdlapiProperties.Name]
  if (isString(name)) { return name }
  const parts = item[DdlapiProperties.Parts]
  if (!isArray(parts)) { return undefined }
  const columns = parts.map(indexPartColumnName)
  return columns.every((column): column is string => column !== undefined)
    ? `columns:${columns.join(',')}`
    : undefined
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
 * index.parts[] — keyed by the column name so that adding or removing a column is a
 * clean element diff and the two parts of a column-order swap map to themselves (the swap then
 * surfaces as `seqNo` replace diffs, not add/remove churn).
 */
export const indexPartMappingResolver: MappingArrayResolver = createKeyMappingResolver(indexPartColumnName)

/**
 * indexes[] — keyed by `name`, falling back to the covered columns for an unnamed index
 * (see {@link indexIdentityKey}).
 */
export const indexMappingResolver: MappingArrayResolver = createKeyMappingResolver(indexIdentityKey)
