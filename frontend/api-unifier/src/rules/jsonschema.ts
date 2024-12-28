import { BEFORE_SECOND_DATA_LEVEL, CURRENT_DATA_LEVEL, NormalizationRules, OriginLeafs, UnifyFunction } from '../types'
import * as resolvers from '../resolvers'
import {
  JsonSchemaSpecVersion,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_06,
  SPEC_TYPE_JSON_SCHEMA_07,
} from '../spec-type'
import {
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_NODE_TYPES,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
  JSON_SCHEMA_PROPERTY_MIN_ITEMS,
  JSON_SCHEMA_PROPERTY_MIN_LENGTH,
  JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_NOT,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  JSON_SCHEMA_PROPERTY_READ_ONLY,
  JSON_SCHEMA_PROPERTY_REQUIRED,
  JSON_SCHEMA_PROPERTY_TITLE,
  JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
  JSON_SCHEMA_PROPERTY_WRITE_ONLY,
} from './jsonschema.const'
import {
  cleanJsonSchemaTypeSpecificProperties,
  excludeNotAllowedTypes,
  jsonSchemaTypeInfer,
  splitJsonSchemaTypeArray,
} from '../unifies/type'
import { extractEmptyJsonSchema } from '../unifies/empty-schema'
import {
  checkContains,
  checkType,
  TYPE_ARRAY,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_NUMBER,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { concatArrays, insertIntoArrayByInstruction, replaceValue } from '../utils'
import { unifyJsonSchemaRequired } from '../unifies/required'
import { unifyJsonSchemaEnums } from '../unifies/enums'
import {
  cleanUpSyntheticJsonSchemaTypes,
  forwardOnlyCleanUpSyntheticJsonSchemaTypes,
} from '../unifies/cleanup-sythetic-types'
import { JsonPrimitiveValue, valueDefaults } from '../unifies/defaults'
import { deepEqualsMatcher, ReplaceMapping, ReverseMatcherFunction, valueReplaces } from '../unifies/replaces'
import { ANY_VALUE, CompareMeta, deepCircularEqualsWithPropertyFilter } from '../unifies/deep-equals'
import { createEvaluationCacheService } from '../cache'
import { calculateSchemaName } from '../deprecated-item-description'
import { JSON_SCHEMA_DEPRECATION_RESOLVER } from './jsonschema.deprecated'

const EMPTY_MARKER = Symbol('empty-items')

const JSON_SCHEMA_DEFAULTS_COMMON: Record<string, JsonPrimitiveValue> = {
  [JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES]: true,
  [JSON_SCHEMA_PROPERTY_MIN_LENGTH]: 0,
  [JSON_SCHEMA_PROPERTY_MIN_PROPERTIES]: 0,
  [JSON_SCHEMA_PROPERTY_MIN_ITEMS]: 0,
  [JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS]: false,
  [JSON_SCHEMA_PROPERTY_REQUIRED]: EMPTY_MARKER,
  [JSON_SCHEMA_PROPERTY_PROPERTIES]: EMPTY_MARKER,
  [JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]: EMPTY_MARKER,
}
export const JSON_SCHEMA_DEFAULTS: Record<JsonSchemaSpecVersion, Record<string, JsonPrimitiveValue>> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: {
    ...JSON_SCHEMA_DEFAULTS_COMMON,
    //not extends to next version
    [JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM]: false,
    [JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM]: false,
  },
  [SPEC_TYPE_JSON_SCHEMA_06]: {
    ...JSON_SCHEMA_DEFAULTS_COMMON,
  },
  [SPEC_TYPE_JSON_SCHEMA_07]: {
    ...JSON_SCHEMA_DEFAULTS_COMMON,
    [JSON_SCHEMA_PROPERTY_READ_ONLY]: false,
    [JSON_SCHEMA_PROPERTY_WRITE_ONLY]: false,
    [JSON_SCHEMA_PROPERTY_DEPRECATED]: false,
  },
}
export const JSON_SCHEMA_DEFAULTS_UNIFY_FUNCTION: Record<JsonSchemaSpecVersion, UnifyFunction> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: valueDefaults(JSON_SCHEMA_DEFAULTS[SPEC_TYPE_JSON_SCHEMA_04]),
  [SPEC_TYPE_JSON_SCHEMA_06]: valueDefaults(JSON_SCHEMA_DEFAULTS[SPEC_TYPE_JSON_SCHEMA_06]),
  [SPEC_TYPE_JSON_SCHEMA_07]: valueDefaults(JSON_SCHEMA_DEFAULTS[SPEC_TYPE_JSON_SCHEMA_07]),
}

