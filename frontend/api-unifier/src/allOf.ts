import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { InternalMergeOptions, JsonSchema, RawJsonSchema, ValueWithOrigins } from './types'

import { resolveOrigins } from './origins'

export const unifyBooleanSchemas = (items: ValueWithOrigins<RawJsonSchema>[], options: InternalMergeOptions): ValueWithOrigins<JsonSchema>[] => {
  return items.flatMap(valueWithOrigins => {
    const { value: objectOrBoolean } = valueWithOrigins
    if (typeof objectOrBoolean === 'boolean') {
      return [{
        value: objectOrBoolean ? options.syntheticMetaDefinitions.emptyJsonSchema(valueWithOrigins.origins) : options.syntheticMetaDefinitions.invertedEmptyJsonSchema(valueWithOrigins.origins) ?? [],
        origins: valueWithOrigins.origins,
      }]
    } else if (isObject(objectOrBoolean)) {
      return [valueWithOrigins] as ValueWithOrigins<JsonSchema>[]
    } else {
      return []
    }
  })
}

export const flattenAllOfItems = (items: ValueWithOrigins<RawJsonSchema>[], options: InternalMergeOptions, expandedAllOf: Set<unknown> = new Set()): ValueWithOrigins<RawJsonSchema>[] => {
  // allOf: [{ allOf: [a,b], c, a }] => allOf: [b, c, a]

  const result: ValueWithOrigins<RawJsonSchema>[] = []
  for (const valueWithOrigins of items) {
    const value = valueWithOrigins.value
    if (!isObject(value)) {
      result.push(valueWithOrigins)
      continue
    }

    if (!value.allOf || !Array.isArray(value.allOf)) {
      if (!isArray(value)) {
        result.push(valueWithOrigins)
      }
    } else {
      const [allOf, sibling] = options.spreadAllOfCache.spreadOrReuse(value)
      let safeAllOf = allOf as RawJsonSchema[]
      if (expandedAllOf.has(allOf)) {
        safeAllOf = []
      } else {
        expandedAllOf.add(allOf)
      }
      const safeAllOfWithOrigins: ValueWithOrigins<RawJsonSchema>[] = safeAllOf.map((subItem, index) => ({
        value: subItem,
        origins: resolveOrigins(safeAllOf, index, options.originsFlag) ?? [],
      }))
      const allOfItems: ValueWithOrigins<RawJsonSchema>[] = isSiblingKeysAreImportant(sibling, options) ? [
        ...safeAllOfWithOrigins,
        {
          value: sibling,
          origins: valueWithOrigins.origins,
        },
      ] : safeAllOfWithOrigins

      result.push(...flattenAllOfItems(allOfItems, options, expandedAllOf))
    }
  }

  return result
}


export const isSiblingKeysAreImportant = (sibling: Record<PropertyKey, unknown>, options: InternalMergeOptions): boolean => {
  return Reflect.ownKeys(sibling).some(key => typeof key !== 'symbol' || key === options.inlineRefsFlag)
}