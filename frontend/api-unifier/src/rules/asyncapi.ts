import {
  BEFORE_SECOND_DATA_LEVEL,
  CURRENT_DATA_LEVEL,
  NormalizationRules,
} from '../types'
import { CrawlPrefixRules } from '@netcracker/qubership-apihub-json-crawl'
import { SPEC_TYPE_JSON_SCHEMA_07 } from '../spec-type'
import * as resolvers from '../resolvers'
import {
  checkContains,
  checkType,
  TYPE_ARRAY,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { DefaultValueMapping, valueDefaults } from '../unifies/defaults'
import { deepEqualsMatcher, ReplaceMapping, valueReplaces } from '../unifies/replaces'
import { jsonSchemaRules } from './jsonschema'
import {
  ASYNCAPI_ACTION_RECEIVE,
  ASYNCAPI_ACTION_SEND,
  ASYNCAPI_PROPERTY_ACTION,
  ASYNCAPI_PROPERTY_ADDRESS,
  ASYNCAPI_PROPERTY_ASYNCAPI,
  ASYNCAPI_PROPERTY_BINDINGS,
  ASYNCAPI_PROPERTY_CHANNEL,
  ASYNCAPI_PROPERTY_CHANNELS,
  ASYNCAPI_PROPERTY_COMPONENTS,
  ASYNCAPI_PROPERTY_CONTACT,
  ASYNCAPI_PROPERTY_CONTENT_TYPE,
  ASYNCAPI_PROPERTY_CORRELATION_ID,
  ASYNCAPI_PROPERTY_CORRELATION_IDS,
  ASYNCAPI_PROPERTY_DEFAULT,
  ASYNCAPI_PROPERTY_DEPRECATED,
  ASYNCAPI_PROPERTY_DESCRIPTION,
  ASYNCAPI_PROPERTY_ENUM,
  ASYNCAPI_PROPERTY_EXAMPLE,
  ASYNCAPI_PROPERTY_EXAMPLES,
  ASYNCAPI_PROPERTY_HEADERS,
  ASYNCAPI_PROPERTY_HOST,
  ASYNCAPI_PROPERTY_INFO,
  ASYNCAPI_PROPERTY_LICENSE,
  ASYNCAPI_PROPERTY_MESSAGE_TRAITS,
  ASYNCAPI_PROPERTY_MESSAGES,
  ASYNCAPI_PROPERTY_NAME,
  ASYNCAPI_PROPERTY_OPERATION_TRAITS,
  ASYNCAPI_PROPERTY_OPERATIONS,
  ASYNCAPI_PROPERTY_PARAMETERS,
  ASYNCAPI_PROPERTY_PATHNAME,
  ASYNCAPI_PROPERTY_PAYLOAD,
  ASYNCAPI_PROPERTY_PROTOCOL,
  ASYNCAPI_PROPERTY_REPLIES,
  ASYNCAPI_PROPERTY_REPLY,
  ASYNCAPI_PROPERTY_REPLY_ADDRESSES,
  ASYNCAPI_PROPERTY_SCHEMAS,
  ASYNCAPI_PROPERTY_SECURITY,
  ASYNCAPI_PROPERTY_SECURITY_SCHEMES,
  ASYNCAPI_PROPERTY_SERVERS,
  ASYNCAPI_PROPERTY_SUMMARY,
  ASYNCAPI_PROPERTY_TAGS,
  ASYNCAPI_PROPERTY_TITLE,
  ASYNCAPI_PROPERTY_TRAITS,
  ASYNCAPI_PROPERTY_VARIABLES,
  ASYNCAPI_PROPERTY_VERSION,
} from './asyncapi.const'
import { ASYNCAPI_DEPRECATION_RESOLVER } from './asyncapi.deprecated'
import { notAllowedReferenceHandler, referenceObjectResolver } from '../references/ref-resolver'

const EMPTY_MARKER = Symbol('empty-items')
const TO_EMPTY_OBJECT_MAPPING: ReplaceMapping = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ({}),
    reverseMatcher: deepEqualsMatcher({}),
  }]]),
}
const TO_EMPTY_ARRAY_MAPPING: ReplaceMapping = {
  mapping: new Map([[EMPTY_MARKER, {
    value: () => ([]),
    reverseMatcher: deepEqualsMatcher([]),
  }]]),
}

