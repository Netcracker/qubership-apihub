import {
  BEFORE_SECOND_DATA_LEVEL,
  CURRENT_DATA_LEVEL,
  NormalizationRules,
  ReferenceHandler,
} from '../types'
import {
  OpenApiSpecVersion,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
} from '../spec-type'
import * as resolvers from '../resolvers'
import {
  checkType,
  TYPE_ARRAY,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { DefaultValueMapping, valueDefaults } from '../unifies/defaults'
import { EMPTY_MARKER, ReplaceMapping, TO_EMPTY_ARRAY_MAPPING, TO_EMPTY_OBJECT_MAPPING, valueReplaces } from '../unifies/replaces'
import {
  OPEN_API_PROPERTY_ALLOW_EMPTY_VALUE,
  OPEN_API_PROPERTY_ALLOW_RESERVED,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_DEPRECATED,
  OPEN_API_PROPERTY_DESCRIPTION,
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
  OPEN_API_PROPERTY_STYLE,
  OPEN_API_PROPERTY_SUMMARY,
  OPEN_API_PROPERTY_TAGS,
} from './openapi.const'

import { pathItemsUnification, deduplicateParameters } from '../unifies/openapi'
import {
  calculateHeaderName,
  calculateHeaderPlace,
  calculateParameterName,
  nonEmptyString,
} from '../deprecated-item-description'
import { OPEN_API_DEPRECATION_RESOLVER } from './openapi.deprecated'

import {
  notAllowedReferenceHandler,
  referenceObjectResolver,
  ReferenceObjectRuleConfig,
} from '../references/ref-resolver'
import { openApiJsonSchemaRules } from './openapi.jsonschema'
import { openApiExternalDocsRules, openApiSpecificationExtensionRules } from './openapi.jsonschema.common'

const OPEN_API_OPERATION_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_PARAMETERS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_TAGS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_DEPRECATED]: false,
}

const OPEN_API_OPERATION_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_PARAMETERS]: TO_EMPTY_ARRAY_MAPPING,
  [OPEN_API_PROPERTY_TAGS]: TO_EMPTY_ARRAY_MAPPING,
}

const OPEN_API_RESPONSE_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_HEADERS]: EMPTY_MARKER,
}

const OPEN_API_RESPONSE_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_HEADERS]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_ENCODING_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_HEADERS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_ALLOW_RESERVED]: false,
}

const OPEN_API_ENCODING_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_HEADERS]: TO_EMPTY_OBJECT_MAPPING,
}

const getOperationParameterStyleDefault = (parameter: Record<string, unknown>): string | undefined => {
  const inValue = parameter.in

  switch (inValue) {
    case 'query':
    case 'cookie':
      return 'form'
    case 'path':
    case 'header':
      return 'simple'
  }
}

const OPEN_API_PARAMETER_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_DEPRECATED]: false,
  [OPEN_API_PROPERTY_REQUIRED]: false,
  [OPEN_API_PROPERTY_ALLOW_EMPTY_VALUE]: false,
  [OPEN_API_PROPERTY_ALLOW_RESERVED]: false,
  [OPEN_API_PROPERTY_EXAMPLES]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_STYLE]: getOperationParameterStyleDefault,
}

const OPEN_API_PARAMETER_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_EXAMPLES]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_HEADER_DEFAULTS: DefaultValueMapping = {
  ...OPEN_API_PARAMETER_DEFAULTS,
}

const OPEN_API_HEADER_REPLACES: Record<string, ReplaceMapping> = {
  ...OPEN_API_PARAMETER_REPLACES,
}

const OPEN_API_MEDIA_TYPE_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_EXAMPLES]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_ENCODING]: EMPTY_MARKER,
}

const OPEN_API_MEDIA_TYPE_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_EXAMPLES]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_ENCODING]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_REQUEST_BODY_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_REQUIRED]: false,
}

const OPEN_API_ROOT_DEFAULTS: DefaultValueMapping = {
  [OPEN_API_PROPERTY_PATHS]: EMPTY_MARKER,
  [OPEN_API_PROPERTY_COMPONENTS]: EMPTY_MARKER,
}

