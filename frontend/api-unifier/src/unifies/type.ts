import { DefaultMetaRecord, InternalUnifyOptions, JsonSchema, OriginLeafs, UnifyFunction } from '../types'
import {
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_NULL,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_NODE_TYPES,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_CONST,
  JSON_SCHEMA_PROPERTY_CONTAINS,
  JSON_SCHEMA_PROPERTY_CONTENT_MEDIA_TYPE,
  JSON_SCHEMA_PROPERTY_DEFAULT,
  JSON_SCHEMA_PROPERTY_DEFINITIONS,
  JSON_SCHEMA_PROPERTY_DEFS,
  JSON_SCHEMA_PROPERTY_DEPENDENCIES,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  JSON_SCHEMA_PROPERTY_DESCRIPTION,
  JSON_SCHEMA_PROPERTY_ENUM,
  JSON_SCHEMA_PROPERTY_EXAMPLES,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
  JSON_SCHEMA_PROPERTY_FORMAT,
  JSON_SCHEMA_PROPERTY_ITEMS,
  JSON_SCHEMA_PROPERTY_MAX_ITEMS,
  JSON_SCHEMA_PROPERTY_MAX_LENGTH,
  JSON_SCHEMA_PROPERTY_MAX_PROPERTIES,
  JSON_SCHEMA_PROPERTY_MAXIMUM,
  JSON_SCHEMA_PROPERTY_MIN_ITEMS,
  JSON_SCHEMA_PROPERTY_MIN_LENGTH,
  JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_MINIMUM,
  JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
  JSON_SCHEMA_PROPERTY_NOT,
  JSON_SCHEMA_PROPERTY_NULLABLE,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_PATTERN,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTY_NAMES,
  JSON_SCHEMA_PROPERTY_READ_ONLY,
  JSON_SCHEMA_PROPERTY_REF,
  JSON_SCHEMA_PROPERTY_REQUIRED,
  JSON_SCHEMA_PROPERTY_TYPE,
  JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
  JSON_SCHEMA_PROPERTY_WRITE_ONLY,
  JsonSchemaNodesNormalizedType,
  JsonSchemaNodeType,
} from '../rules/jsonschema.const'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { singleOrArrayToArray, uniqueItems } from '../utils'
import { mergeProhibitLiftCombiners } from '../lift-combiners'
import { combineJsonSchemaWithMetaJso } from './empty-schema'
import {
  cleanOrigins,
  copyOrigins,
  resolveOrigins,
  resolveOriginsMetaRecord,
  setOrigins,
  setOriginsForArray,
} from '../origins'

//version dependable?
const JSON_SCHEMA_TYPE_TO_DISCRIMINATOR_PROPS: Record<JsonSchemaNodeType, readonly string[]> = {
  [JSON_SCHEMA_NODE_TYPE_BOOLEAN]: [],
  [JSON_SCHEMA_NODE_TYPE_STRING]: [JSON_SCHEMA_PROPERTY_FORMAT, JSON_SCHEMA_PROPERTY_MIN_LENGTH, JSON_SCHEMA_PROPERTY_MAX_LENGTH, JSON_SCHEMA_PROPERTY_PATTERN],
  [JSON_SCHEMA_NODE_TYPE_NUMBER]: [JSON_SCHEMA_PROPERTY_FORMAT, JSON_SCHEMA_PROPERTY_MULTIPLE_OF, JSON_SCHEMA_PROPERTY_MINIMUM, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM, JSON_SCHEMA_PROPERTY_MAXIMUM, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM],
  [JSON_SCHEMA_NODE_TYPE_INTEGER]: [JSON_SCHEMA_PROPERTY_FORMAT, JSON_SCHEMA_PROPERTY_MULTIPLE_OF, JSON_SCHEMA_PROPERTY_MINIMUM, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM, JSON_SCHEMA_PROPERTY_MAXIMUM, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM],
  [JSON_SCHEMA_NODE_TYPE_OBJECT]: [JSON_SCHEMA_PROPERTY_REQUIRED, JSON_SCHEMA_PROPERTY_MIN_PROPERTIES, JSON_SCHEMA_PROPERTY_MAX_PROPERTIES, JSON_SCHEMA_PROPERTY_PROPERTY_NAMES, JSON_SCHEMA_PROPERTY_PROPERTIES, JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES, JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES],
  [JSON_SCHEMA_NODE_TYPE_ARRAY]: [JSON_SCHEMA_PROPERTY_CONTAINS, JSON_SCHEMA_PROPERTY_MIN_ITEMS, JSON_SCHEMA_PROPERTY_MAX_ITEMS, JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS, JSON_SCHEMA_PROPERTY_ITEMS, JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS],
  [JSON_SCHEMA_NODE_TYPE_NULL]: [],
}

