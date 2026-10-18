import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import {
  DEFAULT_TYPE_FLAG_PURE,
  DEFAULT_TYPE_FLAG_SYNTHETIC,
  DefaultMetaRecord,
  DefaultTypeFlag,
  TransformFunction,
  UnifyFunction,
} from '../types'
import { isBroken, isPureCombiner } from './type'
import { cleanOrigins, resolveOrigins, setOrigins } from '../origins'
import { getJsoProperty, setJsoProperty } from '../utils'
import { ErrorMessage } from '../errors'
import { DdlapiProperties } from '@netcracker/qubership-apihub-ddlapi'

// The set of Column instances participating in the table's primary key, keyed by
// reference identity against primaryKey.parts[].column (the very same Column instances).
const primaryKeyColumns = (table: Record<PropertyKey, unknown>): Set<unknown> => {
  const set = new Set<unknown>()
  const pk = table[DdlapiProperties.PrimaryKey]
  if (!isObject(pk)) { return set }
  const parts = (pk as Record<PropertyKey, unknown>)[DdlapiProperties.Parts]
  if (!isArray(parts)) { return set }
  for (const part of parts) {
    if (isObject(part)) {
      const column = (part as Record<PropertyKey, unknown>)[DdlapiProperties.Column]
      if (isObject(column)) { set.add(column) }
    }
  }
  return set
}

// ANSI nullability default: a column with no nullability clause is
// nullable, EXCEPT a primary-key member, which is implicitly NOT NULL.
const nullabilityDefaultFor = (isPrimaryKeyMember: boolean): boolean => !isPrimaryKeyMember

/**
 * Forward-only reporter for dangling FK edges from a partial build: a ForeignKey that
 * has source columns but no resolved `refTable` is reported via `onUnifyError` and left as-is
 * — never thrown, honouring ddlapi's partial-realm guarantee. Uses a stable message prefix.
 */
export const reportDanglingForeignKey: TransformFunction = (value, { options, path }) => {
  if (!isObject(value) || isArray(value)) { return value }
  const fk = value as Record<PropertyKey, unknown>
  const columns = fk[DdlapiProperties.Columns]
  const hasSourceColumns = isArray(columns) && columns.length > 0
  if (hasSourceColumns && !isObject(fk[DdlapiProperties.RefTable])) {
    const symbol = typeof fk[DdlapiProperties.Symbol] === 'string' ? (fk[DdlapiProperties.Symbol] as string) : undefined
    options.onUnifyError?.(ErrorMessage.ddlApiDanglingForeignKey(symbol), path, value)
  }
  return value
}

const columnTypesWithDefault = (
  table: Record<PropertyKey, unknown>,
): Array<{ colType: Record<PropertyKey, unknown>; column: Record<PropertyKey, unknown>; def: boolean }> => {
  const columns = table[DdlapiProperties.Columns]
  if (!isArray(columns)) { return [] }
  const pkColumns = primaryKeyColumns(table)
  const result: Array<{ colType: Record<PropertyKey, unknown>; column: Record<PropertyKey, unknown>; def: boolean }> = []
  for (const column of columns) {
    if (!isObject(column)) { continue }
    const colType = (column as Record<PropertyKey, unknown>)[DdlapiProperties.Type]
    if (!isObject(colType)) { continue } // no type clause → no nullability to default
    result.push({
      colType: colType as Record<PropertyKey, unknown>,
      column: column as Record<PropertyKey, unknown>,
      def: nullabilityDefaultFor(pkColumns.has(column)),
    })
  }
  return result
}

/**
 * Table-level forward/backward unify that is the SOLE owner of `ColumnType.null`
 * defaulting. Primary-key membership needs table-scope context a column-level
 * rule lacks, so all nullability logic lives in one place, mirroring `pathItemsUnification`.
 *
 * DOCUMENTED EXCEPTION to the immutable-forward-pass rule: this mutates the shared
 * `ColumnType` in place (adding `null`) rather than recreating it, because the ColumnType
 * (and the Column that holds it) is shared by index parts and FK column lists — deep-copying
 * it would break referential identity. This is the sanctioned `pathItemsUnification`
 * situation; do not generalize the pattern to other rules.
 */
export const ddlApiNullabilityDefault: UnifyFunction = {
  forward: (value, { options }) => {
    if (!isObject(value) || isArray(value)) { return value }
    if (isPureCombiner(value as Record<PropertyKey, unknown>) || isBroken(value as Record<PropertyKey, unknown>)) { return value }
    const { originsFlag, defaultsFlag, createOriginsForDefaults } = options

    for (const { colType, column, def } of columnTypesWithDefault(value as Record<PropertyKey, unknown>)) {
      const present = DdlapiProperties.Null in colType
      if (present && colType[DdlapiProperties.Null] !== def) {
        continue // explicit, non-default nullability — leave untouched
      }
      const flag: DefaultTypeFlag = present ? DEFAULT_TYPE_FLAG_PURE : DEFAULT_TYPE_FLAG_SYNTHETIC
      if (!present) {
        colType[DdlapiProperties.Null] = def // in-place mutation (documented exception)
        if (originsFlag) {
          const colTypeOrigins = resolveOrigins(column, DdlapiProperties.Type, originsFlag)
          setOrigins(colType, DdlapiProperties.Null, originsFlag, createOriginsForDefaults(colTypeOrigins))
        }
      }
      if (defaultsFlag) {
        const meta: DefaultMetaRecord = { ...((getJsoProperty(colType, defaultsFlag) as DefaultMetaRecord) ?? {}) }
        meta[DdlapiProperties.Null] = flag
        setJsoProperty(colType, defaultsFlag, meta)
      }
    }
    return value
  },
  backward: (value, { options, path }) => {
    if (!isObject(value) || isArray(value)) { return }
    if (isBroken(value as Record<PropertyKey, unknown>)) { return }
    const { originsFlag, defaultsFlag, skip } = options

    for (const { colType, def } of columnTypesWithDefault(value as Record<PropertyKey, unknown>)) {
      if (!(DdlapiProperties.Null in colType)) { continue }
      if (colType[DdlapiProperties.Null] !== def) { continue } // explicit non-default — keep
      if (skip && skip(colType[DdlapiProperties.Null], [...path, DdlapiProperties.Null])) { continue }
      delete colType[DdlapiProperties.Null]
      cleanOrigins(colType, DdlapiProperties.Null, originsFlag)
      // This unify is the sole writer of the ColumnType's defaults flag (only `null`), so
      // remove it wholesale, as valueDefaults.backward does for the nodes it owns.
      if (defaultsFlag) { delete colType[defaultsFlag] }
    }
  },
}