// Specification Extension Rules (x- prefixed properties)
const _asyncApiSpecificationExtensionPrefixRules: CrawlPrefixRules<any> = {
  'x-': {
    isExtension: true,
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.last,  //TODO: need check of merge resolver required for extensions of JSON schema
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

const asyncApiSpecificationExtensionRules: NormalizationRules = {
  '/^': _asyncApiSpecificationExtensionPrefixRules,
}

const externalDocumentationRules: NormalizationRules = {
  validate: checkType(TYPE_OBJECT),
  merge: resolvers.last,
  '/description': { validate: checkType(TYPE_STRING) },
  '/url': { validate: checkType(TYPE_STRING) },
  ...asyncApiSpecificationExtensionRules,
}

// Server Variable Rules
const asyncApiServerVariableRules: NormalizationRules = {
  '/enum': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
  },
  '/default': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/examples': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
  },
  ...asyncApiSpecificationExtensionRules,
  validate: checkType(TYPE_OBJECT),
}

// Server Rules
const asyncApiServerRules: NormalizationRules = {
  '/host': {
    validate: checkType(TYPE_STRING),
  },
  '/protocol': {
    validate: checkType(TYPE_STRING),
  },
  '/pathname': {
    validate: checkType(TYPE_STRING),
  },
  '/description': {
    validate: checkType(TYPE_STRING),
  },
  '/variables': {
    '/*': asyncApiServerVariableRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/security': {
    '/*': {
      '/*': { validate: checkType(TYPE_STRING) },
      validate: checkType(TYPE_ARRAY),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/tags': {
    '/*': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      '/externalDocs': externalDocumentationRules,
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/bindings': {
    validate: checkType(TYPE_OBJECT),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/externalDocs': externalDocumentationRules,
  ...asyncApiSpecificationExtensionRules,
  validate: checkType(TYPE_OBJECT),
}

// Message Rules
const asyncApiMessageRules: NormalizationRules = {
  '/payload': () => ({
    ...jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
    newDataLayer: true,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  }),
  '/headers': () => ({
    ...jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
    newDataLayer: true,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  }),
  '/correlationId': {
    validate: checkType(TYPE_OBJECT),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/contentType': {
    validate: checkType(TYPE_STRING),
  },
  '/name': {
    validate: checkType(TYPE_STRING),
  },
  '/title': {
    validate: checkType(TYPE_STRING),
  },
  '/summary': {
    validate: checkType(TYPE_STRING),
  },
  '/description': {
    validate: checkType(TYPE_STRING),
  },
  '/tags': {
    '/*': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      '/externalDocs': externalDocumentationRules,
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/bindings': {
    validate: checkType(TYPE_OBJECT),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/examples': {
    '/*': {
      '/headers': {
        validate: checkType(TYPE_OBJECT),
        '/*': { validate: checkType(...TYPE_JSON_ANY) },
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      },
      '/payload': {
        validate: checkType(...TYPE_JSON_ANY),
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      },
      '/name': { validate: checkType(TYPE_STRING) },
      '/summary': { validate: checkType(TYPE_STRING) },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/traits': {
    '/*': {
      validate: checkType(TYPE_OBJECT),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
  deprecation: {
    deprecationResolver: (ctx) => ASYNCAPI_DEPRECATION_RESOLVER(ctx),
    descriptionCalculator: ctx => `[Deprecated] message ${ctx.source.name || ctx.source.title || ''}`,
  },
  '/externalDocs': externalDocumentationRules,
  ...asyncApiSpecificationExtensionRules,
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
}

// Parameter Rules (for channels)
const asyncApiParameterRules: NormalizationRules = {
  '/enum': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
  },
  '/default': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/examples': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
  },
  '/location': { validate: checkType(TYPE_STRING) },
  ...asyncApiSpecificationExtensionRules,
  validate: checkType(TYPE_OBJECT),
}

// Channel Rules
const asyncApiChannelRules: NormalizationRules = {
  '/address': {
    validate: checkType(TYPE_STRING),
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/messages': {
    '/*': asyncApiMessageRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/parameters': {
    '/*': asyncApiParameterRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/servers': {
    '/*': {
      validate: checkType(TYPE_OBJECT),
      referenceHandler: referenceObjectResolver(),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/title': {
    validate: checkType(TYPE_STRING),
  },
  '/summary': {
    validate: checkType(TYPE_STRING),
  },
  '/description': {
    validate: checkType(TYPE_STRING),
  },
  '/bindings': {
    validate: checkType(TYPE_OBJECT),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/tags': {
    '/*': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      '/externalDocs': externalDocumentationRules,
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/externalDocs': externalDocumentationRules,
  ...asyncApiSpecificationExtensionRules,
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
}

// Operation Rules
const ASYNCAPI_OPERATION_DEFAULTS: DefaultValueMapping = {
  [ASYNCAPI_PROPERTY_TAGS]: EMPTY_MARKER,
}

const ASYNCAPI_OPERATION_REPLACES: Record<string, ReplaceMapping> = {
  [ASYNCAPI_PROPERTY_TAGS]: TO_EMPTY_ARRAY_MAPPING,
}

const asyncApiOperationRules: NormalizationRules = {
  '/action': {
    validate: [checkType(TYPE_STRING), checkContains(ASYNCAPI_ACTION_SEND, ASYNCAPI_ACTION_RECEIVE)],
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/channel': {
    validate: checkType(TYPE_OBJECT),
    referenceHandler: referenceObjectResolver(),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/title': {
    validate: checkType(TYPE_STRING),
  },
  '/summary': {
    validate: checkType(TYPE_STRING),
  },
  '/description': {
    validate: checkType(TYPE_STRING),
  },
  '/security': {
    '/*': {
      '/*': { validate: checkType(TYPE_STRING) },
      validate: checkType(TYPE_ARRAY),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/tags': {
    '/*': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      '/externalDocs': externalDocumentationRules,
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/bindings': {
    validate: checkType(TYPE_OBJECT),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/traits': {
    '/*': {
      validate: checkType(TYPE_OBJECT),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/messages': {
    '/*': {
      validate: checkType(TYPE_OBJECT),
      referenceHandler: referenceObjectResolver(),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/reply': {
    '/address': {
      validate: checkType(TYPE_OBJECT),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    '/channel': {
      validate: checkType(TYPE_OBJECT),
      referenceHandler: referenceObjectResolver(),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    '/messages': {
      '/*': {
        validate: checkType(TYPE_OBJECT),
        referenceHandler: referenceObjectResolver(),
        '/*': { validate: checkType(...TYPE_JSON_ANY) },
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      },
      validate: checkType(TYPE_ARRAY),
    },
    ...asyncApiSpecificationExtensionRules,
    validate: checkType(TYPE_OBJECT),
  },
  deprecation: {
    deprecationResolver: (ctx) => ASYNCAPI_DEPRECATION_RESOLVER(ctx),
    descriptionCalculator: ctx => `[Deprecated] operation ${ctx.key.toString()}`,
  },
  '/externalDocs': externalDocumentationRules,
  ...asyncApiSpecificationExtensionRules,
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_OPERATION_DEFAULTS),
    valueReplaces(ASYNCAPI_OPERATION_REPLACES),
  ],
}

// Components Rules
const ASYNCAPI_COMPONENTS_DEFAULTS: DefaultValueMapping = {
  [ASYNCAPI_PROPERTY_SCHEMAS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_SERVERS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_CHANNELS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_OPERATIONS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_MESSAGES]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_SECURITY_SCHEMES]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_PARAMETERS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_CORRELATION_IDS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_REPLIES]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_REPLY_ADDRESSES]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_MESSAGE_TRAITS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_OPERATION_TRAITS]: EMPTY_MARKER,
}

const ASYNCAPI_COMPONENTS_REPLACES: Record<string, ReplaceMapping> = {
  [ASYNCAPI_PROPERTY_SCHEMAS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_SERVERS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_CHANNELS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_OPERATIONS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_MESSAGES]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_SECURITY_SCHEMES]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_PARAMETERS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_CORRELATION_IDS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_REPLIES]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_REPLY_ADDRESSES]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_MESSAGE_TRAITS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_OPERATION_TRAITS]: TO_EMPTY_OBJECT_MAPPING,
}

