import { BEFORE_SECOND_DATA_LEVEL, CURRENT_DATA_LEVEL, NormalizationRules, UnifyFunction } from '../types'
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
  TYPE_ARRAY,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { JsonPrimitiveValue, valueDefaults } from '../unifies/defaults'
import { jsonSchemaTypeInfer, jsonSchemaTypeInferWithRestriction } from '../unifies/type'
import { deepEqualsMatcher, ReplaceMapping, valueReplaces } from '../unifies/replaces'
import {
  OPEN_API_PROPERTY_ALLOW_EMPTY_VALUE,
  OPEN_API_PROPERTY_ALLOW_RESERVED,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_DEPRECATED,
  OPEN_API_PROPERTY_ENCODING,
  OPEN_API_PROPERTY_EXAMPLES,
  OPEN_API_PROPERTY_HEADERS,
  OPEN_API_PROPERTY_LINKS,
  OPEN_API_PROPERTY_PARAMETERS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_REQUEST_BODIES,
  OPEN_API_PROPERTY_REQUIRED,
  OPEN_API_PROPERTY_RESPONSES,
  OPEN_API_PROPERTY_SCHEMAS,
  OPEN_API_PROPERTY_SECURITY_SCHEMAS,
  OPEN_API_PROPERTY_TAGS,
} from './openapi.const'
import { pathItemsUnification } from '../unifies/openapi'
import {
  calculateHeaderName,
  calculateHeaderPlace,
  calculateParameterName,
  nonEmptyString
} from '../deprecated-item-description'
import { OPEN_API_DEPRECATION_RESOLVER } from './openapi.deprecated'

const OPEN_API_30_JSON_SCHEMA_NODE_TYPES = [
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
] satisfies JsonSchemaNodeType[]

const EMPTY_MARKER = Symbol('empty-items')
const TO_EMPTY_OBJECT_MAPPING: ReplaceMapping = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ({}),
    reverseMatcher: deepEqualsMatcher({}),
  }]])
}
const TO_EMPTY_ARRAY_MAPPING: ReplaceMapping = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ([]),
    reverseMatcher: deepEqualsMatcher([]),
  }]])
}

const OPEN_API_30_JSON_SCHEMA_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  ...JSON_SCHEMA_DEFAULTS[SPEC_TYPE_JSON_SCHEMA_04],
  [JSON_SCHEMA_PROPERTY_NULLABLE]: false,
  [JSON_SCHEMA_PROPERTY_READ_ONLY]: false,
  [JSON_SCHEMA_PROPERTY_WRITE_ONLY]: false,
  [JSON_SCHEMA_PROPERTY_DEPRECATED]: false,
  [JSON_SCHEMA_PROPERTY_ITEMS]: EMPTY_MARKER,
}
delete OPEN_API_30_JSON_SCHEMA_DEFAULTS[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]

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
}

delete OPEN_API_30_JSON_SCHEMA_REPLACES[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]

const OPEN_API_OPERATION_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_PARAMETERS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_TAGS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_DEPRECATED]: false,
}

const OPEN_API_OPERATION_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_PARAMETERS]: TO_EMPTY_ARRAY_MAPPING,
  [OPEN_API_PROPERTY_TAGS]: TO_EMPTY_ARRAY_MAPPING,
}

const OPEN_API_RESPONSE_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_HEADERS]: EMPTY_MARKER,
}

const OPEN_API_RESPONSE_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_HEADERS]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_ENCODING_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_HEADERS]: EMPTY_MARKER,
}

const OPEN_API_ENCODING_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_HEADERS]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_PARAMETER_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_DEPRECATED]: false,
  [OPEN_API_PROPERTY_REQUIRED]: false,
  [OPEN_API_PROPERTY_ALLOW_EMPTY_VALUE]: false,
  [OPEN_API_PROPERTY_ALLOW_RESERVED]: false,
  [OPEN_API_PROPERTY_EXAMPLES]: EMPTY_MARKER,
}

const OPEN_API_PARAMETER_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_EXAMPLES]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_HEADER_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  ...OPEN_API_PARAMETER_DEFAULTS,
}

const OPEN_API_HEADER_REPLACES: Record<string, ReplaceMapping> = {
  ...OPEN_API_PARAMETER_REPLACES,
}

const OPEN_API_MEDIA_TYPE_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_EXAMPLES]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_ENCODING]: EMPTY_MARKER,
}

const OPEN_API_MEDIA_TYPE_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_EXAMPLES]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_ENCODING]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_ROOT_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_PATHS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_COMPONENTS]: EMPTY_MARKER,
}

const OPEN_API_ROOT_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_PATHS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_COMPONENTS]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_COMPONENTS_DEFAULTS: Record<string, JsonPrimitiveValue> = {
  [OPEN_API_PROPERTY_SECURITY_SCHEMAS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_LINKS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_SCHEMAS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_RESPONSES]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_PARAMETERS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_REQUEST_BODIES]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_HEADERS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_EXAMPLES]: EMPTY_MARKER,
}

