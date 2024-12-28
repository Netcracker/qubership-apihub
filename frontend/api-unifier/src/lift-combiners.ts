import { isArray, isObject, JSON_ROOT_KEY } from '@netcracker/qubership-apihub-json-crawl'
import {
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JsonSchemaCombinerType,
} from './rules/jsonschema.const'
import { InternalLiftCombinersOptions, MergeAndLiftCombinersSyncCloneHook, OriginLeafs } from './types'
import { uniqueItems } from './utils'
import {
  cleanAllOrigins,
  cleanOrigins,
  copyOrigins,
  mergeOrigins,
  resolveOrigins,
  resolveOriginsMetaRecord,
  setOrigins,
  setOriginsForArray,
} from './origins'

const COMBINER_KEYS: JsonSchemaCombinerType[] = [JSON_SCHEMA_PROPERTY_ONE_OF, JSON_SCHEMA_PROPERTY_ANY_OF]

export const createLiftCombinersHook = (options: InternalLiftCombinersOptions): MergeAndLiftCombinersSyncCloneHook => {
  const liftHook: MergeAndLiftCombinersSyncCloneHook = ({ key, value, rules, state }) => {
    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }
    const safeKey = key ?? JSON_ROOT_KEY
    if (typeof safeKey === 'symbol' && options.ignoreSymbols.has(safeKey)) {
      return {
        value,
        state: { ...state, ignoreTreeUnderSymbols: true },
      } //set state to ignore next work
    }

    if (!rules?.canLiftCombiners) {
      return { value }
    }

    if (!isObject(value)) {
      return { value }
    }

    const lifted = liftCombiners(value, state.selfOriginResolver(key), options)
    return { value: lifted }
  }
  return liftHook
}

