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
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_NOT,
  JSON_SCHEMA_PROPERTY_TYPE,
} from '../rules/jsonschema.const'
import {
  SPEC_TYPE_ASYNCAPI_2,
  SPEC_TYPE_GRAPH_API,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_06,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
  SpecType,
} from '../spec-type'
import { JsonSchema, MetaDefinitions, OriginLeafs, PropertySkipFunction } from '../types'
import { isArray, isObject, JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { createEvaluationCacheService } from '../cache'
import { cleanOrigins, copyOrigins, mergeOrigins, resolveOrigins, setOrigins, setOriginsForArray } from '../origins'

type NativeAny = {
  [JSON_SCHEMA_PROPERTY_ANY_OF]: JsonSchema[]
} & JsonSchema

type NativeNothing = {
  [JSON_SCHEMA_PROPERTY_NOT]: NativeAny
} & JsonSchema

const createNativeAnySchema: (specType: SpecType, origins: OriginLeafs | undefined, originsFlag: symbol | undefined) => NativeAny = (specType, origins, originsFlag) => {
  const any: NativeAny = {
    [JSON_SCHEMA_PROPERTY_ANY_OF]: [
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_BOOLEAN },
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_STRING },
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_NUMBER },
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_INTEGER },
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_OBJECT },
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_ARRAY },
      { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_TYPE_NULL },
    ],
  }
  const anyAnyOf = any[JSON_SCHEMA_PROPERTY_ANY_OF]
  if (specType === SPEC_TYPE_OPEN_API_30) {
    anyAnyOf.pop()
  }
  setOrigins(any, JSON_SCHEMA_PROPERTY_ANY_OF, originsFlag, origins)
  setOriginsForArray(any[JSON_SCHEMA_PROPERTY_ANY_OF], originsFlag, anyAnyOf.map(() => origins))
  anyAnyOf.forEach(schemaWithType => {
    setOrigins(schemaWithType, JSON_SCHEMA_PROPERTY_TYPE, originsFlag, origins)
  })
  return any
}

const createNativeNothingSchema: (specType: SpecType, origins: OriginLeafs | undefined, originsFlag: symbol | undefined) => NativeNothing = (specType, origins, originsFlag) => {
  const nothing = { [JSON_SCHEMA_PROPERTY_NOT]: createNativeAnySchema(specType, origins, originsFlag) }
  setOrigins(nothing, JSON_SCHEMA_PROPERTY_NOT, originsFlag, origins)
  return nothing
}

const SOME_NATIVE_ANY: Record<SpecType, NativeAny> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: createNativeAnySchema(SPEC_TYPE_JSON_SCHEMA_04, undefined, undefined),
  [SPEC_TYPE_JSON_SCHEMA_06]: createNativeAnySchema(SPEC_TYPE_JSON_SCHEMA_06, undefined, undefined),
  [SPEC_TYPE_JSON_SCHEMA_07]: createNativeAnySchema(SPEC_TYPE_JSON_SCHEMA_07, undefined, undefined),
  [SPEC_TYPE_OPEN_API_30]: createNativeAnySchema(SPEC_TYPE_OPEN_API_30, undefined, undefined),
  [SPEC_TYPE_OPEN_API_31]: createNativeAnySchema(SPEC_TYPE_OPEN_API_31, undefined, undefined),
  [SPEC_TYPE_ASYNCAPI_2]: createNativeAnySchema(SPEC_TYPE_ASYNCAPI_2, undefined, undefined),
  [SPEC_TYPE_GRAPH_API]: createNativeAnySchema(SPEC_TYPE_GRAPH_API, undefined, undefined),
}

