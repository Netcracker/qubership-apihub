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
  const visited = new WeakSet()
  const copy = new Map()

  const replaceSymbolKeys = (object: any): any => {
    if (object === undefined) {
      return { __isUndefined: true }
    }
    if (!isObject(object)) {
      return object
    }

    if (visited.has(object)) {
      if (copy.has(object)) {
        return copy.get(object)
      }
      return object
    }

    visited.add(object)

    let hasSymbolKeys = false

    const symbolKeys = Object.getOwnPropertySymbols(object)
    for (const symbolKey of symbolKeys) {
      const stringKey = symbolToStringMapping.get(symbolKey)
      if (stringKey) {
        // Move value from symbol key to string key
        object[stringKey] = replaceSymbolKeys(object[symbolKey])
        delete object[symbolKey]
        hasSymbolKeys = true
      }
    }

    if (isArray(object)) {
      // If array has symbol keys converted to string keys, we need to convert it to a plain object
      // because flatted.stringify doesn't serialize custom properties on arrays
      if (hasSymbolKeys) {
        const arrayAsObject: any = { __isArray: true }
        // Copy array elements
        for (let i = 0; i < object.length; i++) {
          arrayAsObject[i] = replaceSymbolKeys(object[i])
        }
        // Copy any additional string properties (converted from symbols)
        for (const [key, value] of Object.entries(object)) {
          if (!(/^\d+$/.test(key))) { // Skip numeric indices
            arrayAsObject[key] = replaceSymbolKeys(value)
          }
        }
        arrayAsObject.length = object.length
        copy.set(object, arrayAsObject)
        return arrayAsObject
      } else {
        // Process array elements normally
        for (let i = 0; i < object.length; i++) {
          object[i] = replaceSymbolKeys(object[i])
        }
      }
    } else {
      // Process regular properties for objects
      for (const [key, objValue] of Object.entries(object)) {
        object[key] = replaceSymbolKeys(objValue)
      }
    }

    return object
  }

  const processedObj = replaceSymbolKeys(obj)
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
  // First, parse the string using flatted
  const parsedObj = parse(str)

  // Then walk the parsed object and replace string keys with symbol keys, handling cycles
  const visited = new WeakSet()
  const copy = new Map()

  const replaceStringKeys = (value: any): any => {
    // Handle cycles by tracking visited objects

    if (visited.has(value)) {
      if (copy.has(value)) {
        return copy.get(value)
      }
      return value
    }

    if (!isObject(value)) {
      return value
    }

    if (value && value.__isUndefined === true) {
      return undefined
    }

    visited.add(value)

    // Check if this is a serialized array (converted to object during serialization)
    if (value.__isArray === true) {
      const arr: any[] = new Array(value.length || 0)

      // Restore array elements
      for (let i = 0; i < arr.length; i++) {
        if (i in value) {
          arr[i] = replaceStringKeys(value[i])
        }
      }

      // Restore additional properties (including converted symbol keys)
      for (const [key, objValue] of Object.entries(value)) {
        if (key !== '__isArray' && key !== 'length' && !(/^\d+$/.test(key))) {
          const symbolKey = stringToSymbolMapping.get(key)
          if (symbolKey) {
            (arr as any)[symbolKey] = replaceStringKeys(objValue)
          } else {
            (arr as any)[key] = replaceStringKeys(objValue)
          }
        }
      }
      copy.set(value, arr)
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
      value[symbolKey] = replaceStringKeys(value[stringKey])
      delete value[stringKey]
    }

    if (isArray(value)) {
      // Process array elements
      for (let i = 0; i < value.length; i++) {
        value[i] = replaceStringKeys(value[i])
      }
    } else {
      // Process remaining properties for objects
      for (const [key, objValue] of Object.entries(value)) {
        value[key] = replaceStringKeys(objValue)
      }
    }

    return value
  }

  return replaceStringKeys(parsedObj)
}