// TODO 21.05.24 // Refactor via spread operator: const { oneOf, anyOf, ...sibling } = value
// TODO 29.05.24 // Truncate redundant combiner(s) branch with infinite itself. See on "self cycled" test for allOf
function liftCombiners(
  value: Record<PropertyKey, unknown>,
  valueOrigins: OriginLeafs | undefined,
  options: InternalLiftCombinersOptions,
): Record<PropertyKey, unknown> {
  const ignoredKeys: Set<PropertyKey> = new Set()
  options?.inlineRefsFlag && ignoredKeys.add(options.inlineRefsFlag)
  const { evaluationCacheService: cacheService } = options
  const allValueKeys = Reflect.ownKeys(value)
    .filter(key => !ignoredKeys.has(key))//filterignre keys + origin
    .filter(key => key !== options.originsFlag)//filterignre keys + origin
  const foundCombinerKeys = findCombinerKeys(allValueKeys)
  const isEmptySibling = !hasSiblingKeys(allValueKeys)
  if (!(foundCombinerKeys.length > 1 || !isEmptySibling && foundCombinerKeys.length > 0)) { return value }
  const [firstCombinerKey, secondCombinerKey] = foundCombinerKeys
  const [firstCombiner, secondCombiner] = [value[firstCombinerKey], value[secondCombinerKey]]
  const firstCombinerItems: unknown[] = Array.isArray(firstCombiner) ? firstCombiner : []
  const secondCombinerItems: unknown[] = Array.isArray(secondCombiner) ? secondCombiner : []
  return cacheService.cacheEvaluationResultByFootprint(
    [...allValueKeys, ...firstCombinerItems, '|', ...secondCombinerItems],
    () => {
      const newValue: Record<PropertyKey, unknown> = { ...value }
      const copiedFirstCombinerItems: unknown[] = [...firstCombinerItems]
      const firstCombinerItemsOriginsRecord = resolveOriginsMetaRecord(firstCombinerItems, options.originsFlag) ?? {}
      // recombine first combiner
      if (copiedFirstCombinerItems.length === 0) {
        return newValue
      }
      const sibling: Record<PropertyKey, unknown> = { ...newValue }
      delete sibling[firstCombinerKey]
      cleanOrigins(sibling, firstCombinerKey, options.originsFlag)
      for (const ignoredKey of ignoredKeys) {
        delete sibling[ignoredKey]
        cleanOrigins(sibling, ignoredKey, options.originsFlag)
      }
      for (const key of allValueKeys) {
        delete newValue[key]
        cleanOrigins(newValue, key, options.originsFlag)
      }

      if (!isEmptySibling) {
        firstCombinerItems.splice(0, firstCombinerItems.length)
        cleanAllOrigins(firstCombinerItems, options.originsFlag)
        for (let i = 0; i < copiedFirstCombinerItems.length; i++) {
          const firstCombinerItem = copiedFirstCombinerItems[i]
          const item = { [JSON_SCHEMA_PROPERTY_ALL_OF]: [sibling, firstCombinerItem] }
          const firstCombinerItemsOrigins = firstCombinerItemsOriginsRecord[i] ?? []
          const combinationOrigins = uniqueItems([...(valueOrigins ?? []), ...(firstCombinerItemsOrigins)])
          setOrigins(item, JSON_SCHEMA_PROPERTY_ALL_OF, options.originsFlag, combinationOrigins)
          setOrigins(item[JSON_SCHEMA_PROPERTY_ALL_OF], 0, options.originsFlag, valueOrigins)
          setOrigins(item[JSON_SCHEMA_PROPERTY_ALL_OF], 1, options.originsFlag, firstCombinerItemsOrigins)
          setOrigins(firstCombinerItems, firstCombinerItems.length, options.originsFlag, combinationOrigins)
          firstCombinerItems.push(item)
        }
      }

      if (secondCombinerItems.length === 0) {
        newValue[firstCombinerKey] = firstCombinerItems
        copyOrigins(value, newValue, firstCombinerKey, firstCombinerKey, options.originsFlag)
        return newValue
      }
      const copiedSecondCombinerItems: unknown[] = [...secondCombinerItems]
      const secondCombinerItemsOriginsRecord = resolveOriginsMetaRecord(secondCombinerItems, options.originsFlag) ?? {}
      // recombine second combiner if exists
      secondCombinerItems.splice(0, secondCombinerItems.length)
      cleanAllOrigins(secondCombinerItems, options.originsFlag)
      for (let secondCombinerIndex = 0; secondCombinerIndex < copiedSecondCombinerItems.length; secondCombinerIndex++) {
        const secondCombinerItem = copiedSecondCombinerItems[secondCombinerIndex]
        const secondCombinerItemOrigins = secondCombinerItemsOriginsRecord[secondCombinerIndex] ?? []
        const mergedFirstAndSecondCombinerItems: unknown[] = []
        for (let firstCombinerIndex = 0; firstCombinerIndex < firstCombinerItems.length; firstCombinerIndex++) {
          const firstCombinerItem = firstCombinerItems[firstCombinerIndex]
          const firstCombinerItemsOrigins = firstCombinerItemsOriginsRecord[firstCombinerIndex] ?? []
          const item = { [JSON_SCHEMA_PROPERTY_ALL_OF]: [firstCombinerItem, secondCombinerItem] }
          const combinationOrigins = uniqueItems([...firstCombinerItemsOrigins, ...secondCombinerItemOrigins])
          setOrigins(item, JSON_SCHEMA_PROPERTY_ALL_OF, options.originsFlag, combinationOrigins)
          setOrigins(item[JSON_SCHEMA_PROPERTY_ALL_OF], 0, options.originsFlag, firstCombinerItemsOrigins)
          setOrigins(item[JSON_SCHEMA_PROPERTY_ALL_OF], 1, options.originsFlag, secondCombinerItemOrigins)
          setOrigins(mergedFirstAndSecondCombinerItems, mergedFirstAndSecondCombinerItems.length, options.originsFlag, combinationOrigins)
          mergedFirstAndSecondCombinerItems.push(item)
        }
        const newSecondCombinerItem: Record<PropertyKey, unknown> = {
          [firstCombinerKey]: mergedFirstAndSecondCombinerItems,
        }
        copyOrigins(value, newSecondCombinerItem, firstCombinerKey, firstCombinerKey, options.originsFlag)
        setOrigins(secondCombinerItems, secondCombinerItems.length, options.originsFlag, secondCombinerItemOrigins)
        secondCombinerItems.push(newSecondCombinerItem)
      }
      newValue[secondCombinerKey] = secondCombinerItems
      copyOrigins(value, newValue, secondCombinerKey, secondCombinerKey, options.originsFlag)
      delete sibling[secondCombinerKey]
      cleanOrigins(sibling, secondCombinerKey, options.originsFlag)
      return newValue
    },
  )
}

