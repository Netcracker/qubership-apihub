import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import {
  DEFAULT_TYPE_FLAG_PURE,
  DEFAULT_TYPE_FLAG_SYNTHETIC,
  DefaultMetaRecord,
  DefaultTypeFlag,
  UnifyFunction,
} from '../types'
import { isBroken, isPureCombiner } from './type'
import { cleanOrigins, resolveOrigins, setOrigins } from '../origins'
import { getJsoProperty, setJsoProperty } from '../utils'
import { DdlapiProperties } from '@netcracker/qubership-apihub-ddlapi'

// The names of the columns in the table's primary key (primaryKey.parts[].column).
const primaryKeyColumns = (table: Record<PropertyKey, unknown>): Set<string> => {
  const set = new Set<string>()
  const pk = table[DdlapiProperties.PrimaryKey]
  if (!isObject(pk)) { return set }
  const parts = (pk as Record<PropertyKey, unknown>)[DdlapiProperties.Parts]
  if (!isArray(parts)) { return set }
  for (const part of parts) {
    if (isObject(part)) {
      const column = (part as Record<PropertyKey, unknown>)[DdlapiProperties.Column]
      if (typeof column === 'string') { set.add(column) }
    }
  }
  return set
}

// ANSI nullability default: a column with no nullability clause is
// nullable, EXCEPT a primary-key member, which is implicitly NOT NULL.
const nullabilityDefaultFor = (isPrimaryKeyMember: boolean): boolean => !isPrimaryKeyMember

const columnTypesWithDefault = (
  table: Record<PropertyKey, unknown>,
): Array<{ colType: Record<PropertyKey, unknown>; column: Record<PropertyKey, unknown>; def: boolean }> => {
  const columns = table[DdlapiProperties.Columns]
  if (!isArray(columns)) { return [] }
  const pkColumns = primaryKeyColumns(table)
  const result: Array<{ colType: Record<PropertyKey, unknown>; column: Record<PropertyKey, unknown>; def: boolean }> = []
  for (const item of columns) {
    if (!isObject(item)) { continue }
    const column = item as Record<PropertyKey, unknown>
    const colType = column[DdlapiProperties.Type]
    if (!isObject(colType)) { continue } // no type clause → no nullability to default
    const name = column[DdlapiProperties.Name]
    result.push({
      colType: colType as Record<PropertyKey, unknown>,
      column,
      def: nullabilityDefaultFor(typeof name === 'string' && pkColumns.has(name)),
    })
  }
  return result
}

/**
 * Table-level forward/backward unify that is the SOLE owner of `ColumnType.null`
 * defaulting. Primary-key membership needs table-scope context a column-level
 * rule lacks, so all nullability logic lives in one place, mirroring `pathItemsUnification`.
 *
 * DOCUMENTED EXCEPTION to the immutable-forward-pass rule: this mutates the
 * `ColumnType` in place (adding `null`) rather than recreating the Column and its
 * ColumnType under the table. This is the sanctioned `pathItemsUnification` situation;
 * do not generalize the pattern to other rules.
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
