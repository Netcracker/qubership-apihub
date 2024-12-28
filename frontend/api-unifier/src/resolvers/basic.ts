import { calculateLCM, uniqueItems } from '../utils'
import { Jso, MergeContext, MergeResolver, OriginLeafs, ValueWithOrigins } from '../types'
import {
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_NODE_TYPES,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
} from '../rules/jsonschema.const'
import { deepEqual } from 'fast-equals'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import {
  copyOriginsForArray,
  resolveOrigins,
  resolveOriginsMetaRecord,
  setOrigins,
  setOriginsForArray,
} from '../origins'

export const sameValueOrigins: <T>(result: T, array: ValueWithOrigins<T>[]) => OriginLeafs = (result, array) => uniqueItems(array
  .reduce((r, v) => {
    if (v.value === result) {
      r.push(...(v.origins))
    }
    return r
  }, [] as OriginLeafs))

export const allOrigins: <T>(array: ValueWithOrigins<T>[]) => OriginLeafs = (array) => uniqueItems(array
  .reduce((r, v) => {
    r.push(...(v.origins))
    return r
  }, [] as OriginLeafs))

export const mergeResultWithSameValueOrigins: <T>(array: ValueWithOrigins<T>[], f: (array: T[]) => T | undefined) => ValueWithOrigins<T> | undefined = (array, f) => {
  const result = f(array.map(value => value.value))
  return result !== undefined ? { value: result, origins: sameValueOrigins(result, array) } : undefined
}
export const mergeResultWithAllOrigins: <T>(array: ValueWithOrigins<T>[], f: (array: T[]) => T | undefined) => ValueWithOrigins<T> | undefined = (array, f) => {
  const result = f(array.map(value => value.value))
  return result !== undefined ? { value: result, origins: allOrigins(array) } : undefined
}

export const first: MergeResolver<unknown> = ([a]) => a
export const last: MergeResolver<unknown> = args => args[args.length - 1]

export const and: MergeResolver<boolean> = args => mergeResultWithSameValueOrigins(args, args => args.reduce((r, v) => r && v, true))
export const or: MergeResolver<boolean> = args => mergeResultWithSameValueOrigins(args, args => args.reduce((r, v) => r || v, false))
export const minValue: MergeResolver<number> = args => mergeResultWithSameValueOrigins(args, args => Math.min(...args))
export const maxValue: MergeResolver<number> = args => mergeResultWithSameValueOrigins(args, args => Math.max(...args))
export const mergePattern: MergeResolver<string> = args => mergeResultWithAllOrigins(args, (args) => args.reduce((r, v) => `${r}(?=${v})`, ''))
export const equal: MergeResolver<unknown> = args => mergeResultWithAllOrigins(args, ([one, ...others]) => others.find((v) => !deepEqual(v, one)) ? undefined : one)
export const mergeObjects: MergeResolver<Jso> = args => mergeResultWithAllOrigins(args, ([one, ...others]) => others.reduce((r, v) => mergeValues(r, v), isArray(one) ? [...one] : { ...one }))
export const mergeCombination: MergeResolver<unknown[]> = (args, ctx) => {
  const result = findCombinations(args.map(value => value.value), ctx.options.originsFlag)
    .map((v) => {
      const allOf = { [JSON_SCHEMA_PROPERTY_ALL_OF]: v }
      const origins = uniqueItems([...Object.values(resolveOriginsMetaRecord(v, ctx.options.originsFlag) ?? {})]
        .flatMap(value => value))
      setOrigins(allOf, JSON_SCHEMA_PROPERTY_ALL_OF, ctx.options.originsFlag, origins)
      return { allOf, origins }
    })
  setOriginsForArray(result, ctx.options.originsFlag, result.map(value => value.origins))
  const allOfs = result.map(value => value.allOf)
  copyOriginsForArray(result, allOfs, ctx.options.originsFlag)
  return { value: allOfs, origins: allOrigins(args) }
}

