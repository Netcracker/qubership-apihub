import { InternalUnifyOptions, OriginLeafs, UnifyFunction } from '../types'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { isBroken, isPureCombiner } from './type'
import { JsonPrimitiveValue } from './defaults'
import { deepEqual } from 'fast-equals'

import { resolveOrigins } from '../origins'

// todo wrap to ctx
export type ReplaceFunction = (origins: OriginLeafs | undefined, opts: InternalUnifyOptions) => unknown

export type ReverseMatcherFunction = (value: unknown, extraIgnoreProperties: Set<PropertyKey>, opts: InternalUnifyOptions) => boolean

export interface Replace {
  readonly value: ReplaceFunction
  readonly reverseMatcher: ReverseMatcherFunction
}

export interface ReplaceMapping {
  readonly mapping?: Map<JsonPrimitiveValue, Replace>
}

const PLACE_HOLDER_JSO: Record<PropertyKey, unknown> = {}
export const deepEqualsMatcher: (one: unknown) => ReverseMatcherFunction = (one) => (another) => {
  return deepEqual(one, another)
}

export const valueReplaces: (map: Record<string, ReplaceMapping>) => UnifyFunction = (map) => {
  return {
    forward: (jso, { options }) => {
      if (!isObject(jso) || isArray(jso)) {
        return jso
      }
      if (isPureCombiner(jso)) {
        return jso
      }
      if (isBroken(jso)) {
        return jso
      }
      let shallowJso: typeof jso = PLACE_HOLDER_JSO
      Object.entries(map)
        .forEach(([propertyKey, f]) => {
          if (propertyKey in jso) {
            const value = jso[propertyKey]
            const replace = f.mapping?.get(value)
            if (replace) {
              if (shallowJso === PLACE_HOLDER_JSO) {
                shallowJso = { ...jso }
              }
              shallowJso[propertyKey] = replace.value(resolveOrigins(shallowJso, propertyKey, options.originsFlag), options)
            }
          }
        })
      if (shallowJso === PLACE_HOLDER_JSO) {
        return jso
      }
      return shallowJso
    },
    backward: (jso, { path, options }) => {
      if (!isObject(jso) || isArray(jso)) {
        return
      }
      if (isBroken(jso)) {
        return
      }

      const candidates = Object.entries(map)
        .flatMap(([key, f]) => key in jso ? [{ value: jso[key], key, f }] : [])
        .filter(({ key, value }) => !options.skip || (!options.skip(value, [...path, key])))
      const ignorePropertyKeys: Set<PropertyKey> = new Set(Object.keys(map))
      options.ignoreSymbols.forEach(s => ignorePropertyKeys.add(s))
      candidates
        .reverse()
        .forEach(({ key: propertyKey, value, f }) => {
          const mapping = f.mapping ?? new Map<unknown, Replace>()
          const ignoreMe = [...mapping.entries()]
            .some(([replaceMappingValue, possibleValue]) => {
              if (possibleValue.reverseMatcher(value, ignorePropertyKeys, options)) {
                jso[propertyKey] = replaceMappingValue
                return true
              }
              return false
            })
        })
    },
  }
}

