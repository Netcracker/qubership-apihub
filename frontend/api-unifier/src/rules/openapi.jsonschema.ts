import {
  BEFORE_SECOND_DATA_LEVEL,
  CURRENT_DATA_LEVEL,
  InternalUnifyOptions,
  NormalizationRules,
  UnifyContext,
  UnifyFunction,
} from '../types'
import {
  OpenApiSpecVersion,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
} from '../spec-type'
import * as resolvers from '../resolvers'
import {
  JSON_SCHEMA_NODE_TYPE_ARRAY,
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  JSON_SCHEMA_PROPERTY_ITEMS,
  JSON_SCHEMA_PROPERTY_NULLABLE,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_READ_ONLY,
  JSON_SCHEMA_PROPERTY_WRITE_ONLY,
  JsonSchemaNodeType,
} from './jsonschema.const'
import {
  deepEqualsWithEmptySchema,
  JSON_SCHEMA_DEFAULTS,
  JSON_SCHEMA_DEFAULTS_UNIFY_FUNCTION,
  JSON_SCHEMA_REPLACES,
  JSON_SCHEMA_REPLACES_UNIFY_FUNCTION,
  jsonSchemaRules,
} from './jsonschema'
import { concatArrays, insertIntoArrayByInstruction, replaceValue } from '../utils'
import {
  checkContains,
  checkType,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { DefaultValueMapping, JsonPrimitiveValue, valueDefaults } from '../unifies/defaults'
import { jsonSchemaTypeInfer, jsonSchemaTypeInferWithRestriction } from '../unifies/type'
import { EMPTY_MARKER, ReplaceMapping, TO_EMPTY_OBJECT_MAPPING, valueReplaces } from '../unifies/replaces'
import {
  OPEN_API_JSON_SCHEMA_PROPERTY_ATTRIBUTE,
  OPEN_API_JSON_SCHEMA_PROPERTY_WRAPPED,
  OPEN_API_JSON_SCHEMA_PROPERTY_XML,
} from './openapi.const'
import { openApiExternalDocsRules, openApiSpecificationExtensionRules } from './openapi.jsonschema.common'

// OpenAPI 3.0 JSON Schema Node Types
const OPEN_API_30_JSON_SCHEMA_NODE_TYPES = [
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
] satisfies JsonSchemaNodeType[]

// OpenAPI 3.0 JSON Schema Default Values
const OPEN_API_30_JSON_SCHEMA_DEFAULTS: DefaultValueMapping = {
  ...JSON_SCHEMA_DEFAULTS[SPEC_TYPE_JSON_SCHEMA_04],
  [JSON_SCHEMA_PROPERTY_NULLABLE]: false,
  [JSON_SCHEMA_PROPERTY_READ_ONLY]: false,
  [JSON_SCHEMA_PROPERTY_WRITE_ONLY]: false,
  [JSON_SCHEMA_PROPERTY_DEPRECATED]: false,
  [JSON_SCHEMA_PROPERTY_ITEMS]: EMPTY_MARKER,
  [OPEN_API_JSON_SCHEMA_PROPERTY_XML]: EMPTY_MARKER,
}
delete OPEN_API_30_JSON_SCHEMA_DEFAULTS[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]

// OpenAPI 3.0 JSON Schema Replace Mappings
const OPEN_API_30_JSON_SCHEMA_REPLACES: Record<string, ReplaceMapping> = {
  ...JSON_SCHEMA_REPLACES[SPEC_TYPE_JSON_SCHEMA_04],
  [JSON_SCHEMA_PROPERTY_ITEMS]: {
    mapping: new Map([
      [EMPTY_MARKER, {
        value: (origins, opts) => opts.syntheticMetaDefinitions.emptyJsonSchema(origins),
        reverseMatcher: deepEqualsWithEmptySchema,
      }],
    ]),
  },
  [OPEN_API_JSON_SCHEMA_PROPERTY_XML]: TO_EMPTY_OBJECT_MAPPING,
}

delete OPEN_API_30_JSON_SCHEMA_REPLACES[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]

// Helper function for XML wrapped default value
const getXmlWrappedDefault = (jso: Record<string, unknown>, ctx: UnifyContext<InternalUnifyOptions>): JsonPrimitiveValue | undefined => {
  if (ctx.parentValue && typeof ctx.parentValue === 'object' && 'type' in ctx.parentValue && ctx.parentValue.type === JSON_SCHEMA_NODE_TYPE_ARRAY) {
    return false
  }
  return undefined
}

// OpenAPI XML Default Values
const OPEN_API_XML_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_JSON_SCHEMA_PROPERTY_WRAPPED]: getXmlWrappedDefault,
  [OPEN_API_JSON_SCHEMA_PROPERTY_ATTRIBUTE]: false,
}

