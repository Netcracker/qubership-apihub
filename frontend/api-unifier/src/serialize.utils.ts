import { parse, stringify } from 'flatted'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'

const INTERNAL_KEYS = Object.freeze({
  IS_ARRAY: '__isArray',
  IS_UNDEFINED: '__isUndefined',
  LENGTH: 'length',
})

/**
 * Serializes an object with cycles and symbol substitution to a string
 * @param obj - The object to serialize (can contain cycles and Symbol keys)
 * @param symbolToStringMapping - Mapping from Symbol keys to string keys
 * @returns Serialized string representation
 */

export const serialize = (obj: unknown, symbolToStringMapping: Map<symbol, string>): string => {
  const visitedObjects = new WeakSet()
  const objectCache  = new WeakMap<object, unknown>()

  const transformSymbols = (value: any): any => {
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

    const symbolKeys = Object.getOwnPropertySymbols(value)
    const  hasSymbolKeys = symbolKeys.length > 0

    let result: any;
    if (isArray(value)) {
      result = hasSymbolKeys ? { [INTERNAL_KEYS.IS_ARRAY]: true } : [];
    } else {
      result = {};
    }
    objectCache.set(value, result);

    for (const [key, val] of Object.entries(value)) {
      result[key] = transformSymbols(val);
    }

    for (const sym of symbolKeys) {
      const strKey = symbolToStringMapping.get(sym);
      if (strKey) {
        result[strKey] = transformSymbols((value as Record<PropertyKey, any>)[sym]);
      }
    }

    if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        result[i] = transformSymbols(value[i]);
      }
      result.length = value.length;
    }

    return result;
  }

  const processedObj = transformSymbols(obj)
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
  const objectCache = new WeakMap<object, any>()

  const restoreSymbols = (value: any): any => {
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

    if (value[INTERNAL_KEYS.IS_ARRAY]) {
      const arrLength = value.length ?? 0
      const arr = new Array(arrLength)
      objectCache.set(value, arr)

      for (let i = 0; i < arrLength; i++) {
        arr[i] = restoreSymbols(value[i])
      }

      for (const [key, val] of Object.entries(value)) {
        if (key === INTERNAL_KEYS.IS_ARRAY || key === INTERNAL_KEYS.LENGTH || /^\d+$/.test(key)) {
          continue
        }
        const symKey = stringToSymbolMapping.get(key);
        (arr as any)[symKey ?? key] = restoreSymbols(val)
      }
      return arr
    }

    for (const [key, val] of Object.entries(value)) {
      const symbolKey = stringToSymbolMapping.get(key);
      const restored = restoreSymbols(val);

      if (symbolKey) {
        value[symbolKey] = restored;
        delete value[key];
      } else {
        value[key] = restored;
      }
    }

    return value
  }

  return restoreSymbols(parsed)
}