export function mergeProhibitLiftCombiners(
  jso: Record<PropertyKey, unknown>,
  options: InternalLiftCombinersOptions,
): Record<PropertyKey, unknown> {
  if (!options.liftCombiners) {
    return jso
  }
  const ignoredKeys: Set<PropertyKey> = new Set()
  options?.inlineRefsFlag && options?.inlineRefsFlag in jso && ignoredKeys.add(options.inlineRefsFlag)
  const ownKeys = Reflect.ownKeys(jso)
  const foundCombinerKeys = findCombinerKeys(ownKeys)
  const [combiner] = foundCombinerKeys
  if (!combiner) {
    return jso
  }
  const arrayCombiner = jso[combiner]
  if (!isArray(arrayCombiner)) {
    return jso
  }
  const propertiesToMove = ownKeys
    .filter(key => key !== combiner && !ignoredKeys.has(key))
  if (propertiesToMove.length === 0) {
    return jso
  }
  const toTopLevel = [...ignoredKeys]
    .reduce((collector, propertyKey) => {
      collector[propertyKey] = jso[propertyKey]
      copyOrigins(jso, collector, propertyKey, propertyKey, options.originsFlag)
      return collector
    }, {} as Record<PropertyKey, unknown>)
  const toNestedLevel: Record<PropertyKey, unknown> = [...ignoredKeys, combiner]
    .reduce((collector, propertyKey) => {
      delete collector[propertyKey]
      cleanOrigins(collector, propertyKey, options.originsFlag)
      return collector
    }, { ...jso })
  const result = {
    ...toTopLevel,
    [combiner]: arrayCombiner.map(combinerItem => {
      if (hasCommonProperties(combinerItem, toTopLevel)) {
        //todo log error?
        throw new Error('Merge common properties should never happened on last phase')
      }
      mergeOrigins(toNestedLevel, [combinerItem], options.originsFlag)
      const allForMerge = { ...combinerItem, ...toNestedLevel }
      return mergeProhibitLiftCombiners(allForMerge, options)
    }),
  }
  copyOrigins(jso, result, combiner, combiner, options.originsFlag)
  setOriginsForArray(result[combiner] as unknown[], options.originsFlag, arrayCombiner.map((_, index) => resolveOrigins(arrayCombiner, index, options.originsFlag)))
  return result
}

function hasCommonProperties(one: Record<PropertyKey, unknown>, another: Record<PropertyKey, unknown>): boolean {
  const oneKeys = new Set(Reflect.ownKeys(one))
  const anotherKeys = Reflect.ownKeys(another)
  return anotherKeys.some(key => oneKeys.has(key))
}

function isCombinerKey(key: PropertyKey): key is JsonSchemaCombinerType {
  return COMBINER_KEYS.includes(key as JsonSchemaCombinerType)
}

function isSiblingKey(key: PropertyKey): key is string {
  return !isCombinerKey(key)
}

function hasSiblingKeys(keys: PropertyKey[]): boolean {
  return keys.some(isSiblingKey)
}

function findCombinerKeys(keys: PropertyKey[]): JsonSchemaCombinerType[] {
  return keys.filter(isCombinerKey)
}