export const createNativeMetaDefinitions: (specType: SpecType, originsFlag: symbol | undefined) => MetaDefinitions = (specType, originsFlag) => {
  const someNativeAny = SOME_NATIVE_ANY[specType]
  const matchAnyOfFunctions = someNativeAny[JSON_SCHEMA_PROPERTY_ANY_OF].map((value, index) =>
    (otherArray: Record<PropertyKey, unknown>[], prefixPath: JsonPath, skip?: PropertySkipFunction) => {
      const otherArrayItem = otherArray[index]
      if (skip?.(otherArrayItem, [...prefixPath, index])) {
        return undefined
      }
      if (JSON_SCHEMA_PROPERTY_TYPE in otherArrayItem && otherArrayItem[JSON_SCHEMA_PROPERTY_TYPE] === value[JSON_SCHEMA_PROPERTY_TYPE]) {
        if (skip?.(otherArrayItem[JSON_SCHEMA_PROPERTY_TYPE], [...prefixPath, index, JSON_SCHEMA_PROPERTY_TYPE])) {
          return undefined
        }
        const { type, ...otherProperties } = otherArrayItem
        const entries = Object.entries(otherProperties)
        if (entries.length === 0) {
          return otherProperties
        }
        const anyPrpSkip = entries.some(([otherPrpKey, otherPrpVal]) => !!skip?.(otherPrpVal, [...prefixPath, index, otherPrpKey]))
        if (anyPrpSkip) {
          return undefined
        }
        return otherProperties
      }
      return undefined
    },
  )

  const extractCommonPropertiesIfAssignableToAnyOf = (jso: Record<PropertyKey, unknown>, prefixPath: JsonPath, originsFlag: symbol | undefined, skip?: PropertySkipFunction): Record<PropertyKey, unknown> | undefined => {
    if (!(JSON_SCHEMA_PROPERTY_ANY_OF in jso)) {
      return undefined
    }
    const { anyOf, ...rootProperties } = jso
    cleanOrigins(rootProperties, JSON_SCHEMA_PROPERTY_ANY_OF, originsFlag)

    if (!isArray(anyOf) || anyOf.length !== someNativeAny[JSON_SCHEMA_PROPERTY_ANY_OF].length) {
      return undefined
    }
    if (skip?.(anyOf, [JSON_SCHEMA_PROPERTY_ANY_OF])) {
      return undefined
    }

    return matchAnyOfFunctions.reduce((overallPropertiesToPull, f) => {
      if (!overallPropertiesToPull) {
        return undefined
      }
      const extraItemProperties = f(anyOf, [...prefixPath, JSON_SCHEMA_PROPERTY_ANY_OF], skip)
      if (!extraItemProperties) {
        return undefined
      }
      for (const prp in extraItemProperties) {
        if (prp in overallPropertiesToPull && extraItemProperties[prp] !== overallPropertiesToPull[prp]/*deep?*/) {
          return undefined
        } else {
          overallPropertiesToPull[prp] = extraItemProperties[prp]
          copyOrigins(extraItemProperties, overallPropertiesToPull, prp, prp, originsFlag)
        }
      }
      return overallPropertiesToPull
    }, rootProperties as Record<PropertyKey, unknown> | undefined)

  }

  const anyCache = createEvaluationCacheService()
  const nothingCache = createEvaluationCacheService()
  return {
    emptyJsonSchema: (origins) => anyCache.cacheEvaluationResultByFootprint([specType, ...(origins ?? []), originsFlag], () => createNativeAnySchema(specType, origins, originsFlag)),
    invertedEmptyJsonSchema: (origins) => nothingCache.cacheEvaluationResultByFootprint([specType, ...(origins ?? []), originsFlag], () => createNativeNothingSchema(specType, origins, originsFlag)),
    omitIfAssignableToEmptyJsonSchema: (jso, skip) => {
      const overallCommonProperties = extractCommonPropertiesIfAssignableToAnyOf(jso, [], originsFlag, skip)
      if (!overallCommonProperties) {
        return undefined
      }
      delete jso[JSON_SCHEMA_PROPERTY_ANY_OF]
      const resultedOrigins = resolveOrigins(jso, JSON_SCHEMA_PROPERTY_ANY_OF, originsFlag) ?? []
      cleanOrigins(jso, JSON_SCHEMA_PROPERTY_ANY_OF, originsFlag)
      mergeOrigins(overallCommonProperties, [jso], originsFlag)
      Object.assign(jso, overallCommonProperties)
      return resultedOrigins
    },
    omitIfAssignableToInvertedEmptyJsonSchema: (jso, skip) => {
      if (!(JSON_SCHEMA_PROPERTY_NOT in jso)) {
        return undefined
      }
      const { not, ..._ } = jso
      if (!isObject(not)) {
        return undefined
      }
      if (skip?.(not, [JSON_SCHEMA_PROPERTY_NOT])) {
        return undefined
      }
      const overallNotProperties = extractCommonPropertiesIfAssignableToAnyOf(not, [JSON_SCHEMA_PROPERTY_NOT], originsFlag, skip)
      if (!overallNotProperties) {
        return undefined
      }
      delete jso[JSON_SCHEMA_PROPERTY_NOT]
      const resultedOrigins = resolveOrigins(jso, JSON_SCHEMA_PROPERTY_NOT, originsFlag) ?? []
      cleanOrigins(jso, JSON_SCHEMA_PROPERTY_NOT, originsFlag)
      return resultedOrigins
    },
  }
}

const createSyntheticAnySchema: (origins: OriginLeafs | undefined, originsFlag: symbol | undefined) => JsonSchema = (origins, originsFlag) => {
  const any = { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY }
  setOrigins(any, JSON_SCHEMA_PROPERTY_TYPE, originsFlag, origins)
  return any
}

const createSyntheticNothingSchema: (origins: OriginLeafs | undefined, originsFlag: symbol | undefined) => JsonSchema = (origins, originsFlag) => {
  const nothing = { [JSON_SCHEMA_PROPERTY_TYPE]: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING }
  setOrigins(nothing, JSON_SCHEMA_PROPERTY_TYPE, originsFlag, origins)
  return nothing
}