const JSON_SCHEMA_TYPE_TO_RESTRICTED_PROPS: Record<JsonSchemaNodesNormalizedType, Set<string>> = Object.fromEntries(
  [
    ...Object.entries(JSON_SCHEMA_TYPE_TO_DISCRIMINATOR_PROPS)
      .map(([type, properties]) => {
          const allProperties = Object.keys(JSON_SCHEMA_TYPE_TO_DISCRIMINATOR_PROPS).filter(key => key !== type)
            .flatMap(key => JSON_SCHEMA_TYPE_TO_DISCRIMINATOR_PROPS[key as JsonSchemaNodeType])
            .reduce((acc, prop) => acc.add(prop), new Set<string>())
          properties.forEach(prop => allProperties.delete(prop))
          return [type as JsonSchemaNodeType, allProperties]
        },
      ),
    [JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY, new Set()],
    [JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING, new Set([
      // JSON_SCHEMA_PROPERTY_TITLE, cause it usefully when resolve this type by ref
      JSON_SCHEMA_PROPERTY_CONTENT_MEDIA_TYPE,
      JSON_SCHEMA_PROPERTY_CONST,
      JSON_SCHEMA_PROPERTY_PROPERTY_NAMES,
      JSON_SCHEMA_PROPERTY_CONTAINS,
      JSON_SCHEMA_PROPERTY_DEPENDENCIES,
      JSON_SCHEMA_PROPERTY_DEFS,
      JSON_SCHEMA_PROPERTY_DESCRIPTION,
      JSON_SCHEMA_PROPERTY_FORMAT,
      JSON_SCHEMA_PROPERTY_DEFAULT,
      JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
      JSON_SCHEMA_PROPERTY_MAXIMUM,
      JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
      JSON_SCHEMA_PROPERTY_MINIMUM,
      JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
      JSON_SCHEMA_PROPERTY_MAX_LENGTH,
      JSON_SCHEMA_PROPERTY_MIN_LENGTH,
      JSON_SCHEMA_PROPERTY_PATTERN,
      JSON_SCHEMA_PROPERTY_MAX_ITEMS,
      JSON_SCHEMA_PROPERTY_MIN_ITEMS,
      JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
      JSON_SCHEMA_PROPERTY_MAX_PROPERTIES,
      JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
      JSON_SCHEMA_PROPERTY_ITEMS,
      JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
      JSON_SCHEMA_PROPERTY_REQUIRED,
      JSON_SCHEMA_PROPERTY_ENUM,
      JSON_SCHEMA_PROPERTY_PROPERTIES,
      JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
      JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
      JSON_SCHEMA_PROPERTY_ALL_OF,
      JSON_SCHEMA_PROPERTY_ONE_OF,
      JSON_SCHEMA_PROPERTY_ANY_OF,
      JSON_SCHEMA_PROPERTY_NOT,
      JSON_SCHEMA_PROPERTY_NULLABLE,
      JSON_SCHEMA_PROPERTY_READ_ONLY,
      JSON_SCHEMA_PROPERTY_WRITE_ONLY,
      JSON_SCHEMA_PROPERTY_EXAMPLES,
      JSON_SCHEMA_PROPERTY_DEPRECATED,
      JSON_SCHEMA_PROPERTY_DEFINITIONS,
      JSON_SCHEMA_PROPERTY_REF,
    ])],
  ],
)