const asyncApiComponentsRules: NormalizationRules = {
  '/schemas': {
    '/*': () => jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
    validate: checkType(TYPE_OBJECT),
  },
  '/servers': {
    '/*': asyncApiServerRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/channels': {
    '/*': asyncApiChannelRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/operations': {
    '/*': asyncApiOperationRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/messages': {
    '/*': asyncApiMessageRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/securitySchemes': {
    '/*': {
      '/type': { validate: checkType(TYPE_STRING) },
      '/description': { validate: checkType(TYPE_STRING) },
      '/name': { validate: checkType(TYPE_STRING) },
      '/in': { validate: checkType(TYPE_STRING) },
      '/scheme': { validate: checkType(TYPE_STRING) },
      '/bearerFormat': { validate: checkType(TYPE_STRING) },
      '/flows': {
        validate: checkType(TYPE_OBJECT),
        '/*': { validate: checkType(...TYPE_JSON_ANY) },
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      },
      '/openIdConnectUrl': { validate: checkType(TYPE_STRING) },
      '/scopes': {
        '/*': { validate: checkType(TYPE_STRING) },
        validate: checkType(TYPE_ARRAY),
      },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
  },
  '/parameters': {
    '/*': asyncApiParameterRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/correlationIds': {
    '/*': {
      '/description': { validate: checkType(TYPE_STRING) },
      '/location': { validate: checkType(TYPE_STRING) },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
  },
  '/replies': {
    '/*': {
      '/address': {
        validate: checkType(TYPE_OBJECT),
        '/*': { validate: checkType(...TYPE_JSON_ANY) },
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      },
      '/channel': {
        validate: checkType(TYPE_OBJECT),
        referenceHandler: referenceObjectResolver(),
        '/*': { validate: checkType(...TYPE_JSON_ANY) },
        '/**': { validate: checkType(...TYPE_JSON_ANY) },
      },
      '/messages': {
        '/*': {
          validate: checkType(TYPE_OBJECT),
          referenceHandler: referenceObjectResolver(),
          '/*': { validate: checkType(...TYPE_JSON_ANY) },
          '/**': { validate: checkType(...TYPE_JSON_ANY) },
        },
        validate: checkType(TYPE_ARRAY),
      },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
  },
  '/replyAddresses': {
    '/*': {
      '/description': { validate: checkType(TYPE_STRING) },
      '/location': { validate: checkType(TYPE_STRING) },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    validate: checkType(TYPE_OBJECT),
  },
  '/externalDocs': {
    '/*': externalDocumentationRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/messageTraits': {
    '/*': {
      validate: checkType(TYPE_OBJECT),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_OBJECT),
  },
  '/operationTraits': {
    '/*': {
      validate: checkType(TYPE_OBJECT),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_OBJECT),
  },
  ...asyncApiSpecificationExtensionRules,
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_COMPONENTS_DEFAULTS),
    valueReplaces(ASYNCAPI_COMPONENTS_REPLACES),
  ],
  hashStrategy: CURRENT_DATA_LEVEL,
}

// Root AsyncAPI Document Rules
const ASYNCAPI_ROOT_DEFAULTS: DefaultValueMapping = {
  [ASYNCAPI_PROPERTY_SERVERS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_CHANNELS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_OPERATIONS]: EMPTY_MARKER,
  [ASYNCAPI_PROPERTY_COMPONENTS]: EMPTY_MARKER,
}

const ASYNCAPI_ROOT_REPLACES: Record<string, ReplaceMapping> = {
  [ASYNCAPI_PROPERTY_SERVERS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_CHANNELS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_OPERATIONS]: TO_EMPTY_OBJECT_MAPPING,
  [ASYNCAPI_PROPERTY_COMPONENTS]: TO_EMPTY_OBJECT_MAPPING,
}

export const asyncApiRules = (): NormalizationRules => ({
  '/asyncapi': {
    validate: checkType(TYPE_STRING),
  },
  '/id': {
    validate: checkType(TYPE_STRING),
  },
  '/info': {
    '/title': { validate: checkType(TYPE_STRING) },
    '/version': { validate: checkType(TYPE_STRING) },
    '/description': { validate: checkType(TYPE_STRING) },
    '/termsOfService': { validate: checkType(TYPE_STRING) },
    '/contact': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/url': { validate: checkType(TYPE_STRING) },
      '/email': { validate: checkType(TYPE_STRING) },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/license': {
      '/name': { validate: checkType(TYPE_STRING) },
      '/url': { validate: checkType(TYPE_STRING) },
      ...asyncApiSpecificationExtensionRules,
      validate: checkType(TYPE_OBJECT),
    },
    '/tags': {
      '/*': {
        '/name': { validate: checkType(TYPE_STRING) },
        '/description': { validate: checkType(TYPE_STRING) },
        '/externalDocs': externalDocumentationRules,
        ...asyncApiSpecificationExtensionRules,
        validate: checkType(TYPE_OBJECT),
      },
      validate: checkType(TYPE_ARRAY),
    },
    '/externalDocs': externalDocumentationRules,
    ...asyncApiSpecificationExtensionRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/servers': {
    '/*': asyncApiServerRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/defaultContentType': {
    validate: checkType(TYPE_STRING),
  },
  '/channels': {
    '/*': asyncApiChannelRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/operations': {
    '/*': asyncApiOperationRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/components': asyncApiComponentsRules,
  '/externalDocs': externalDocumentationRules,
  ...asyncApiSpecificationExtensionRules,
  '/**': { referenceHandler: notAllowedReferenceHandler },
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_ROOT_DEFAULTS),
    valueReplaces(ASYNCAPI_ROOT_REPLACES),
  ],
  hashStrategy: CURRENT_DATA_LEVEL,
})