const IGNORED_IN_FUTURE_ORIGINS: OriginLeafs = []

export const deepEqualsWithEmptySchema: ReverseMatcherFunction = (value, extraIgnoreProperties, opts) => {
  const syntheticAny = { ...opts.syntheticMetaDefinitions.emptyJsonSchema(IGNORED_IN_FUTURE_ORIGINS) }
  const nativeAny = { ...opts.nativeMetaDefinitions.emptyJsonSchema(IGNORED_IN_FUTURE_ORIGINS) }
  extraIgnoreProperties.forEach(key => {
    delete syntheticAny[key]
    delete nativeAny[key]
  })
  const compareConfig: CompareMeta = {
    cache: createEvaluationCacheService()/*may be more global?*/,
    ignoreProperties: {
      ...syntheticAny,
      ...nativeAny,
      ...[...extraIgnoreProperties].reduce((collector, prop) => {
        collector[prop] = ANY_VALUE
        return collector
      }, {} as Record<PropertyKey, unknown>),
    },
  }
  return deepCircularEqualsWithPropertyFilter(value, {}/*means value absolutly empty and ready to cleanup*/, compareConfig)
}
export const deepEqualsWithInvertedEmptySchema: ReverseMatcherFunction = (value, extraIgnoreProperties, opts) => {
  const compareConfig: CompareMeta = {
    cache: createEvaluationCacheService()/*may be more global?*/,
    ignoreProperties: {
      ...opts.syntheticMetaDefinitions.invertedEmptyJsonSchema(IGNORED_IN_FUTURE_ORIGINS),
      ...opts.nativeMetaDefinitions.invertedEmptyJsonSchema(IGNORED_IN_FUTURE_ORIGINS),
      ...{ [JSON_SCHEMA_PROPERTY_NOT]: {} },// abuse. Find better solution please
      ...[...extraIgnoreProperties].reduce((collector, prop) => { //origins
        collector[prop] = ANY_VALUE
        return collector
      }, {} as Record<PropertyKey, unknown>),
    },
  }
  return deepCircularEqualsWithPropertyFilter(value, {}/*means value absolutly empty and ready to cleanup*/, compareConfig)
}

const JSON_SCHEMA_REPLACES_COMMON: Record<string, ReplaceMapping> = {
  [JSON_SCHEMA_PROPERTY_REQUIRED]: {
    mapping: new Map([[EMPTY_MARKER, {
      value: () => [],
      reverseMatcher: deepEqualsMatcher([]),
    }]]),
  },
  [JSON_SCHEMA_PROPERTY_PROPERTIES]: {
    mapping: new Map([[EMPTY_MARKER, {
      value: () => ({}),
      reverseMatcher: deepEqualsMatcher({}),
    }]]),
  },
  [JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]: {
    mapping: new Map([[EMPTY_MARKER, {
      value: () => ({}),
      reverseMatcher: deepEqualsMatcher({}),
    }]]),
  },
  [JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES]: {
    mapping: new Map([
      [true, {
        value: (origins, opts) => opts.syntheticMetaDefinitions.emptyJsonSchema(origins),
        reverseMatcher: deepEqualsWithEmptySchema,
      }],
      [false, {
        value: (origins, opts) => opts.syntheticMetaDefinitions.invertedEmptyJsonSchema(origins),
        reverseMatcher: deepEqualsWithInvertedEmptySchema,
      }],
    ]),
  },
}
export const JSON_SCHEMA_REPLACES: Record<JsonSchemaSpecVersion, Record<string, ReplaceMapping>> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: {
    ...JSON_SCHEMA_REPLACES_COMMON,
  },
  [SPEC_TYPE_JSON_SCHEMA_06]: {
    ...JSON_SCHEMA_REPLACES_COMMON,
  },
  [SPEC_TYPE_JSON_SCHEMA_07]: {
    ...JSON_SCHEMA_REPLACES_COMMON,
  },
}
export const JSON_SCHEMA_REPLACES_UNIFY_FUNCTION: Record<JsonSchemaSpecVersion, UnifyFunction> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: valueReplaces(JSON_SCHEMA_REPLACES[SPEC_TYPE_JSON_SCHEMA_04]),
  [SPEC_TYPE_JSON_SCHEMA_06]: valueReplaces(JSON_SCHEMA_REPLACES[SPEC_TYPE_JSON_SCHEMA_06]),
  [SPEC_TYPE_JSON_SCHEMA_07]: valueReplaces(JSON_SCHEMA_REPLACES[SPEC_TYPE_JSON_SCHEMA_07]),
}

