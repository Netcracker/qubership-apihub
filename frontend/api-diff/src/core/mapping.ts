import { MapKeysResult, MappingResolver } from '../types'
import { onlyExistedArrayIndexes } from '../utils'
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
