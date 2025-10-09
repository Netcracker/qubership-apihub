import { parse, stringify } from 'flatted'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'

// This is just a PoC to serialize/deserialize the merged document.
// Merged document is a JSON object with cycles and symbol keys.
// Symbol key could be both in object and array.
// flatted.stringify doesn't serialize custom properties on arrays
// flatted.parse doesn't deserialize custom properties on arrays
// lodash cloneDeepWith does not copy custom properties on arrays
// Approximate times:
// - OAS large x6: Diff: 57914.54ms, Serialize: 488.82ms, Deserialize: 1057.61ms
// - GQL1: Diff: 25495.87ms, Serialize: 255.23ms, Deserialize: 477.04ms
// - GQL2: Diff: 16599.96ms, Serialize: 341.62ms, Deserialize: 527.20ms
// - Shopify (GQL): Diff: 21453.64ms, Serialize: 186.46ms, Deserialize: 371.04ms
/**
 * Serializes an object with cycles and symbol substitution to a string
 * @param obj - The object to serialize (can contain cycles and Symbol keys)
 * @param symbolToStringMapping - Mapping from Symbol keys to string keys
 * @returns Serialized string representation
 */

export const serialize = (obj: unknown, symbolToStringMapping: Map<symbol, string>): string => {

  // Walk the object and replace symbol keys, handling cycles
  const visitedObjects = new WeakSet()
  const objectCache  = new WeakMap<object, unknown>()

  const transformSymbols = (value: any): any => {
    if (value === undefined) {
      return { __isUndefined: true }
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
      result = hasSymbolKeys ? { __isArray: true } : [];
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
    if (value.__isUndefined) {
      return undefined
    }

    if (visitedObjects.has(value)) {
      return objectCache.get(value) ?? value
    }
    visitedObjects.add(value)

    if (value.__isArray) {
      const arrLength = value.length ?? 0
      const arr: any[] = new Array(arrLength)
      objectCache.set(value, arr)

      for (let i = 0; i < arrLength; i++) {
        arr[i] = restoreSymbols(value[i])
      }

      // Restore additional properties (including converted symbol keys)
      for (const [key, val] of Object.entries(value)) {
        if (key === '__isArray' || key === 'length' || /^\d+$/.test(key)) {
          continue
        }
        const symKey = stringToSymbolMapping.get(key)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        arr[symKey ?? key] = restoreSymbols(val)
      }
      return arr
    }

    // Process string keys that should be converted to symbol keys for both arrays and objects
    const keysToReplace: Array<[string, symbol]> = []

    // First, identify which keys need to be replaced
    for (const key of Object.keys(value)) {
      const symbolKey = stringToSymbolMapping.get(key)
      if (symbolKey) {
        keysToReplace.push([key, symbolKey])
      }
    }

    // Replace string keys with symbol keys
    for (const [stringKey, symbolKey] of keysToReplace) {
      value[symbolKey] = restoreSymbols(value[stringKey])
      delete value[stringKey]
    }

    if (isArray(value)) {
      // Process array elements
      for (let i = 0; i < value.length; i++) {
        value[i] = restoreSymbols(value[i])
      }
    } else {
      // Process remaining properties for objects
      for (const [key, objValue] of Object.entries(value)) {
        value[key] = restoreSymbols(objValue)
      }
    }

    return value
  }

  return restoreSymbols(parsed)
}