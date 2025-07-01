import { DEFAULT_TYPE_FLAG_PURE, DEFAULT_TYPE_FLAG_SYNTHETIC, DefaultMetaRecord, InternalUnifyOptions, UnifyContext, UnifyFunction } from '../types'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { isBroken, isPureCombiner } from './type'
import { setJsoProperty } from '../utils'
import { cleanSeveralOrigins, resolveOriginsMetaRecord } from '../origins'

export type JsonPrimitiveValue =
  string
  | number
  | boolean /*Primitive JSO value only*/
  | symbol /*for connection with replace*/;

export type DefaultValueFunction = (jso: Record<string, any>, ctx: UnifyContext<InternalUnifyOptions>) => JsonPrimitiveValue | undefined;

export type DefaultValueMapping = Record<string, JsonPrimitiveValue | DefaultValueFunction>;

const PLACE_HOLDER_JSO: Record<PropertyKey, unknown> = {}

const resolveDefaultValue = (
  defaultValueOrFunction: JsonPrimitiveValue | DefaultValueFunction,
  jso: Record<string, any>,
  ctx: UnifyContext<InternalUnifyOptions>
): JsonPrimitiveValue | undefined => {
  return typeof defaultValueOrFunction === 'function' 
    ? defaultValueOrFunction(jso, ctx)
    : defaultValueOrFunction
}

export const valueDefaults: (map: DefaultValueMapping) => UnifyFunction = (map) => {
  return {
    forward: (jso, ctx) => {
      const { options, origins } = ctx
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
      const defaultsMeta: DefaultMetaRecord = { ...(options.defaultsFlag ? (jso[options.defaultsFlag] ?? {}) : {}) }
      const overrideDefaultsKeys = new Set(Object.keys(defaultsMeta))
      let hasDefaults = false
      const originsForDefaults = options.originsFlag ? options.createOriginsForDefaults(origins) : undefined
      Object.entries(map)
        .forEach(([propertyKey, defaultValueOrFunction]) => {
          // Calculate the default value - either static or dynamic
          const defaultValue = resolveDefaultValue(defaultValueOrFunction, jso as Record<string, any>, ctx)
          
          // Skip if dynamic function returns undefined (no default for this case)
          if (defaultValue === undefined) {
            return
          }
          
          if (!(propertyKey in jso)) {
            if (shallowJso === PLACE_HOLDER_JSO) {
              shallowJso = { ...jso }
            }
            shallowJso[propertyKey] = defaultValue
            defaultsMeta[propertyKey] = DEFAULT_TYPE_FLAG_SYNTHETIC
            hasDefaults = true
          } else {
            if (jso[propertyKey] === defaultValue) {
              defaultsMeta[propertyKey] = overrideDefaultsKeys.has(propertyKey) ? defaultsMeta[propertyKey] : DEFAULT_TYPE_FLAG_PURE
              hasDefaults = true
            }
          }
        })
      if (shallowJso === PLACE_HOLDER_JSO) {
        if (hasDefaults && options.defaultsFlag) {
          return {
            ...jso,
            [options.defaultsFlag]: defaultsMeta,
          }
        } else {
          return jso
        }
      }
      if (options.defaultsFlag) {
        shallowJso[options.defaultsFlag] = defaultsMeta
      }
      if (options.originsFlag) {
        const defaults = Object.entries(defaultsMeta)
          .filter(([key, value]) => value === DEFAULT_TYPE_FLAG_SYNTHETIC)
          .map(([key]) => key)
        if (defaults.length > 0 && originsForDefaults) {
          const newOrigins = defaults
            .reduce((collector, key) => {
              collector[key] = originsForDefaults
              return collector
            }, { ...resolveOriginsMetaRecord(shallowJso, options.originsFlag) ?? {} })
          setJsoProperty(shallowJso, options.originsFlag, newOrigins)
        }
      }
      return shallowJso
    },
    backward: (jso, ctx) => {
      const { path, options } = ctx
      if (!isObject(jso) || isArray(jso)) {
        return
      }
      if (isBroken(jso)) {
        return
      }
      if (options.defaultsFlag) {
        delete jso[options.defaultsFlag]
      }
      const candidates = Object.entries(map)
        .flatMap(([key, defaultValueOrFunction]) => {
          if (!(key in jso)) {
            return []
          }
          
          // Calculate the default value - either static or dynamic
          const defaultValue = resolveDefaultValue(defaultValueOrFunction, jso as Record<string, any>, ctx)
          
          // Skip if dynamic function returns undefined (no default for this case)
          if (defaultValue === undefined) {
            return []
          }
          
          return [{ value: jso[key], key, defaultValue }]
        })
        .filter(({ defaultValue, value }) => defaultValue === value)
        .filter(({ key, value }) => !options.skip || (!options.skip(value, [...path, key])))
      candidates
        .reverse()
        .forEach(({ key: propertyKey }) => {
          delete jso[propertyKey]
        })
      cleanSeveralOrigins(jso, candidates.map(value => value.key), options.originsFlag)
    },
  }
}