function inferTypes(jso: JsonSchema, allowedTypes: JsonSchemaNodeType[], options: InternalUnifyOptions): Record<JsonSchemaNodeType, OriginLeafs> {
  return allowedTypes
    .reduce((acc, type) => {
      const properties = JSON_SCHEMA_TYPE_TO_DISCRIMINATOR_PROPS[type]
      properties
        .filter(property => property in jso)
        .reduce((acc, property) => {
          let origins = acc[type]
          if (!origins) {
            origins = []
            acc[type] = origins
          }
          origins.push(...(resolveOrigins(jso, property, options.originsFlag) ?? []).filter(value => !origins.includes(value)))
          return acc
        }, acc)
      return acc
    }, {} as Record<JsonSchemaNodeType, OriginLeafs>)
}

export const isPureCombiner: (jso: Record<PropertyKey, unknown>) => boolean = jso => {
  const propertyKeys = Object.keys(jso)
  return propertyKeys.length === 1 && (JSON_SCHEMA_PROPERTY_ANY_OF === propertyKeys[0] || JSON_SCHEMA_PROPERTY_ONE_OF === propertyKeys[0] || JSON_SCHEMA_PROPERTY_NOT === propertyKeys[0])
}

export const isBroken: (jso: Record<PropertyKey, unknown>) => boolean = jso => {
  return JSON_SCHEMA_PROPERTY_ALL_OF in jso || JSON_SCHEMA_PROPERTY_REF in jso
}

function isReadyToTypeInfer(jso: unknown): jso is  Record<PropertyKey, unknown> {
  if (!isObject(jso) || isArray(jso)) {
    return false
  }
  if (isPureCombiner(jso)) {
    return false
  }
  return !isBroken(jso)

}

export const excludeNotAllowedTypes: (allowedTypes: JsonSchemaNodeType[]) => UnifyFunction = allowedTypes => (jso, {
  origins,
  options,
}) => {
  if (!isReadyToTypeInfer(jso)) {
    return jso
  }
  if (JSON_SCHEMA_PROPERTY_TYPE in jso) {
    const allowedTypesSet = new Set(allowedTypes)
    const existingAndAllowedTypes = singleOrArrayToArray((jso[JSON_SCHEMA_PROPERTY_TYPE])).filter(value => allowedTypesSet.has(value as JsonSchemaNodeType))
    if (existingAndAllowedTypes.length === 0) {
      return combineJsonSchemaWithMetaJso(jso, options.syntheticMetaDefinitions.invertedEmptyJsonSchema(origins), options)
    }
    return {
      ...jso,
      [JSON_SCHEMA_PROPERTY_TYPE]: existingAndAllowedTypes,
    }
  }
  //todo This method doesn't support ORIGINS merge. Fix it before usage
  return {
    ...jso,
    [JSON_SCHEMA_PROPERTY_TYPE]: allowedTypes,
  }
}

export const jsonSchemaTypeInferWithRestriction: (allowedTypes: JsonSchemaNodeType[]) => UnifyFunction = allowedTypes =>
  ({
    forward: (jso, { origins, options }) => {
      if (!isReadyToTypeInfer(jso)) {
        return jso
      }
      if (JSON_SCHEMA_PROPERTY_TYPE in jso) {
        return jso
      }
      const typesToOrigins = inferTypes(jso, allowedTypes, options)
      const types = Object.keys(typesToOrigins) as JsonSchemaNodeType[]
      if (types.length === 0) {
        return combineJsonSchemaWithMetaJso(jso, options.syntheticMetaDefinitions.emptyJsonSchema(options.createOriginsForDefaults(origins)), options)
      }
      const overallOrigins = uniqueItems(Object.values(typesToOrigins).flatMap(value => value))
      const result = {
        ...jso,
        [JSON_SCHEMA_PROPERTY_TYPE]: types,
      }
      setOrigins(result, JSON_SCHEMA_PROPERTY_TYPE, options.originsFlag, overallOrigins)
      setOriginsForArray(result[JSON_SCHEMA_PROPERTY_TYPE], options.originsFlag, types.map(type => typesToOrigins[type]))
      return result
    },
    backward: (jso, { path, options }) => {
      if (!isObject(jso) || isArray(jso)) {
        return
      }
      if (options.allowNotValidSyntheticChanges) {
        return
      }
      if (options.syntheticMetaDefinitions.omitIfAssignableToEmptyJsonSchema(jso, options.skip ? (v, p) => options.skip!(v, [...path, ...p]) : undefined)) {
        return //cause omit type is ANY
      }
      if (options.syntheticMetaDefinitions.omitIfAssignableToInvertedEmptyJsonSchema(jso, options.skip ? (v, p) => options.skip!(v, [...path, ...p]) : undefined)) {
        //todo This method doesn't support ORIGINS merge. Fix it before usage
        Object.assign(jso, { [JSON_SCHEMA_PROPERTY_TYPE]: undefined }) //NEED FIND BETTER WAY TO IDENTIFY NEVER IN NATIVE SPEC
        return
      }
    },
  })

