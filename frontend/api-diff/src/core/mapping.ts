import { MapKeysResult, MappingArrayResolver, MappingResolver } from '../types'
import { isObject, onlyExistedArrayIndexes } from '../utils'
import { deepEqual } from 'fast-equals'

//todo this method nor ready to sparse array
export const arrayMappingResolver: MappingResolver<number> = (before, after) => {
  const length = Math.abs(before.length - after.length)
  const arr = Array.from({ length: Math.min(before.length, after.length) }, ((_, i) => i))

  return {
    removed: before.length > after.length ? Array.from({ length }, (_, i) => after.length + i) : [],
    added: before.length < after.length ? Array.from({ length }, (_, i) => before.length + i) : [],
    mapped: arr.reduce((res, i) => {
      res[i] = i
      return res
    }, {} as Record<number, number>),
  }
}

export const customUniqueItemsArrayMappingResolver: (equalityFn: (one: unknown, another: unknown) => boolean) => MappingResolver<number> = (equalityFn) => (before, after) => {
  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeArrayIndexes = onlyExistedArrayIndexes(before)
  const afterArrayIndexes = onlyExistedArrayIndexes(after)
  const beforeMatchedArrayIndexes = new Set<number>(beforeArrayIndexes)
  const afterMatchedArrayIndexes = new Set<number>(afterArrayIndexes)

  // compare all combinations, find equality
  for (const i of beforeArrayIndexes) {
    const beforeItem = before[i]
    for (const j of afterArrayIndexes) {
      if (!afterMatchedArrayIndexes.has(j)) { continue }
      const afterItem = after[j]
      if (equalityFn(beforeItem, afterItem)) {
        afterMatchedArrayIndexes.delete(j)
        beforeMatchedArrayIndexes.delete(i)
        result.mapped[i] = j
        break
      }
    }
  }

  for (const j of afterMatchedArrayIndexes.values()) {
    result.added.push(j)
  }

  for (const i of beforeMatchedArrayIndexes.values()) {
    result.removed.push(i)
  }
  return result
}

export const deepEqualsUniqueItemsArrayMappingResolver: MappingResolver<number> = customUniqueItemsArrayMappingResolver(deepEqual)

/**
 * Creates an array-mapping resolver that matches `before`/`after` elements by a logical key
 * derived from each element. For each non‑sparse index this resolver:
 *
 * - Computes the element's key via `keyOf` (a `undefined` key leaves the element unmatched)
 * - Builds a lookup from key → index for the `after` array (first occurrence of a key wins)
 * - Maps every `before[i]` whose key has a still-unmatched counterpart `j` in `after`
 * - Treats `before` items whose key is missing or already consumed as **removed**
 * - Treats remaining `after` items that were never matched as **added**
 *
 * Each `after` index is consumed at most once, so surplus same-key items surface as
 * added/removed rather than being mapped twice. Reordering a keyed array therefore yields no
 * spurious add/remove or rename diffs.
 *
 * @param keyOf - Derives an element's logical key, or `undefined` to leave it unmatched.
 * @returns A {@link MappingArrayResolver} that maps array indices by the derived key.
 */
export const createKeyMappingResolver = (
  keyOf: (item: unknown) => string | undefined,
): MappingArrayResolver => (before, after) => {
  const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }
  const beforeIndexes = onlyExistedArrayIndexes(before)
  const afterIndexes = onlyExistedArrayIndexes(after)

  const afterKeyToIndex = new Map<string, number>()
  for (const j of afterIndexes) {
    const key = keyOf(after[j])
    if (key !== undefined && !afterKeyToIndex.has(key)) { afterKeyToIndex.set(key, j) }
  }

  const unmatchedAfterIndexes = new Set<number>(afterIndexes)
  for (const i of beforeIndexes) {
    const key = keyOf(before[i])
    const j = key !== undefined ? afterKeyToIndex.get(key) : undefined
    if (j !== undefined && unmatchedAfterIndexes.has(j)) {
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

/**
 * Creates an array-mapping resolver that matches items by the string value of a given property
 * (a {@link createKeyMappingResolver} whose key is that property). Elements that are not non‑null
 * objects, or whose property value is not a string, are left unmatched.
 *
 * This is used for arrays (e.g. AsyncAPI messages/servers, ddlapi tables/columns) where elements
 * are conceptually keyed by an identifier property (a name, symbol, or captured reference key),
 * so that reordering the array does not produce spurious add/remove or rename diffs.
 *
 * @param propertyKey - The object property whose string value is used as the logical key.
 * @returns A {@link MappingArrayResolver} that maps array indices based on `propertyKey`.
 */
export const createPropertyMappingResolver = (
  propertyKey: PropertyKey,
): MappingArrayResolver => createKeyMappingResolver(item => {
  if (!isObject(item)) { return undefined }
  const key = item[propertyKey]
  return typeof key === 'string' ? key : undefined
})

export const objectMappingResolver: MappingResolver<string> = (before, after) => {

  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }
  const afterKeys = new Set(Object.keys(after))

  for (const key of Object.keys(before)) {
    if (afterKeys.has(key)) {
      result.mapped[key] = key
      afterKeys.delete(key)
    } else {
      result.removed.push(key)
    }
  }

  afterKeys.forEach((key) => result.added.push(key))

  return result
}