const versionSpecific: Record<JsonSchemaSpecVersion, (self: () => NormalizationRules) => NormalizationRules> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: () => ({}),
  [SPEC_TYPE_JSON_SCHEMA_06]: self => ({
    // [`/${JSON_SCHEMA_PROPERTY_CONTENT_MEDIA_TYPE}`]:{}, loose type matching :(
    '/contentMediaType': {
      validate: checkType(TYPE_STRING),
      merge: resolvers.last,
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/const': {
      validate: checkType(...TYPE_JSON_ANY),
      merge: resolvers.equal,
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/propertyNames': () => {
      const common = self()
      return {
        ...common,
        //maybe better to remove propertyNames at all?
        unify: insertIntoArrayByInstruction(concatArrays<UnifyFunction>(common.unify), replaceValue(jsonSchemaTypeInfer, excludeNotAllowedTypes([JSON_SCHEMA_NODE_TYPE_STRING]))),
        hashStrategy: CURRENT_DATA_LEVEL,
      }
    },
    '/contains': self,
    '/dependencies': {
      '/*': ({ value }) => (Array.isArray(value)
          ? {
            validate: checkType(TYPE_ARRAY),
            '/*': {
              validate: checkType(TYPE_STRING),
            },
          }
          : self()
      ),
      validate: checkType(TYPE_OBJECT),
      merge: resolvers.dependenciesMergeResolver,
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/defs': {
      '/*': self,
      validate: checkType(TYPE_OBJECT),
      merge: resolvers.mergeObjects,
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/additionalProperties': () => ({
      ...self(),
      merge: resolvers.additionalPropertiesMergeResolver,
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
      newDataLayer: true,
    }),
    '/additionalItems': () => ({
      ...self(),
      merge: resolvers.additionalItemsMergeResolver,
      hashStrategy: CURRENT_DATA_LEVEL,
      newDataLayer: true,
    }),
    '/exclusiveMaximum': {
      validate: checkType(TYPE_NUMBER),
      merge: resolvers.minValue, //todo how it works for allOf
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/exclusiveMinimum': {
      validate: checkType(TYPE_NUMBER),
      merge: resolvers.maxValue, //todo how it works for allOf
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    validate: checkType(TYPE_OBJECT, TYPE_BOOLEAN),
  }),
  [SPEC_TYPE_JSON_SCHEMA_07]: self => ({
    ...versionSpecific[SPEC_TYPE_JSON_SCHEMA_06](self),
    '/readOnly': {
      validate: checkType(TYPE_BOOLEAN),
      merge: resolvers.or,
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/writeOnly': {
      validate: checkType(TYPE_BOOLEAN),
      merge: resolvers.or,
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/deprecated': {
      merge: resolvers.or,
      validate: checkType(TYPE_BOOLEAN),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
  }),
}