export const jsonSchemaTypeInfer = jsonSchemaTypeInferWithRestriction(JSON_SCHEMA_NODE_TYPES)

export const splitJsonSchemaTypeArray: UnifyFunction = (jso, { origins, options }) => {
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  if (!(JSON_SCHEMA_PROPERTY_TYPE in jso)) {
    return jso
  }
  const types = jso[JSON_SCHEMA_PROPERTY_TYPE]
  if (!isArray(types)) {
    return jso
  }
  if (types.length === 0) {
    return combineJsonSchemaWithMetaJso(jso, options.syntheticMetaDefinitions.invertedEmptyJsonSchema(origins), options)
  }
  if (types.length === 1) {
    const result = {
      ...jso,
      [JSON_SCHEMA_PROPERTY_TYPE]: types[0],
    }
    setOrigins(result, JSON_SCHEMA_PROPERTY_TYPE, options.originsFlag, resolveOrigins(types, 0, options.originsFlag))
    return result
  }
  const typesOrigins = resolveOriginsMetaRecord(types, options.originsFlag) ?? {}
  const { type, ...result } = jso
  result[JSON_SCHEMA_PROPERTY_ANY_OF] = types.map((type, index) => {
    const schemaType = { [JSON_SCHEMA_PROPERTY_TYPE]: type }
    copyOrigins(types, schemaType, index, JSON_SCHEMA_PROPERTY_TYPE, options.originsFlag)
    return schemaType
  })
  copyOrigins(result, result, JSON_SCHEMA_PROPERTY_TYPE, JSON_SCHEMA_PROPERTY_ANY_OF, options.originsFlag)
  setOriginsForArray(result[JSON_SCHEMA_PROPERTY_ANY_OF], options.originsFlag, types.map((_, index) => typesOrigins[index]))
  cleanOrigins(result, JSON_SCHEMA_PROPERTY_TYPE, options.originsFlag)
  return mergeProhibitLiftCombiners(result, options)
}

export const cleanJsonSchemaTypeSpecificProperties: UnifyFunction = (jso, { options }) => {
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  if (!(JSON_SCHEMA_PROPERTY_TYPE in jso)) {
    return jso
  }
  const types = jso[JSON_SCHEMA_PROPERTY_TYPE] as JsonSchemaNodesNormalizedType | JsonSchemaNodesNormalizedType[]
  if (isArray(types)) {
    return jso
  }
  const notAllowedProperties = JSON_SCHEMA_TYPE_TO_RESTRICTED_PROPS[types]
  const toCleanupProperties = Object.keys(jso).filter(key => notAllowedProperties.has(key))
  if (toCleanupProperties.length === 0) {
    return jso
  }
  const shallowCopy = { ...jso }
  const defaultMetaCopy = { ...((options.defaultsFlag ? jso[options.defaultsFlag] : {}) ?? {}) } as DefaultMetaRecord
  const originsMetaCopy = { ...resolveOriginsMetaRecord(shallowCopy, options.originsFlag) ?? {} }
  toCleanupProperties.forEach(key => {
    delete shallowCopy[key]
    delete defaultMetaCopy[key]
    delete originsMetaCopy[key]
  })
  if (options.defaultsFlag) {
    if (Object.keys(defaultMetaCopy).length === 0) {
      delete shallowCopy[options.defaultsFlag]
    } else {
      shallowCopy[options.defaultsFlag] = defaultMetaCopy
    }
  }
  if (options.originsFlag) {
    if (Object.keys(originsMetaCopy).length === 0) {
      delete shallowCopy[options.originsFlag]
    } else {
      shallowCopy[options.originsFlag] = originsMetaCopy
    }
  }
  return shallowCopy
}
