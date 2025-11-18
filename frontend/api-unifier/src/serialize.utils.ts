import { parse, stringify } from 'flatted'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { isSymbol } from '../test/helpers'

const isSet = (value: unknown): value is Set<any> =>
  value instanceof Set

const INTERNAL_KEYS = Object.freeze({
  IS_ARRAY: '__isArray',
  IS_UNDEFINED: '__isUndefined',
  LENGTH: 'length',
  IS_SET: '__isSet',
})

type TransformedArrayType = {
  [INTERNAL_KEYS.IS_ARRAY]: true
  [INTERNAL_KEYS.LENGTH]: number
  [key: string]: unknown
}

type TransformedSetType = {
  [INTERNAL_KEYS.IS_SET]: true
  values: unknown[]
}

/**
 * Serializes an object with cycles and symbol substitution to a string
 * @param obj - The object to serialize (can contain cycles and Symbol keys)
 * @param symbolToStringMapping - Mapping from Symbol keys to string keys
 * @returns Serialized string representation
 */
export const serialize = (obj: unknown, symbolToStringMapping: Map<symbol, string>): string => {
  const visitedObjects = new WeakSet()
  const objectCache = new WeakMap<object, unknown>()

  const transform = (value: unknown): unknown => {
    if (value === undefined) {
      return { [INTERNAL_KEYS.IS_UNDEFINED]: true }
    }
    if (!isObject(value)) {
      return value
    }
    if (visitedObjects.has(value)) {
      return objectCache.get(value) ?? value
    }

    visitedObjects.add(value)

    const transformSymbols = (symbolKeys: symbol[], data: unknown, result: unknown) => {
      for (const sym of symbolKeys) {
        const strKey = symbolToStringMapping.get(sym)
        if (strKey) {
          (result as any)[strKey] = transform((data as any)[sym])
        }
      }
    }

    const transformArray = (arr: unknown[]): TransformedArrayType | unknown[] => {
      const symbolKeys = Object.getOwnPropertySymbols(value)
      if (symbolKeys.length === 0) {
        const result: unknown[] = []
        objectCache.set(value, result)

        for (let i = 0; i < value.length; i++) {
          result[i] = transform(arr[i])
        }
        return result
      }

      const result: TransformedArrayType = { [INTERNAL_KEYS.IS_ARRAY]: true, length: 0 }
      objectCache.set(value, result)

      for (const [key, val] of Object.entries(arr)) {
        result[key] = transform(val)
      }
      transformSymbols(symbolKeys, arr, result)
      result.length = value.length

      return result
    }

    const transformObject = (obj: Record<PropertyKey, unknown>): Record<string, unknown> => {
      const result: Record<PropertyKey, unknown> = {}
      objectCache.set(value, result)

      for (const [key, val] of Object.entries(value)) {
        result[key] = transform(val)
      }
      transformSymbols(Object.getOwnPropertySymbols(value), obj, result)

      return result
    }

    const transformSet = (set: Set<unknown>): TransformedSetType => {
      const result: TransformedSetType = { [INTERNAL_KEYS.IS_SET]: true, values: [] }
      objectCache.set(value, result)

      const values: unknown[] = [];
      for (const entry of set) {
        let toTransform = entry;

        if (isSymbol(entry)) {
          const symbolStr = symbolToStringMapping.get(entry);
          if (!symbolStr) {continue}
          toTransform = symbolStr
        }

        values.push(transform(toTransform));
      }

      result.values = values;
      return result
    }

    if (isArray(value)) {
      return transformArray(value as unknown[])
    }

    if (isSet(value)) {
      return transformSet(value as Set<unknown>)
    }

    return transformObject(value as Record<PropertyKey, unknown>)
  }

  const processedObj = transform(obj)
  return stringify(processedObj)
}

/**
 * Deserializes a string back to an object with symbol key restoration
 * @param str - The serialized string
 * @param stringToSymbolMapping - Mapping from string keys to Symbol keys
 * @returns Deserialized object with Symbol keys restored
 */
export const deserialize = (str: string, stringToSymbolMapping: Map<string, symbol>): unknown => {
  const parsed = parse(str)
  const visitedObjects = new WeakSet<object>()
  const objectCache = new WeakMap<object, unknown>()

  const restoreSymbols = (value: unknown): unknown => {
    if (!isObject(value)) {
      return value
    }
    if (value[INTERNAL_KEYS.IS_UNDEFINED]) {
      return undefined
    }

    if (visitedObjects.has(value)) {
      return objectCache.get(value) ?? value
    }
    visitedObjects.add(value)

    const transformArray = (arr: TransformedArrayType): unknown => {
      const arrLength = arr.length as number ?? 0
      const result: unknown[] = new Array(arrLength)
      objectCache.set(arr, result)

      for (let i = 0; i < arrLength; i++) {
        result[i] = restoreSymbols(arr[i])
      }

      for (const [key, val] of Object.entries(arr)) {
        if (key === INTERNAL_KEYS.IS_ARRAY || key === INTERNAL_KEYS.LENGTH || /^\d+$/.test(key)) {
          continue
        }
        const symKey = stringToSymbolMapping.get(key)
        result[(symKey ?? key) as unknown as number] = restoreSymbols(val)
      }
      return result
    }

    const transformSet = (set: TransformedSetType): Set<unknown> => {
      const setValues = set.values ?? []
      const result = new Set<unknown>()
      objectCache.set(set, result)

      for (const item of setValues) {
        result.add(restoreSymbols(item))
      }

      return result
    }

    const transformObject = (obj: Record<PropertyKey, unknown>): Record<string, unknown> => {
      for (const [key, val] of Object.entries(obj)) {
        const symbolKey = stringToSymbolMapping.get(key)
        const restored = restoreSymbols(val)

        if (symbolKey) {
          obj[symbolKey] = restored
          delete value[key]
        } else {
          obj[key] = restored
        }
      }

      return obj
    }

    if (value[INTERNAL_KEYS.IS_ARRAY]) {
      return transformArray(value as TransformedArrayType)
    }

    if (value[INTERNAL_KEYS.IS_SET]) {
      return transformSet(value as TransformedSetType)
    }

    return transformObject(value)
  }

  return restoreSymbols(parsed)
}