export const mergeNot: MergeResolver<unknown> = (args, ctx) => {
  const result = { [JSON_SCHEMA_PROPERTY_ANY_OF]: args.map(valueWithOrigins => valueWithOrigins.value) }
  setOriginsForArray(result[JSON_SCHEMA_PROPERTY_ANY_OF], ctx.options.originsFlag, args.map(valueWithOrigins => valueWithOrigins.origins))
  setOrigins(result, JSON_SCHEMA_PROPERTY_ANY_OF, ctx.options.originsFlag, allOrigins(args))
  return { value: result, origins: allOrigins(args) }
}
export const mergeMultipleOf: MergeResolver<number> = args => mergeResultWithAllOrigins(args, args => calculateLCM(args))
export const concatString: MergeResolver<string> = args => mergeResultWithAllOrigins(args, args => args.join('; '))
export const concatArrays: MergeResolver<unknown[]> = args => mergeResultWithAllOrigins(args, args => args.reduce((r, v) => [...r, ...v], []))

export const mergeEnum: MergeResolver<unknown[]> = (args, ctx) => {
  const result = intersectArrays(args, ctx, deepEqual)
  if (!result.value.length) {
    ctx.mergeError(args, 'there are no common values in enum')
  }
  return result
}

export const mergeTypes: MergeResolver<string | string[]> = (args, ctx) => {
  const rawArrayTypes: ValueWithOrigins<string[]>[] = args.map(type => {
    if (Array.isArray(type.value)) {
      return type as ValueWithOrigins<string[]>
    }
    const syntheticArray = [type.value]
    setOriginsForArray(syntheticArray, ctx.options.originsFlag, [type.origins])
    return {
      value: syntheticArray,
      origins: type.origins,
    }

  })
  const nothingTypes = rawArrayTypes.filter((typesWithOrigins) => {
    return typesWithOrigins.value.length === 0 || typesWithOrigins.value.includes(JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING)
  })
  if (nothingTypes.length) {
    return {
      value: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
      origins: allOrigins(nothingTypes),
    } as ValueWithOrigins<string>
  }
  const allTypes = new Set(rawArrayTypes.flatMap(types => types.value))
  if (allTypes.size === 1) {
    return { value: [...allTypes][0], origins: allOrigins(rawArrayTypes) }
  }
  const arrayTypes = rawArrayTypes.map(typesWithOrigins => {
    const { items: types, itemsOrigins } = typesWithOrigins.value.map((type, index) => {
      return type === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY
        ? {
          items: JSON_SCHEMA_NODE_TYPES,
          itemsOrigins: Array<OriginLeafs>(JSON_SCHEMA_NODE_TYPES.length).fill(resolveOrigins(typesWithOrigins.value, index, ctx.options.originsFlag)!),
        }
        : { items: [type], itemsOrigins: [resolveOrigins(typesWithOrigins.value, index, ctx.options.originsFlag)!] }
    }).reduce((result, other) => ({
      items: [...result.items, ...other.items],
      itemsOrigins: [...result.itemsOrigins, ...other.itemsOrigins],
    }))
    setOriginsForArray(types, ctx.options.originsFlag, itemsOrigins)
    return { value: types, origins: typesWithOrigins.origins }
  })
  const mergedTypes = intersectArrays(arrayTypes, ctx, (a, b) => a === b)
  if (mergedTypes.value.length === 0) {
    // ctx.mergeError(args) is it an error?
    //todo check origins in this case
    return { value: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING, origins: mergedTypes.origins }
  }
  if (mergedTypes.value.length === 1) {
    //todo api not allowed to specify which SUB value affect items
    return { value: mergedTypes.value[0], origins: resolveOrigins(mergedTypes.value, 0, ctx.options.originsFlag)! }
  }

  return mergedTypes
}

