import { MapKeysResult, MappingArrayResolver } from '../types'
import { onlyExistedArrayIndexes } from '../utils'

/**
 * Creates an array-mapping resolver that matches items by the value of a given property.
 *
 * For each non‑sparse index in the `before` and `after` arrays, this resolver:
 *
 * - Reads `propertyKey` from the array element (only if the element is a non‑null object)
 * - Builds a lookup from string property value → index for the `after` array
 * - For every `before[i]` whose property value is a string present in the lookup,
 *   records a mapping `i → j` where `j` is the corresponding index in `after`
 * - Treats `before` items whose property is missing or not found in `after` as **removed**
 * - Treats remaining `after` items that were never matched as **added**
 *
 * This is used for AsyncAPI arrays (e.g. messages, servers) where elements are
 * conceptually keyed by some identifier property (such as a captured reference key),
 * so that reordering the array does not produce spurious add/remove or rename diffs.
 *
 * @param propertyKey - The object property whose string value is used as the logical key
 *   to match `before` and `after` array items.
 * @returns A {@link MappingArrayResolver} that maps array indices based on `propertyKey`.
 */
export const createPropertyMappingResolver = (
  propertyKey: PropertyKey,
): MappingArrayResolver => (before, after) => {
  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeIndexes = onlyExistedArrayIndexes(before)
  const afterIndexes = onlyExistedArrayIndexes(after)

  // Build lookup: firstRefKey string value → after index
  const afterKeyToIndex = new Map<string, number>()
  for (const j of afterIndexes) {
    const item = after[j]
    if (item !== null && typeof item === 'object') {
      const key = (item as Record<PropertyKey, unknown>)[propertyKey]
      if (typeof key === 'string') {
        afterKeyToIndex.set(key, j)
      }
    }
  }

  const unmatchedAfterIndexes = new Set<number>(afterIndexes)

  for (const i of beforeIndexes) {
    const item = before[i]
    const key = (item !== null && typeof item === 'object')
      ? (item as Record<PropertyKey, unknown>)[propertyKey]
      : undefined

    if (typeof key === 'string' && afterKeyToIndex.has(key)) {
      const j = afterKeyToIndex.get(key)!
      result.mapped[i] = j
      unmatchedAfterIndexes.delete(j)
    } else {
      result.removed.push(i)
    }
  }

  for (const j of unmatchedAfterIndexes) {
    result.added.push(j)
  }

  return result
}