const OPEN_API_COMPONENTS_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_SECURITY_SCHEMAS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_LINKS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_SCHEMAS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_RESPONSES]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_PARAMETERS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_REQUEST_BODIES]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_HEADERS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_EXAMPLES]: TO_EMPTY_OBJECT_MAPPING,
}

const openApiExtensionRulesFunction: (elseRules: NormalizationRules) => NormalizationRules = (elseRules) => ({
  '/*': ({ key }) => (
    typeof key === 'string' && key.startsWith('x-')
      ? {
        validate: checkType(...TYPE_JSON_ANY),
        merge: resolvers.last,
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      } as NormalizationRules
      : elseRules
  ),
})

const openApiExtensionRules: NormalizationRules = openApiExtensionRulesFunction({ validate: () => false })

const openApiExternalDocsRules: NormalizationRules = {
  '/externalDocs': {
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.last,
    '/description': { validate: checkType(TYPE_STRING) },
    '/url': { validate: checkType(TYPE_STRING) },
  },
}

const openApiExampleRules: NormalizationRules = {
  '/example': {
    validate: checkType(...TYPE_JSON_ANY),
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

const openApiExamplesRules: NormalizationRules = {
  '/examples': {
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.last,
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

const openApiOAuthScopesRules: NormalizationRules = {
  '/*': { validate: checkType(TYPE_STRING) },
  validate: checkType(TYPE_OBJECT),
}

const openApiServerRules: NormalizationRules = {
  '/url': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/variables': {
    '/*': {
      '/enum': {
        '/*': { validate: checkType(TYPE_STRING) },
        validate: checkType(TYPE_ARRAY),
      },
      '/default': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      ...openApiExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
  },
  ...openApiExtensionRules,
  validate: checkType(TYPE_OBJECT),
}

const openApiServersRules: NormalizationRules = {
  '/servers': {
    '/*': openApiServerRules,
    validate: checkType(TYPE_ARRAY),
  },
}
const openApiSecurityRules: NormalizationRules = {
  '/security': {
    '/*': {
      ...openApiExtensionRulesFunction({
        '/*': {
          validate: checkType(TYPE_STRING),
        },
        validate: checkType(TYPE_ARRAY),
      }),
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
}

const openApiLinksRules: NormalizationRules = {
  '/*': {
    '/operationId': { validate: checkType(TYPE_STRING) },
    '/operationRef': { validate: checkType(TYPE_STRING) },
    '/parameters': {
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
      validate: checkType(TYPE_OBJECT),
    },
    '/requestBody': {
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
      validate: checkType(...TYPE_JSON_ANY),
    },
    '/description': { validate: checkType(TYPE_STRING) },
    '/server': openApiServerRules,
    ...openApiExtensionRules,
    validate: checkType(TYPE_OBJECT),
  },
  validate: checkType(TYPE_OBJECT),
}

const openApiJsonSchemaExtensionRules = (): NormalizationRules => ({
  '/xml': {
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.mergeObjects,
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
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
  ...openApiExtensionRules,
})

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
const customFor30JsonSchemaRules: NormalizationRules = customFor30JsonSchemaRulesFactory()

const customFor31JsonSchemaRulesFactory = (): NormalizationRules => ({
  ...jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07, () => customFor31JsonSchemaRules),
  ...openApiJsonSchemaExtensionRules(),
})
const customFor31JsonSchemaRules = customFor31JsonSchemaRulesFactory()

const openApiJsonSchemaRules = (version: OpenApiSpecVersion): NormalizationRules => {
  switch (version) {
    case SPEC_TYPE_OPEN_API_30:
      return customFor30JsonSchemaRules
    case SPEC_TYPE_OPEN_API_31:
      return customFor31JsonSchemaRules
  }
}

const openApiMediaTypesRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/*': {
    '/schema': openApiJsonSchemaRules(version),
    deprecation: {
      inlineDescriptionSuffixCalculator: ctx => `${ctx.suffix} (${ctx.key.toString()})`,
    },
    ...openApiExampleRules,
    ...openApiExamplesRules,
    '/encoding': {
      '/*': {
        deprecation: {
          inlineDescriptionSuffixCalculator: ctx => `in encoding '${ctx.key.toString()}' ${ctx.suffix}`,
        },
        '/contentType': { validate: checkType(TYPE_STRING) },
        '/headers': () => openApiHeadersRules(version),//break cycle
        '/style': { validate: checkType(TYPE_STRING) },
        '/explode': { validate: checkType(TYPE_BOOLEAN) },
        '/allowReserved': { validate: checkType(TYPE_BOOLEAN) },
        unify: [
          valueDefaults(OPEN_API_ENCODING_DEFAULTS),
          valueReplaces(OPEN_API_ENCODING_REPLACES),
        ],
        validate: checkType(TYPE_OBJECT),
        ...openApiExtensionRules,
      },
      validate: checkType(TYPE_OBJECT),
    },
    ...openApiExtensionRules,
    unify: [
      valueDefaults(OPEN_API_MEDIA_TYPE_DEFAULTS),
      valueReplaces(OPEN_API_MEDIA_TYPE_REPLACES),
    ],
    validate: checkType(TYPE_OBJECT),
  },
  validate: checkType(TYPE_OBJECT),
})

const openApiHeadersRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/*': {
    deprecation: {
      deprecationResolver: (ctx) => OPEN_API_DEPRECATION_RESOLVER(ctx),
      descriptionCalculator: ctx => `[Deprecated] header${nonEmptyString(calculateHeaderName(ctx.paths, ctx.key))}${nonEmptyString(calculateHeaderPlace(ctx.paths, ctx.suffix))}`,
      inlineDescriptionSuffixCalculator: (ctx) => `in header '${ctx.key.toString()}' ${ctx.suffix}`,
    },
    '/description': { validate: checkType(TYPE_STRING) },
    '/required': { validate: checkType(TYPE_BOOLEAN) },
    '/deprecated': { validate: checkType(TYPE_BOOLEAN) },
    '/allowEmptyValue': { validate: checkType(TYPE_BOOLEAN) },
    '/style': { validate: checkType(TYPE_STRING) },
    '/explode': { validate: checkType(TYPE_BOOLEAN) },
    '/allowReserved': { validate: checkType(TYPE_BOOLEAN) },
    '/content': openApiMediaTypesRules(version),
    ...openApiExampleRules,
    ...openApiExamplesRules,
    '/schema': openApiJsonSchemaRules(version),
    ...openApiExtensionRules,
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(OPEN_API_HEADER_DEFAULTS),
      valueReplaces(OPEN_API_HEADER_REPLACES),
    ],
  },
  deprecation: {
    inlineDescriptionSuffixCalculator: ctx => `${ctx.suffix}`,
  },
  validate: checkType(TYPE_OBJECT),
})

const openApiParametersRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/*': {
    deprecation: {
      inlineDescriptionSuffixCalculator: ctx => `in ${ctx.source.in} parameter '${ctx.source.name}'`,
      deprecationResolver: (ctx) => OPEN_API_DEPRECATION_RESOLVER(ctx),
      descriptionCalculator: ctx => `[Deprecated] ${ctx.source.in} parameter ${calculateParameterName(ctx)}`,
    },
    '/name': {
      validate: checkType(TYPE_STRING),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/in': {
      validate: checkType(TYPE_STRING),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/description': { validate: checkType(TYPE_STRING) },
    '/required': {
      validate: checkType(TYPE_BOOLEAN),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/deprecated': {
      validate: checkType(TYPE_BOOLEAN),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/allowEmptyValue': {
      validate: checkType(TYPE_BOOLEAN),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/style': {
      validate: checkType(TYPE_STRING),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/explode': {
      validate: checkType(TYPE_BOOLEAN),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/allowReserved': {
      validate: checkType(TYPE_BOOLEAN),
      hashStrategy: CURRENT_DATA_LEVEL,
    },
    '/content': openApiMediaTypesRules(version),
    ...openApiExampleRules,
    ...openApiExamplesRules,
    '/schema': () => ({
      ...customFor30JsonSchemaRules,
      newDataLayer: true,
    }),
    ...openApiExtensionRules,
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(OPEN_API_PARAMETER_DEFAULTS),
      valueReplaces(OPEN_API_PARAMETER_REPLACES),
    ],
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    hashOwner: true,
  },
  validate: checkType(TYPE_ARRAY),
})

const openApiRequestRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/description': { validate: checkType(TYPE_STRING) },
  '/required': { validate: checkType(TYPE_BOOLEAN) },
  '/content': openApiMediaTypesRules(version),
  ...openApiExtensionRules,
  validate: checkType(TYPE_OBJECT),
  deprecation: {
    inlineDescriptionSuffixCalculator: () => 'in request body',
  },
})

const openApiResponsesRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/*': {
    '/description': { validate: checkType(TYPE_STRING) },
    '/headers': openApiHeadersRules(version),
    '/content': openApiMediaTypesRules(version),
    '/links': openApiLinksRules,
    ...openApiExtensionRules,
    unify: [
      valueDefaults(OPEN_API_RESPONSE_DEFAULTS),
      valueReplaces(OPEN_API_RESPONSE_REPLACES),
    ],
    validate: checkType(TYPE_OBJECT),
    deprecation: {
      inlineDescriptionSuffixCalculator: ctx => `${ctx.suffix} '${ctx.key.toString()}'`,
    },
  },
  deprecation: { inlineDescriptionSuffixCalculator: () => 'in response' },
  validate: checkType(TYPE_OBJECT),
})

//TODO no 3.1 specific. Add it when need
export const openApiRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/openapi': { validate: checkType(TYPE_STRING) },
  '/info': {
    '/title': { validate: checkType(TYPE_STRING) },
    '/description': { validate: checkType(TYPE_STRING) },
    '/termsOfService': { validate: checkType(TYPE_STRING) },
    '/contact': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/url': { validate: checkType(TYPE_STRING) },
      '/email': { validate: checkType(TYPE_STRING) },
      ...openApiExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/license': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/url': { validate: checkType(TYPE_STRING) },
      ...openApiExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/version': { validate: checkType(TYPE_STRING) },
    ...openApiExtensionRules,
    validate: checkType(TYPE_OBJECT),
  },
  ...openApiExternalDocsRules,
  ...openApiServersRules,
  ...openApiSecurityRules,
  '/tags': {
    '/*': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      ...openApiExternalDocsRules,
      ...openApiExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/paths': {
    '/*': {
      deprecation: { inlineDescriptionSuffixCalculator: ctx => `${ctx.key.toString()}` },
      '/summary': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      '/servers': {
        '/*': openApiServerRules,
        validate: checkType(TYPE_ARRAY),
      },
      '/*': {
        deprecation: {
          deprecationResolver: (ctx) => OPEN_API_DEPRECATION_RESOLVER(ctx),
          descriptionCalculator: ctx => `[Deprecated] operation ${ctx.key.toString().toUpperCase()} ${ctx.suffix}`
        },
        '/tags': {
          '/*': { validate: checkType(TYPE_STRING) },
          validate: checkType(TYPE_ARRAY),
        },
        '/summary': { validate: checkType(TYPE_STRING) },
        '/description': { validate: checkType(TYPE_STRING) },
        ...openApiExternalDocsRules,
        '/operationId': { validate: checkType(TYPE_STRING) },
        // '/callbacks': not supported
        '/deprecated': { validate: checkType(TYPE_BOOLEAN) },
        ...openApiSecurityRules,
        ...openApiServersRules,
        '/parameters': openApiParametersRules(version),
        '/requestBody': openApiRequestRules(version),
        '/responses': openApiResponsesRules(version),
        ...openApiExtensionRules,
        unify: [
          valueDefaults(OPEN_API_OPERATION_DEFAULTS),
          valueReplaces(OPEN_API_OPERATION_REPLACES),
        ],
        validate: checkType(TYPE_OBJECT),
      },
      '/parameters': openApiParametersRules(version),
      validate: checkType(TYPE_OBJECT),
      unify: pathItemsUnification,
    },
    validate: checkType(TYPE_OBJECT),
  },
  '/components': {
    '/securitySchemes': {
      '/*': {
        '/type': { validate: checkType(TYPE_STRING) },
        '/name': { validate: checkType(TYPE_STRING) },
        '/in': { validate: checkType(TYPE_STRING) },
        '/description': { validate: checkType(TYPE_STRING) },
        '/scheme': { validate: checkType(TYPE_STRING) },
        '/bearerFormat': { validate: checkType(TYPE_STRING) },
        '/flows': {
          '/implicit': {
            '/authorizationUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          '/password': {
            '/tokenUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          '/clientCredentials': {
            '/tokenUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          '/authorizationCode': {
            '/authorizationUrl': { validate: checkType(TYPE_STRING) },
            '/tokenUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          ...openApiExtensionRules,
          validate: checkType(TYPE_OBJECT),
        },
        '/openIdConnectUrl': { validate: checkType(TYPE_STRING) },
        validate: checkType(TYPE_OBJECT),
        ...openApiExtensionRules,
      },
      validate: checkType(TYPE_OBJECT),
    },
    '/links': openApiLinksRules,
    '/schemas': {
      '/*': openApiJsonSchemaRules(version),
      validate: checkType(TYPE_OBJECT),
    },
    '/responses': openApiResponsesRules(version),
    '/parameters': {
      ...openApiParametersRules(version),
      validate: checkType(TYPE_OBJECT),
    },
    '/requestBodies': {
      '/*': openApiRequestRules(version),
      validate: checkType(TYPE_OBJECT),
    },
    '/headers': openApiHeadersRules(version),
    // '/callbacks': not supported
    ...openApiExamplesRules,
    ...openApiExtensionRules,
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(OPEN_API_COMPONENTS_DEFAULTS),
      valueReplaces(OPEN_API_COMPONENTS_REPLACES),
    ],
  },
  unify: [
    valueDefaults(OPEN_API_ROOT_DEFAULTS),
    valueReplaces(OPEN_API_ROOT_REPLACES),
  ],
})
