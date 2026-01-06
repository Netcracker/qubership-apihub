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
  TYPE_NULL,
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
  ASYNCAPI_SECURITY_SCHEME_TYPES,
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

const _specificationExtensionPrefixRules: CrawlPrefixRules<any> = {
  'x-': {
    isExtension: true,
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.last,  //TODO: need check of merge resolver required for extensions of JSON schema
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

const specificationExtensionsRules: NormalizationRules = {
  '/^': _specificationExtensionPrefixRules,
}

const externalDocumentationRules: NormalizationRules = {
  '/description': { validate: checkType(TYPE_STRING) },
  '/url': { validate: checkType(TYPE_STRING) },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
  merge: resolvers.last,  //TODO: need check of merge resolver required for extensions of JSON schema
}

const tagRules: NormalizationRules = {
  '/name': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/externalDocs': externalDocumentationRules,
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const tagsRules: NormalizationRules = {
  '/*': tagRules,
  validate: checkType(TYPE_ARRAY),
}

const oAuthFlowCommonRules: NormalizationRules = {
  '/refreshUrl': { validate: checkType(TYPE_STRING) },
  '/availableScopes': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT)
}

const oAuthFlowsRules: NormalizationRules = {
  '/implicit': {
    '/authorizationUrl': { validate: checkType(TYPE_STRING) },
    ...oAuthFlowCommonRules,
  },
  '/password': {
    '/tokenUrl': { validate: checkType(TYPE_STRING) },
    ...oAuthFlowCommonRules,
  },
  '/clientCredentials': {
    '/tokenUrl': { validate: checkType(TYPE_STRING) },
    ...oAuthFlowCommonRules,
  },
  '/authorizationCode': {
    '/authorizationUrl': { validate: checkType(TYPE_STRING) },
    '/tokenUrl': { validate: checkType(TYPE_STRING) },
    ...oAuthFlowCommonRules,
  },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const securitySchemeRules: NormalizationRules = {
  '/type': {
    validate: [
      checkType(TYPE_STRING),
      checkContains(...ASYNCAPI_SECURITY_SCHEME_TYPES)]
  },
  '/description': { validate: checkType(TYPE_STRING) },
  '/name': { validate: checkType(TYPE_STRING) },
  '/in': { validate: checkType(TYPE_STRING) },
  '/scheme': { validate: checkType(TYPE_STRING) },
  '/bearerFormat': { validate: checkType(TYPE_STRING) },
  '/flows': oAuthFlowsRules,
  '/openIdConnectUrl': { validate: checkType(TYPE_STRING) },
  '/scopes': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
  },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const serverVariableRules: NormalizationRules = {
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
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const serverBindingsRules: NormalizationRules = {
  ...specificationExtensionsRules,
  '/*': { validate: checkType(...TYPE_JSON_ANY) },
  '/**': { validate: checkType(...TYPE_JSON_ANY) },
  validate: checkType(TYPE_OBJECT),
}

const serverRules: NormalizationRules = {
  '/host': { validate: checkType(TYPE_STRING) },
  '/protocol': { validate: checkType(TYPE_STRING) },
  '/protocolVersion': { validate: checkType(TYPE_STRING) },
  '/pathname': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/title': { validate: checkType(TYPE_STRING) },
  '/summary': { validate: checkType(TYPE_STRING) },
  '/variables': {
    '/*': serverVariableRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/security': {
    '/*': securitySchemeRules,
    validate: checkType(TYPE_ARRAY),
  },
  '/tags': tagsRules,
  '/externalDocs': externalDocumentationRules,
  '/bindings': serverBindingsRules,
  validate: checkType(TYPE_OBJECT),
}

const correlationIdRules: NormalizationRules = {
  '/description': { validate: checkType(TYPE_STRING) },
  '/location': { validate: checkType(TYPE_STRING) },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const messageBindingsRules: NormalizationRules = {
  ...specificationExtensionsRules,
  '/*': { validate: checkType(...TYPE_JSON_ANY) },
  '/**': { validate: checkType(...TYPE_JSON_ANY) },
  validate: checkType(TYPE_OBJECT),
}

const messageExampleRules: NormalizationRules = {
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
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const messageTraitRules: NormalizationRules = {
  '/headers': () => ({
    ...jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
    newDataLayer: true,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  }),
  '/correlationId': correlationIdRules,
  '/contentType': { validate: checkType(TYPE_STRING) },
  '/name': { validate: checkType(TYPE_STRING) },
  '/title': { validate: checkType(TYPE_STRING) },
  '/summary': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/tags': tagsRules,
  '/externalDocs': externalDocumentationRules,
  '/bindings': messageBindingsRules,
  '/examples': {
    '/*': messageExampleRules,
    validate: checkType(TYPE_ARRAY),
  },
  deprecation: {
    deprecationResolver: (ctx) => ASYNCAPI_DEPRECATION_RESOLVER(ctx),
    descriptionCalculator: ctx => `[Deprecated] message ${ctx.source.name || ctx.source.title || ''}`,
  },
  ...specificationExtensionsRules,
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
}

const messageRules: NormalizationRules = {
  ...messageTraitRules,
  '/payload': () => ({
    ...jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
    newDataLayer: true,
    hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  }),
  '/traits': {
    '/*': messageTraitRules,
    validate: checkType(TYPE_ARRAY),
  },
}

const parameterRules: NormalizationRules = {
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
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const channelBindingsRules: NormalizationRules = {
  ...specificationExtensionsRules,
  '/*': { validate: checkType(...TYPE_JSON_ANY) },
  '/**': { validate: checkType(...TYPE_JSON_ANY) },
  validate: checkType(TYPE_OBJECT),
}

const channelRules: NormalizationRules = {
  '/address': {
    validate: checkType(TYPE_STRING, TYPE_NULL),
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/messages': {
    '/*': messageRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/title': { validate: checkType(TYPE_STRING) },
  '/summary': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/servers': { //TODO: think how to enforce [Reference Object] here as per specification
    '/*': {
      validate: checkType(TYPE_OBJECT),
      referenceHandler: referenceObjectResolver(),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
  '/parameters': {
    '/*': parameterRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/tags': tagsRules,
  '/externalDocs': externalDocumentationRules,
  '/bindings': channelBindingsRules,
  ...specificationExtensionsRules,
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
}

const ASYNCAPI_OPERATION_DEFAULTS: DefaultValueMapping = {
  [ASYNCAPI_PROPERTY_TAGS]: EMPTY_MARKER,
}

const ASYNCAPI_OPERATION_REPLACES: Record<string, ReplaceMapping> = {
  [ASYNCAPI_PROPERTY_TAGS]: TO_EMPTY_ARRAY_MAPPING,
}

const operationReplyAddressRules: NormalizationRules = {
  '/description': { validate: checkType(TYPE_STRING) },
  '/location': { validate: checkType(TYPE_STRING) },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const operationReplyRules: NormalizationRules = {
  '/address': operationReplyAddressRules,
  '/channel': { //TODO: think how to enforce Reference Object here as per specification
    validate: checkType(TYPE_OBJECT),
    referenceHandler: referenceObjectResolver(),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/messages': {  //TODO: think how to enforce [Reference Object] here as per specification
    '/*': {
      validate: checkType(TYPE_OBJECT),
      referenceHandler: referenceObjectResolver(),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const operationBindingsRules: NormalizationRules = {
  ...specificationExtensionsRules,
  '/*': { validate: checkType(...TYPE_JSON_ANY) },
  '/**': { validate: checkType(...TYPE_JSON_ANY) },
  validate: checkType(TYPE_OBJECT),
}

const operationTraitRules: NormalizationRules = {
  '/title': { validate: checkType(TYPE_STRING) },
  '/summary': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/security': {
    '/*': securitySchemeRules,
    validate: checkType(TYPE_ARRAY),
  },
  '/tags': tagsRules,
  '/externalDocs': externalDocumentationRules,
  '/bindings': operationBindingsRules,
  '/reply': operationReplyRules, //TODO: the spec does not explicitly specify that operation trait includes reply object, but it is not listed in exceptions
  deprecation: {
    deprecationResolver: (ctx) => ASYNCAPI_DEPRECATION_RESOLVER(ctx),
    descriptionCalculator: ctx => `[Deprecated] operation ${ctx.key.toString()}`,
  },
  ...specificationExtensionsRules,
  referenceHandler: referenceObjectResolver(),
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_OPERATION_DEFAULTS),
    valueReplaces(ASYNCAPI_OPERATION_REPLACES),
  ],
}

const operationRules: NormalizationRules = {
  ...operationTraitRules,
  '/action': {
    validate: [checkType(TYPE_STRING), checkContains(ASYNCAPI_ACTION_SEND, ASYNCAPI_ACTION_RECEIVE)],
    hashStrategy: CURRENT_DATA_LEVEL,
  },
  '/channel': { //TODO: think how to enforce Reference Object here as per specification
    validate: checkType(TYPE_OBJECT),
    referenceHandler: referenceObjectResolver(),
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
  '/traits': {
    '/*': operationTraitRules,
    validate: checkType(TYPE_ARRAY),
  },
  '/messages': {
    '/*': { //TODO: think how to enforce [Reference Object] here as per specification
      validate: checkType(TYPE_OBJECT),
      referenceHandler: referenceObjectResolver(),
      '/*': { validate: checkType(...TYPE_JSON_ANY) },
      '/**': { validate: checkType(...TYPE_JSON_ANY) },
    },
    validate: checkType(TYPE_ARRAY),
  },
}

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

const componentsRules: NormalizationRules = {
  '/schemas': {
    '/*': () => jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07),
    validate: checkType(TYPE_OBJECT),
  },
  '/servers': {
    '/*': serverRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/channels': {
    '/*': channelRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/operations': {
    '/*': operationRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/messages': {
    '/*': messageRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/securitySchemes': {
    '/*': securitySchemeRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/serverVariables': {
    '/*': serverVariableRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/parameters': {
    '/*': parameterRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/correlationIds': {
    '/*': correlationIdRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/replies': {
    '/*': operationReplyRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/replyAddresses': {
    '/*': operationReplyAddressRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/externalDocs': {
    '/*': externalDocumentationRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/tags': {
    '/*': tagRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/operationTraits': {
    '/*': operationTraitRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/messageTraits': {
    '/*': messageTraitRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/serverBindings': {
    '/*': serverBindingsRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/channelBindings': {
    '/*': channelBindingsRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/operationBindings': {
    '/*': operationBindingsRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/messageBindings': {
    '/*': messageBindingsRules,
    validate: checkType(TYPE_OBJECT),
  },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_COMPONENTS_DEFAULTS),
    valueReplaces(ASYNCAPI_COMPONENTS_REPLACES),
  ],
  hashStrategy: CURRENT_DATA_LEVEL,
}

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

const contactRules: NormalizationRules = {
  '/name': { validate: checkType(TYPE_STRING) },
  '/url': { validate: checkType(TYPE_STRING) },
  '/email': { validate: checkType(TYPE_STRING) },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const licenseRules: NormalizationRules = {
  '/name': { validate: checkType(TYPE_STRING) },
  '/url': { validate: checkType(TYPE_STRING) },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

const infoRules: NormalizationRules = {
  '/title': { validate: checkType(TYPE_STRING) },
  '/version': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/termsOfService': { validate: checkType(TYPE_STRING) },
  '/contact': contactRules,
  '/license': licenseRules,
  '/tags': tagsRules,
  '/externalDocs': externalDocumentationRules,
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
}

export const asyncApiRules = (): NormalizationRules => ({
  '/asyncapi': { validate: checkType(TYPE_STRING) },
  '/id': { validate: checkType(TYPE_STRING) },
  '/info': infoRules,
  '/servers': {
    '/*': serverRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/defaultContentType': { validate: checkType(TYPE_STRING) },
  '/channels': {
    '/*': channelRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/operations': {
    '/*': operationRules,
    validate: checkType(TYPE_OBJECT),
  },
  '/components': componentsRules,
  ...specificationExtensionsRules,
  '/**': { referenceHandler: notAllowedReferenceHandler },
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_ROOT_DEFAULTS),
    valueReplaces(ASYNCAPI_ROOT_REPLACES),
  ],
  hashStrategy: CURRENT_DATA_LEVEL,
})
