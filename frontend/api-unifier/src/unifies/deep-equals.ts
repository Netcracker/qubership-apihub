import { createCustomEqual } from 'fast-equals'
import { EvaluationCacheService } from '../cache'
import { anyArrayKeys } from '@netcracker/qubership-apihub-json-crawl'

export const ANY_VALUE = Symbol('any-value')

export interface CompareMeta {
  readonly cache: EvaluationCacheService
  readonly ignoreProperties: Record<PropertyKey, unknown | typeof ANY_VALUE>
}

interface Result {
  value: boolean | undefined
}

export const deepCircularEqualsWithPropertyFilter = createCustomEqual<CompareMeta>(defaultOptions => ({
  ...defaultOptions,
  areObjectsEqual: (a: Record<PropertyKey, unknown>, b: Record<PropertyKey, unknown>, isEqual, meta) => {
    const result = meta.cache.cacheEvaluationResultByFootprint<[typeof a, typeof b], Result>(
      [a, b],
      ([aJso, bJso]) => {
        const propertyFilter: (jso: Record<PropertyKey, unknown>) => (key: PropertyKey) => boolean = jso => key => {
          const ignoreProperty = meta.ignoreProperties[key]
          if (!ignoreProperty) {
            return true
          }
          if (ignoreProperty === ANY_VALUE) {
            return false
          }
          const originalValue = jso[key]
          return !isEqual(originalValue, ignoreProperty, key, key, jso, undefined, meta)
        }
        const keysA = Reflect.ownKeys(aJso).filter(propertyFilter(aJso))
        const keysB = Reflect.ownKeys(bJso).filter(propertyFilter(bJso))
        if (keysB.length !== keysA.length) {
          return { value: false }
        }

        let aKeyIndex = keysA.length
        while (aKeyIndex-- > 0) {
          const key = keysA[aKeyIndex]
          if (
            !(key in bJso) ||
            !isEqual(aJso[key], bJso[key], key, key, aJso, bJso, meta)
          ) {
            return { value: false }
          }
        }
        return { value: true }
      },
      { value: undefined },
      (result, guard) => {
        guard.value = result.value
        return guard
      })
    return result.value ?? true
  },
  //for speared array support
  areArraysEqual: (a: unknown[], b: unknown[], isEqual, meta) => {
    const result = meta.cache.cacheEvaluationResultByFootprint<[typeof a, typeof b], Result>(
      [a, b],
      ([aJso, bJso]) => {
        const propertyFilter: (key: PropertyKey) => boolean = key => {
          const ignoreProperty = meta.ignoreProperties[key]
          if (!ignoreProperty) {
            return true
          }
          return ignoreProperty !== ANY_VALUE

        }
        const keysA = anyArrayKeys(aJso).filter(propertyFilter)
        const keysB = anyArrayKeys(bJso).filter(propertyFilter)
        if (keysB.length !== keysA.length) {
          return { value: false }
        }

        let aKeyIndex = keysA.length
        while (aKeyIndex-- > 0) {
          const key = keysA[aKeyIndex]
          if (
            !(key in bJso) ||
            !isEqual(aJso[key as any], bJso[key as any], key, key, aJso, bJso, meta)
          ) {
            return { value: false }
          }
        }
        return { value: true }
      },
      { value: undefined },
      (result, guard) => {
        guard.value = result.value
        return guard
      })
    return result.value ?? true
  },
  areMapsEqual: () => {throw 'Not supported'},
}))