import { apiDiff } from '@netcracker/qubership-apihub-api-diff'
import type { Realm, Table } from '@netcracker/qubership-apihub-ddlapi'
import type { TableKey } from '@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key'

import { TEST_DIFF_META_KEYS } from '../ddlapi-diffs-suite/shared-test-data'
import { buildFromDdlInBrowser, resolveDdlDiffComparePair } from '../ddlapi-suite/build-from-ddl-browser'

/** Used only if the merged realm has no tables at all. */
const DEFAULT_TABLE_KEY: TableKey = {
  schemaName: 'public',
  name: 't',
}

/** Parse before/after SQL and merge them with apiDiff. */
export async function prepareDdlCompatibilitySuiteMergedSource(
  beforeSql: string,
  afterSql: string,
): Promise<Realm> {
  const [beforeRealm, afterRealm] = await Promise.all([
    buildFromDdlInBrowser(beforeSql),
    buildFromDdlInBrowser(afterSql),
  ])
  const { before, after } = resolveDdlDiffComparePair(beforeRealm, afterRealm)
  const { merged } = apiDiff(before, after, {
    unify: true,
    validate: true,
    metaKey: TEST_DIFF_META_KEYS.diffsMetaKey,
    normalizedResult: false,
  }) as { merged: Realm }

  return merged
}

/**
 * The diffs viewer renders one table.
 * Whole-table add/remove lives on the tables array, not on the table object.
 */
export function resolveDdlCompatibilitySuiteTableKey(merged: Realm): TableKey {
  const diffsMetaKey = TEST_DIFF_META_KEYS.diffsMetaKey

  for (const schema of merged.schemas ?? []) {
    const tables = schema.tables ?? []
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const table = tables[tableIndex]
      if (arrayElementHasDiff(tables, tableIndex, diffsMetaKey) || subtreeHasDiffMeta(table, diffsMetaKey)) {
        return {
          schemaName: schema.name,
          name: table.name,
        }
      }
    }
  }

  return firstTableKey(merged) ?? DEFAULT_TABLE_KEY
}

function firstTableKey(merged: Realm): TableKey | undefined {
  for (const schema of merged.schemas ?? []) {
    const table = schema.tables?.[0]
    if (table) {
      return {
        schemaName: schema.name,
        name: table.name,
      }
    }
  }

  return undefined
}

/** apiDiff stores add/remove of array items on the parent array, keyed by index. */
function arrayElementHasDiff(array: Table[], index: number, diffsMetaKey: symbol): boolean {
  const diffs = Reflect.get(array, diffsMetaKey) as Record<PropertyKey, unknown> | undefined
  if (diffs === undefined) {
    return false
  }

  return diffs[index] !== undefined || diffs[String(index)] !== undefined
}

/** Whether this node or anything nested on it holds apiDiff metadata. */
function subtreeHasDiffMeta(value: unknown, diffsMetaKey: symbol, seen: Set<object> = new Set()): boolean {
  if (value === null || typeof value !== 'object') {
    return false
  }
  if (seen.has(value)) {
    return false
  }
  seen.add(value)

  if ((value as Record<symbol, unknown>)[diffsMetaKey] !== undefined) {
    return true
  }

  if (Array.isArray(value)) {
    return value.some(item => subtreeHasDiffMeta(item, diffsMetaKey, seen))
  }

  return Object.values(value).some(nested => subtreeHasDiffMeta(nested, diffsMetaKey, seen))
}