const findCombinations: <T>(vectors: T[][], originsFlag: symbol | undefined) => T[][] = (vectors, originsFlag) => {
  if (vectors.length === 0) {
    return [[]] // Base case: empty vector, return an empty combination
  }
  const firstItems = vectors[0]
  const remainingVectors = vectors.slice(1)
  const combinationVectors = findCombinations(remainingVectors, originsFlag) // Recursively find combinations for remaining vectors
  const result = []
  const firstItemsOriginsRecord = resolveOriginsMetaRecord(firstItems, originsFlag) ?? {}
  for (let firstItemsIndex = 0; firstItemsIndex < firstItems.length; firstItemsIndex++) {
    const firstItem = firstItems[firstItemsIndex]
    const firstItemOrigins = firstItemsOriginsRecord[firstItemsIndex] ?? {}
    for (const combinationItems of combinationVectors) {
      const items = [firstItem, ...combinationItems]
      setOriginsForArray(items, originsFlag, [firstItemOrigins, ...combinationItems.map((_, index) => resolveOrigins(combinationItems, index, originsFlag))])
      result.push(items) // Add the current element to each combination of the remaining vectors
    }
  }

  return result
}

//todo This method doesn't support ORIGINS merge. Fix it before usage
export const mergeValues: <T>(value: T, patch: T) => T = (value, patch) => {
  if (Array.isArray(value) && Array.isArray(patch)) {
    return [...value, ...patch]
  } else if (isObject(value) && isObject(patch)) {
    const result: Record<PropertyKey, unknown> = { ...value }
    for (const key of Object.keys(patch)) {
      result[key] = mergeValues(result[key], patch[key])
    }
    return result as any/*T*/
  } else {
    return patch
  }
}

export const mergeStringSets: MergeResolver<string[]> = (args, ctx) => {
  const itemOriginsMap = new Map<string, OriginLeafs>()
  const arrayOrigins: OriginLeafs = []

  // Iterate through each array and add its strings to the set
  for (const array of args) {
    array.value.forEach((str, index) => {
      const stringOrigins = resolveOriginsOrNothing(array.value, index, ctx)
      itemOriginsMap.set(str, [...(itemOriginsMap.get(str) ?? []), ...stringOrigins])
    })
    arrayOrigins.push(...array.origins)
  }

  const items = Array.from(itemOriginsMap.keys())
  setOriginsForArray(items, ctx.options.originsFlag, Array.from(itemOriginsMap.values()))
  return { value: items, origins: arrayOrigins }
}

const intersectArrays = <T>(args: ValueWithOrigins<T[]>[], ctx: MergeContext, equals: (a: T, b: T) => boolean): ValueWithOrigins<T[]> => {
  const findItemWithOrigins = (map: Map<T, OriginLeafs>, item: T): [T, OriginLeafs] | undefined => {
    if (map.get(item)) {
      return [item, map.get(item)!]
    }
    return Array.from(map.entries()).find(([otherItem]) => equals(item, otherItem))
  }

  const [one, ...others] = args

  return others.reduce((result, nextArray) => {
    const itemOriginsMap = new Map<T, OriginLeafs>()

    result.value.forEach((item, index) => {
      const origins = resolveOriginsOrNothing(result.value, index, ctx)
      const currentItemWithOrigins = findItemWithOrigins(itemOriginsMap, item)

      if (currentItemWithOrigins) {
        const [currentItem, currentOrigins] = currentItemWithOrigins
        itemOriginsMap.set(currentItem, [...(currentOrigins ?? []), ...origins])
      } else {
        // rewrite to reduce
        const sameItemIndex = nextArray.value.findIndex(otherItem => equals(item, otherItem))
        const foundItemOrigins = sameItemIndex >= 0 ? resolveOriginsOrNothing(nextArray.value, sameItemIndex, ctx) : undefined

        if (foundItemOrigins) {
          itemOriginsMap.set(item, [...origins, ...foundItemOrigins])
        }
      }
    })

    const filteredItems = Array.from(itemOriginsMap.keys())
    const itemOrigins = filteredItems.map(item => itemOriginsMap.get(item))
    setOriginsForArray(filteredItems, ctx.options.originsFlag, itemOrigins)

    return ({
      value: filteredItems,
      origins: [...result.origins, ...nextArray.origins],
    })
  }, one)
}

const resolveOriginsOrNothing = (array: unknown[], index: number, ctx: MergeContext) =>
  ctx.options.originsFlag ? resolveOrigins(array, index, ctx.options.originsFlag)! : []