const OPEN_API_ROOT_REPLACES: Record<string, ReplaceMapping> = {
  [OPEN_API_PROPERTY_PATHS]: TO_EMPTY_OBJECT_MAPPING,
  [OPEN_API_PROPERTY_COMPONENTS]: TO_EMPTY_OBJECT_MAPPING,
}

const OPEN_API_COMPONENTS_DEFAULTS: DefaultValueMapping = {
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



export function referenceObjectRuleFunction({
  version,
  allowedOverrides,
}: ReferenceObjectRuleConfig): ReferenceHandler {
  switch (version) {
    case SPEC_TYPE_OPEN_API_31:
      return referenceObjectResolver(allowedOverrides)
    case SPEC_TYPE_OPEN_API_30:
      return referenceObjectResolver()
    default:
      return notAllowedReferenceHandler
  }
}

const openApiExampleRules: NormalizationRules = {
  '/example': {
    validate: checkType(...TYPE_JSON_ANY),
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

const openApiExamplesRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/examples': {
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.last,
    '/*': {
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      referenceHandler: referenceObjectRuleFunction({
        version,
        allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION, OPEN_API_PROPERTY_SUMMARY],
      }),
      ...openApiSpecificationExtensionRules,
    },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
})

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
      ...openApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
  },
  ...openApiSpecificationExtensionRules,
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
      '/*': {
        '/*': {
          validate: checkType(TYPE_STRING),
        },
        validate: checkType(TYPE_ARRAY),
      },
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
}

const openApiLinksRules = (version: OpenApiSpecVersion): NormalizationRules => ({
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
    ...openApiSpecificationExtensionRules,
    validate: checkType(TYPE_OBJECT),
    referenceHandler: referenceObjectRuleFunction({ version, allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION] }),
  },
  validate: checkType(TYPE_OBJECT),
})

const openApiMediaTypesRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/*': {
    '/schema': openApiJsonSchemaRules(version),
    deprecation: {
      inlineDescriptionSuffixCalculator: ctx => `${ctx.suffix} (${ctx.key.toString()})`,
    },
    ...openApiExampleRules,
    ...openApiExamplesRules(version),
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
        ...openApiSpecificationExtensionRules,
      },
      validate: checkType(TYPE_OBJECT),
    },
    ...openApiSpecificationExtensionRules,
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
    ...openApiExamplesRules(version),
    '/schema': openApiJsonSchemaRules(version),
    ...openApiSpecificationExtensionRules,
    referenceHandler: referenceObjectRuleFunction({ version, allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION] }),
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
    ...openApiExamplesRules(version),
    '/schema': () => ({
      ...openApiJsonSchemaRules(version),
      newDataLayer: true,
    }),
    ...openApiSpecificationExtensionRules,
    referenceHandler: referenceObjectRuleFunction({ version, allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION] }),
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(OPEN_API_PARAMETER_DEFAULTS),
      valueReplaces(OPEN_API_PARAMETER_REPLACES),
    ],
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
    hashOwner: true,
  },
  validate: checkType(TYPE_ARRAY),
  unify: deduplicateParameters,
})

const openApiRequestRules = (version: OpenApiSpecVersion): NormalizationRules => ({
  '/description': { validate: checkType(TYPE_STRING) },
  '/required': { validate: checkType(TYPE_BOOLEAN) },
  '/content': openApiMediaTypesRules(version),
  ...openApiSpecificationExtensionRules,
  referenceHandler: referenceObjectRuleFunction({ version, allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION] }),
  unify: [
    valueDefaults(OPEN_API_REQUEST_BODY_DEFAULTS),
  ],
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
    '/links': openApiLinksRules(version),
    ...openApiSpecificationExtensionRules,
    unify: [
      valueDefaults(OPEN_API_RESPONSE_DEFAULTS),
      valueReplaces(OPEN_API_RESPONSE_REPLACES),
    ],
    referenceHandler: referenceObjectRuleFunction({ version, allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION] }),
    validate: checkType(TYPE_OBJECT),
    deprecation: {
      inlineDescriptionSuffixCalculator: ctx => `${ctx.suffix} '${ctx.key.toString()}'`,
    },
  },
  ...openApiSpecificationExtensionRules,
  deprecation: { inlineDescriptionSuffixCalculator: () => 'in response' },
  validate: checkType(TYPE_OBJECT),
})

const openApiPathItemRules = (version: OpenApiSpecVersion): NormalizationRules => ({
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
      descriptionCalculator: ctx => `[Deprecated] operation ${ctx.key.toString().toUpperCase()} ${ctx.suffix}`,
    },
    '/tags': {
      '/*': { validate: checkType(TYPE_STRING) },
      validate: checkType(TYPE_ARRAY),
    },
    '/summary': { validate: checkType(TYPE_STRING) },
    '/description': { validate: checkType(TYPE_STRING) },
    ...openApiExternalDocsRules,
    '/operationId': { validate: checkType(TYPE_STRING) },
    '/callbacks': {
      '/*': {
        '/*': () => openApiPathItemRules(version),
        ...openApiSpecificationExtensionRules,
      },
    },
    '/deprecated': { validate: checkType(TYPE_BOOLEAN) },
    ...openApiSecurityRules,
    ...openApiServersRules,
    '/parameters': openApiParametersRules(version),
    '/requestBody': openApiRequestRules(version),
    '/responses': openApiResponsesRules(version),
    ...openApiSpecificationExtensionRules,
    unify: [
      valueDefaults(OPEN_API_OPERATION_DEFAULTS),
      valueReplaces(OPEN_API_OPERATION_REPLACES),
    ],
    validate: checkType(TYPE_OBJECT),
  },
  ...openApiSpecificationExtensionRules,
  '/parameters': openApiParametersRules(version),
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
  unify: pathItemsUnification,
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
      ...openApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/license': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/url': { validate: checkType(TYPE_STRING) },
      ...openApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/version': { validate: checkType(TYPE_STRING) },
    ...openApiSpecificationExtensionRules,
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
      ...openApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/paths': {
    '/*': openApiPathItemRules(version),
    ...openApiSpecificationExtensionRules,
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
            ...openApiSpecificationExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          '/password': {
            '/tokenUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiSpecificationExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          '/clientCredentials': {
            '/tokenUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiSpecificationExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          '/authorizationCode': {
            '/authorizationUrl': { validate: checkType(TYPE_STRING) },
            '/tokenUrl': { validate: checkType(TYPE_STRING) },
            '/refreshUrl': { validate: checkType(TYPE_STRING) },
            '/scopes': openApiOAuthScopesRules,
            ...openApiSpecificationExtensionRules,
            validate: checkType(TYPE_OBJECT),
          },
          ...openApiSpecificationExtensionRules,
          validate: checkType(TYPE_OBJECT),
        },
        '/openIdConnectUrl': { validate: checkType(TYPE_STRING) },
        validate: checkType(TYPE_OBJECT),
        referenceHandler: referenceObjectRuleFunction({ version, allowedOverrides: [OPEN_API_PROPERTY_DESCRIPTION] }),
        ...openApiSpecificationExtensionRules,
      },
      validate: checkType(TYPE_OBJECT),
    },
    '/links': openApiLinksRules(version),
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
    '/callbacks': {
      '/*': {
        '/*': () => openApiPathItemRules(version),
        ...openApiSpecificationExtensionRules,
      },
    },
    /**
     * Note: For OAS 3.0, `components.pathItems` is not a valid property.
     * We intentionally keep these rules and do not delete this path here
     * because invalid `components.pathItems` entries are pre-processed and
     * handled during pre-validation step.
     * Additionally, the reference resolver contains checks that guard against
     * misuse in OAS 3.0. See: validate.ts
     */
    '/pathItems': ({
      '/*': openApiPathItemRules(version),
      validate: checkType(TYPE_OBJECT),
    }),
    ...openApiExamplesRules(version),
    ...openApiSpecificationExtensionRules,
    validate: checkType(TYPE_OBJECT),
    unify: [
      valueDefaults(OPEN_API_COMPONENTS_DEFAULTS),
      valueReplaces(OPEN_API_COMPONENTS_REPLACES),
    ],
  },
  ...openApiSpecificationExtensionRules,
  '/**': { referenceHandler: notAllowedReferenceHandler },
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(OPEN_API_ROOT_DEFAULTS),
    valueReplaces(OPEN_API_ROOT_REPLACES),
  ],
})