export const jsonSchemaRules: (
  version: JsonSchemaSpecVersion,
  self?: () => NormalizationRules,
) => NormalizationRules
  = (
  version,
  self = () => jsonSchemaRules(version),
) => ({
  '/type': ({ value }) => ({
    ...(typeof value === 'string'
      ? { validate: [checkContains(...JSON_SCHEMA_NODE_TYPES)] }
      : {
        validate: checkType(TYPE_ARRAY),
        '/*': { validate: [checkType(TYPE_STRING), checkContains(...JSON_SCHEMA_NODE_TYPES)] },
      }),
    merge: resolvers.mergeTypes,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  }),
  '/title': {
    validate: checkType(TYPE_STRING),
    merge: resolvers.last,
  },
  '/description': {
    validate: checkType(TYPE_STRING),
    merge: resolvers.last,
  },
  '/format': {
    validate: checkType(TYPE_STRING),
    merge: resolvers.last,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/default': {
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.last,
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/multipleOf': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.mergeMultipleOf,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/maximum': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.minValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/exclusiveMaximum': {
    validate: checkType(TYPE_BOOLEAN),
    merge: resolvers.or,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/minimum': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.maxValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/exclusiveMinimum': {
    validate: checkType(TYPE_BOOLEAN),
    merge: resolvers.or,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/maxLength': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.minValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/minLength': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.maxValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/pattern': {
    validate: checkType(TYPE_STRING),
    merge: resolvers.mergePattern,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/maxItems': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.minValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/minItems': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.maxValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/uniqueItems': {
    validate: checkType(TYPE_BOOLEAN),
    merge: resolvers.or,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/maxProperties': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.minValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/minProperties': {
    validate: checkType(TYPE_NUMBER),
    merge: resolvers.maxValue,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/items': ({ value }) => ({
    ...(Array.isArray(value)
        ? {
          validate: [checkType(TYPE_ARRAY)],
          '/*': {
            ...self(),
            hashStrategy: BEFORE_SECOND_DATA_LEVEL,
            newDataLayer: true,
          },
        }
        : {
          ...self(),
          newDataLayer: true,
        }
    ),
    merge: resolvers.itemsMergeResolver,
    hashStrategy: CURRENT_DATA_LEVEL,
  }),
  deprecation: {
    deprecationResolver: ctx => JSON_SCHEMA_DEPRECATION_RESOLVER(ctx),
    descriptionCalculator: ctx => `[Deprecated] schema ${calculateSchemaName(ctx)}`
  },
  '/additionalItems': ({ value }) => ({
    ...(typeof value === 'boolean'
      ? { validate: [] }
      : {
        ...self(),
        newDataLayer: true,
      }),
    merge: resolvers.additionalItemsMergeResolver,
    hashStrategy: CURRENT_DATA_LEVEL,
  }),
  '/required': {
    validate: checkType(TYPE_ARRAY),
    merge: resolvers.mergeStringSets,
    '/*': {
      validate: checkType(TYPE_STRING),
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    },
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/enum': {
    validate: checkType(TYPE_ARRAY),
    merge: resolvers.mergeEnum,
    unify: unifyJsonSchemaEnums,
    '/**': {
      validate: checkType(...TYPE_JSON_ANY),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/properties': {
    '/*': () => ({
      ...self(),
      newDataLayer: true,
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    }),
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.propertiesMergeResolver,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/additionalProperties': ({ value }) => ({
    ...(typeof value === 'boolean' ? { validate: [] } : self()),
    merge: resolvers.additionalPropertiesMergeResolver,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    newDataLayer: true,
  }),
  '/patternProperties': {
    '/*': () => ({
      ...self(),
      newDataLayer: true,
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    }),
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.propertiesMergeResolver,
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/oneOf': {
    validate: checkType(TYPE_ARRAY),
    merge: resolvers.mergeCombination,
    '/*': () => ({ ...self(), hashStrategy: BEFORE_SECOND_DATA_LEVEL }),
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  },
  '/anyOf': {
    validate: checkType(TYPE_ARRAY),
    merge: resolvers.mergeCombination,
    '/*': self,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  },
  '/not': () => ({
    ...self(),
    merge: resolvers.mergeNot,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  }),
  //TODO NOT BY SPECIFICATION. ONLY IN 06 VERSION. NC SPECIFIC EXCLUSION
  '/examples': {
    validate: checkType(TYPE_ARRAY),
    merge: resolvers.last,
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/definitions': {
    '/*': self,
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.mergeObjects,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  },
  '/allOf': {
    validate: checkType(TYPE_ARRAY),
    //actually this contains only dead allOf. Cause all other should be already resolved
    merge: resolvers.concatArrays,
    '/*': self,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  },
  '/$ref': {
    validate: checkType(TYPE_STRING),
    //actually this contains only dead refs. Cause all other should be already resolved
    merge: resolvers.concatString,
    //why anyOf?
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  },
  //4.3.2. Boolean JSON Schemas - not supported. Cause not tested
  // The boolean schema values "true" and "false" are trivial schemas that always produce themselves as assertion results, regardless of the instance value. They never produce annotation results.
  //
  // These boolean schemas exist to clarify schema author intent and facilitate schema processing optimizations. They behave identically to the following schema objects (where "not" is part of the subschema application vocabulary defined in this document).
  //
  // true:
  // Always passes validation, as if the empty schema {}
  // false:
  // Always fails validation, as if the schema { "not": {} }
  // While the empty schema object is unambiguous, there are many possible equivalents to the "false" schema. Using the boolean values ensures that the intent is clear to both human readers and implementations.
  validate: checkType(TYPE_OBJECT),
  merge: resolvers.jsonSchemaMergeResolver,
  canLiftCombiners: true,
  resolvedReferenceNamePropertyKey: JSON_SCHEMA_PROPERTY_TITLE,
  unify: [
    extractEmptyJsonSchema,
    jsonSchemaTypeInfer,
    JSON_SCHEMA_DEFAULTS_UNIFY_FUNCTION[version],
    JSON_SCHEMA_REPLACES_UNIFY_FUNCTION[version],
    splitJsonSchemaTypeArray,
    cleanJsonSchemaTypeSpecificProperties,
    unifyJsonSchemaRequired,
    cleanUpSyntheticJsonSchemaTypes,
  ],
  mandatoryUnify: [forwardOnlyCleanUpSyntheticJsonSchemaTypes],
  ...versionSpecific[version](self),
  hashStrategy: CURRENT_DATA_LEVEL,
  hashOwner: true,
})