export const createSyntheticMetaDefinitions: (specType: SpecType, originsFlag: symbol | undefined) => MetaDefinitions = (_, originsFlag) => {
  const anyCache = createEvaluationCacheService()
  const nothingCache = createEvaluationCacheService()
  return {
    emptyJsonSchema: (origins) => anyCache.cacheEvaluationResultByFootprint([...(origins ?? []), originsFlag], () => createSyntheticAnySchema(origins, originsFlag)),
    invertedEmptyJsonSchema: (origins) => nothingCache.cacheEvaluationResultByFootprint([...(origins ?? []), originsFlag], () => createSyntheticNothingSchema(origins, originsFlag)),
    omitIfAssignableToEmptyJsonSchema: (jso, skip) => {
      if (JSON_SCHEMA_PROPERTY_TYPE in jso && jso[JSON_SCHEMA_PROPERTY_TYPE] === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY) {
        if (skip?.(jso[JSON_SCHEMA_PROPERTY_TYPE], [JSON_SCHEMA_PROPERTY_TYPE])) {
          return undefined
        }
        delete jso[JSON_SCHEMA_PROPERTY_TYPE]
        const origins = resolveOrigins(jso, JSON_SCHEMA_PROPERTY_TYPE, originsFlag) ?? []
        cleanOrigins(jso, JSON_SCHEMA_PROPERTY_TYPE, originsFlag)
        return origins
      }
      return undefined
    },
    omitIfAssignableToInvertedEmptyJsonSchema: (jso, skip) => {
      if (JSON_SCHEMA_PROPERTY_TYPE in jso && jso[JSON_SCHEMA_PROPERTY_TYPE] === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING) {
        if (skip?.(jso[JSON_SCHEMA_PROPERTY_TYPE], [JSON_SCHEMA_PROPERTY_TYPE])) {
          return undefined
        }
        delete jso[JSON_SCHEMA_PROPERTY_TYPE]
        const origins = resolveOrigins(jso, JSON_SCHEMA_PROPERTY_TYPE, originsFlag) ?? []
        cleanOrigins(jso, JSON_SCHEMA_PROPERTY_TYPE, originsFlag)
        return origins
      }
      return undefined
    },
  }
}

const createNativeNothingSchemaForDeUnify: (emptySchema: JsonSchema, origins: OriginLeafs | undefined, originsFlag: symbol | undefined) => JsonSchema = (emptySchema, origins, originsFlag) => {
  const nothing = { [JSON_SCHEMA_PROPERTY_NOT]: emptySchema }
  setOrigins(nothing, JSON_SCHEMA_PROPERTY_NOT, originsFlag, origins)
  return nothing
}

export const createNativeMetaDefinitionsForDeUnify: (specType: SpecType, originsFlag: symbol | undefined) => MetaDefinitions = (specType, originsFlag) => {
  const nat = createNativeMetaDefinitions(specType, originsFlag)
  const syn = createSyntheticMetaDefinitions(specType, originsFlag)
  const nothingCache = createEvaluationCacheService()
  return {
    emptyJsonSchema: nat.emptyJsonSchema,
    invertedEmptyJsonSchema: (origins) => {
      const emptyJsonSchema = syn.emptyJsonSchema(origins)
      return nothingCache.cacheEvaluationResultByFootprint([emptyJsonSchema, ...(origins ?? []), originsFlag], () => createNativeNothingSchemaForDeUnify(emptyJsonSchema, origins, originsFlag))
    },
    omitIfAssignableToEmptyJsonSchema: nat.omitIfAssignableToEmptyJsonSchema,
    omitIfAssignableToInvertedEmptyJsonSchema: (jso, skip) => {
      if (!(JSON_SCHEMA_PROPERTY_NOT in jso)) {
        return undefined
      }
      const { not, ...rootProperties } = jso
      if (!isObject(not)) {
        return undefined
      }
      if (skip?.(not, [JSON_SCHEMA_PROPERTY_NOT])) {
        return undefined
      }

      if (JSON_SCHEMA_PROPERTY_TYPE in not && not[JSON_SCHEMA_PROPERTY_TYPE] === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY) {
        if (skip?.(not[JSON_SCHEMA_PROPERTY_TYPE], [JSON_SCHEMA_PROPERTY_NOT, JSON_SCHEMA_PROPERTY_TYPE])) {
          return undefined
        }
        delete jso[JSON_SCHEMA_PROPERTY_NOT]
        const origins = resolveOrigins(jso, JSON_SCHEMA_PROPERTY_NOT, originsFlag) ?? []
        cleanOrigins(jso, JSON_SCHEMA_PROPERTY_NOT, originsFlag)
        return origins
      }
      return undefined
    },
  }
}