import { OriginLeafs, UnifyFunction } from '../types'
import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import { deepEqual } from 'fast-equals'
import { resolveOrigins, setOriginsForArray } from '../origins'

export const unifyJsonSchemaEnums: UnifyFunction = (jso, ctx) => {
  if (!isArray(jso)) {
    return jso
  }

  return removeDuplicatesWithMergeOrigins(jso, ctx.options.originsFlag, deepEqual)
}

const removeDuplicatesWithMergeOrigins = <T>(array: T[], originFlag: symbol | undefined, equals: (a: T, b: T) => boolean): T[] => {

  const findItemWithOrigins = (map: Map<T, OriginLeafs>, item: T): [T, OriginLeafs] | undefined => {
    if (map.get(item)) {
      return [item, map.get(item)!]
    }
    return Array.from(map.entries()).find(([otherItem]) => equals(item, otherItem))
  }

  const itemOriginsMap = new Map<T, OriginLeafs>()

  const uniqueItems = array.filter((item, index) => {
    const origins = resolveOrigins(array, index, originFlag) ?? []
    const existedItemWithOrigins = findItemWithOrigins(itemOriginsMap, item)
    if (existedItemWithOrigins) {
      const [existedItem, existedOrigins] = existedItemWithOrigins
      itemOriginsMap.set(existedItem, [...existedOrigins, ...origins])
      return false
    }

    return itemOriginsMap.set(item, origins)
  })

  const itemOrigins = uniqueItems.map(item => itemOriginsMap.get(item))
  setOriginsForArray(uniqueItems, originFlag, itemOrigins)

  return uniqueItems
}