/**
 * OpenAPI JSON Schema Extension Rules
 * Includes OpenAPI-specific extensions to JSON Schema:
 * - xml: XML representation
 * - discriminator: Polymorphism support
 * - externalDocs: External documentation reference *
 */
const openApiJsonSchemaExtensionRules = (): NormalizationRules => ({
  '/xml': {
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.mergeObjects,
    unify: [
      valueDefaults(OPEN_API_XML_DEFAULTS),
    ],
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
    ...openApiSpecificationExtensionRules,
  },
  '/discriminator': {
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.last, //todo need check
    '/propertyName': {
      validate: checkType(TYPE_STRING),
      merge: resolvers.last, //todo need check
    },
    '/mapping': {
      validate: checkType(TYPE_OBJECT),
      merge: resolvers.last, //todo need check
      '/*': {
        validate: checkType(TYPE_STRING),
        merge: resolvers.last, //todo need check
      },
    },
  },
  ...openApiExternalDocsRules,
  ...openApiSpecificationExtensionRules,
})

/**
 * Factory for OpenAPI 3.0 JSON Schema Rules
 * Based on JSON Schema Draft 04 with OpenAPI-specific extensions
 */
const customFor30JsonSchemaRulesFactory = (): NormalizationRules => {
  const baseJsonSchemaVersion = SPEC_TYPE_JSON_SCHEMA_04
  const core = jsonSchemaRules(baseJsonSchemaVersion, () => customFor30JsonSchemaRules)
  const extension = openApiJsonSchemaExtensionRules()
  return ({
    ...core,
    ...extension,
    '/type': {
      validate: [checkType(TYPE_STRING), checkContains(...OPEN_API_30_JSON_SCHEMA_NODE_TYPES)],
      merge: resolvers.mergeTypes,
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    },
    '/items': () => ({
      ...customFor30JsonSchemaRules,
      merge: resolvers.itemsMergeResolver,
      hashStrategy: CURRENT_DATA_LEVEL,
      newDataLayer: true,
    }),
    '/additionalItems': {
      validate: () => false,
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
      newDataLayer: true,
    },
    '/patternProperties': {
      validate: () => false,
      hashStrategy: BEFORE_SECOND_DATA_LEVEL,
      newDataLayer: true,
    },
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
      validate: checkType(TYPE_BOOLEAN),
      merge: resolvers.or,
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/nullable': {
      validate: checkType(TYPE_BOOLEAN),
      merge: resolvers.or, //todo need check
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/example': {
      validate: checkType(...TYPE_JSON_ANY),
      merge: resolvers.last,
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    unify: insertIntoArrayByInstruction(
      concatArrays<UnifyFunction>(core.unify, extension.unify),
      replaceValue(JSON_SCHEMA_DEFAULTS_UNIFY_FUNCTION[baseJsonSchemaVersion], valueDefaults(OPEN_API_30_JSON_SCHEMA_DEFAULTS)),
      replaceValue(JSON_SCHEMA_REPLACES_UNIFY_FUNCTION[baseJsonSchemaVersion], valueReplaces(OPEN_API_30_JSON_SCHEMA_REPLACES)),
      replaceValue(jsonSchemaTypeInfer, jsonSchemaTypeInferWithRestriction(OPEN_API_30_JSON_SCHEMA_NODE_TYPES)),
    ),
  })
}
const customFor30JsonSchemaRules: NormalizationRules = customFor30JsonSchemaRulesFactory() // used to proper cycle rules

/**
 * Factory for OpenAPI 3.1 JSON Schema Rules
 * Based on JSON Schema Draft 07 with OpenAPI-specific extensions
 */
const customFor31JsonSchemaRulesFactory = (): NormalizationRules => ({
  ...jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07, () => customFor31JsonSchemaRules),
  ...openApiJsonSchemaExtensionRules(),
})
const customFor31JsonSchemaRules = customFor31JsonSchemaRulesFactory() // used to proper cycle rules

/**
 * Returns OpenAPI JSON Schema rules based on OpenAPI version
 * This function is the main entry point for getting OpenAPI-flavored JSON Schema rules
 *
 * @param version - OpenAPI specification version
 * @param openApiExternalDocsRules - External documentation rules from OpenAPI
 * @param openApiSpecificationExtensionRules - Specification extension rules from OpenAPI
 */
export const openApiJsonSchemaRules = (version: OpenApiSpecVersion): NormalizationRules => {
  switch (version) {
    case SPEC_TYPE_OPEN_API_30:
      return customFor30JsonSchemaRules
    case SPEC_TYPE_OPEN_API_31:
      return customFor31JsonSchemaRules
  }
}
