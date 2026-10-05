import { createCustomEqual } from 'fast-equals'
import type { State } from 'fast-equals'
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

/* fast-equals 5 changed three things about createCustomEqual, and all three show up here:
   the options are an object rather than a function returning the whole config; the type
   comparators take a `state` instead of `(isEqual, meta)`, with `state.equals` and
   `state.meta` in those roles; and createCustomConfig returns a *partial* config that is
   merged over the defaults, so there is no `...defaultOptions` spread any more.

   `circular` stays off, which is what v4's createCustomEqual did - v4 spelled the circular
   variant `createCustomCircularEqual`. Circularity here is not fast-equals' job: the
   EvaluationCacheService below memoises each (a, b) pair and seeds the guard with
   `{ value: undefined }`, so a pair still being compared reads back as `undefined` and
   `?? true` treats the cycle as equal. */
const areObjectsEqual = (
  a: Record<PropertyKey, unknown>,
  b: Record<PropertyKey, unknown>,
  state: State<CompareMeta>,
): boolean => {
  const meta = state.meta
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
        return !state.equals(originalValue, ignoreProperty, key, key, jso, undefined, state)
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
          !state.equals(aJso[key], bJso[key], key, key, aJso, bJso, state)
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
}

//for speared array support
const areArraysEqual = (a: unknown[], b: unknown[], state: State<CompareMeta>): boolean => {
  const meta = state.meta
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
          !state.equals(aJso[key as any], bJso[key as any], key, key, aJso, bJso, state)
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
}

/* The comparator v5 returns takes (a, b) only - v4's took (a, b, meta), and meta now arrives
   through createState instead. The meta here is per-call (jsonschema.ts builds a fresh
   EvaluationCacheService and ignoreProperties set for every comparison), so the comparator is
   built per call rather than once at module scope. That is not the extra cost it looks like:
   the caller was already allocating a cache service per call, and createCustomEqual only
   closes over the config. */
export const deepCircularEqualsWithPropertyFilter = <A, B>(a: A, b: B, meta: CompareMeta): boolean =>
  createCustomEqual<CompareMeta>({
    createState: () => ({ meta }),
    createCustomConfig: () => ({
      areObjectsEqual,
      areArraysEqual,
      areMapsEqual: () => {throw 'Not supported'},
    }),
  })(a, b)
