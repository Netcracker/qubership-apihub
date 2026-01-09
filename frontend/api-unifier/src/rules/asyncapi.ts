import {
  CURRENT_DATA_LEVEL,
  NormalizationRules,
} from '../types'
import {
  checkContains,
  checkType,
  TYPE_ARRAY,
  TYPE_JSON_ANY,
  TYPE_NULL,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { valueDefaults } from '../unifies/defaults'
import { valueReplaces } from '../unifies/replaces'
import { unifyEnum } from '../unifies/enums'
import {
  ASYNCAPI_ACTION_RECEIVE,
  ASYNCAPI_ACTION_SEND,
  ASYNCAPI_SECURITY_SCHEME_TYPES,
} from './asyncapi.const'
import { schemaOrMultiFormatSchemaRules } from './asyncapi.jsonschema'
import {
  externalDocumentationRules,
  specificationExtensionsRules,
} from './asyncapi.jsonschema.common'
import {
  ASYNCAPI_TAG_DEFAULTS,
  ASYNCAPI_TAG_REPLACES,
  ASYNCAPI_SECURITY_SCHEME_DEFAULTS,
  ASYNCAPI_SECURITY_SCHEME_REPLACES,
  ASYNCAPI_SERVER_VARIABLE_DEFAULTS,
  ASYNCAPI_SERVER_VARIABLE_REPLACES,
  ASYNCAPI_SERVER_DEFAULTS,
  ASYNCAPI_SERVER_REPLACES,
  ASYNCAPI_MESSAGE_EXAMPLE_DEFAULTS,
  ASYNCAPI_MESSAGE_EXAMPLE_REPLACES,
  ASYNCAPI_MESSAGE_TRAIT_DEFAULTS,
  ASYNCAPI_MESSAGE_TRAIT_REPLACES,
  ASYNCAPI_MESSAGE_DEFAULTS,
  ASYNCAPI_MESSAGE_REPLACES,
  ASYNCAPI_PARAMETER_DEFAULTS,
  ASYNCAPI_PARAMETER_REPLACES,
  ASYNCAPI_CHANNEL_DEFAULTS,
  ASYNCAPI_CHANNEL_REPLACES,
  ASYNCAPI_OPERATION_REPLY_DEFAULTS,
  ASYNCAPI_OPERATION_REPLY_REPLACES,
  ASYNCAPI_OPERATION_TRAIT_DEFAULTS,
  ASYNCAPI_OPERATION_TRAIT_REPLACES,
  ASYNCAPI_OPERATION_DEFAULTS,
  ASYNCAPI_OPERATION_REPLACES,
  ASYNCAPI_COMPONENTS_DEFAULTS,
  ASYNCAPI_COMPONENTS_REPLACES,
  ASYNCAPI_INFO_DEFAULTS,
  ASYNCAPI_INFO_REPLACES,
  ASYNCAPI_ROOT_DEFAULTS,
  ASYNCAPI_ROOT_REPLACES,
  contentTypeDefault
} from './asyncapi.defaults'
import { ASYNCAPI_DEPRECATION_RESOLVER } from './asyncapi.deprecated'
import { notAllowedReferenceHandler, referenceObjectResolver } from '../references/ref-resolver'

const tagRules: NormalizationRules = {
  '/name': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/externalDocs': externalDocumentationRules,
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_TAG_DEFAULTS),
    valueReplaces(ASYNCAPI_TAG_REPLACES),
  ],
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
  unify: [
    valueDefaults(ASYNCAPI_SECURITY_SCHEME_DEFAULTS),
    valueReplaces(ASYNCAPI_SECURITY_SCHEME_REPLACES),
  ],
}

const serverVariableRules: NormalizationRules = {
  '/enum': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
    unify: unifyEnum,
  },
  '/default': { validate: checkType(TYPE_STRING) },
  '/description': { validate: checkType(TYPE_STRING) },
  '/examples': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
  },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
  unify: [
    valueDefaults(ASYNCAPI_SERVER_VARIABLE_DEFAULTS),
    valueReplaces(ASYNCAPI_SERVER_VARIABLE_REPLACES),
  ],
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
  unify: [
    valueDefaults(ASYNCAPI_SERVER_DEFAULTS),
    valueReplaces(ASYNCAPI_SERVER_REPLACES),
  ],
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
  unify: [
    valueDefaults(ASYNCAPI_MESSAGE_EXAMPLE_DEFAULTS),
    valueReplaces(ASYNCAPI_MESSAGE_EXAMPLE_REPLACES),
  ],
}

const messageTraitRules: NormalizationRules = {
  '/headers': schemaOrMultiFormatSchemaRules,
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
  unify: [
    valueDefaults(ASYNCAPI_MESSAGE_TRAIT_DEFAULTS),
    valueReplaces(ASYNCAPI_MESSAGE_TRAIT_REPLACES),
    contentTypeDefault,
  ],
}

const messageRules: NormalizationRules = {
  ...messageTraitRules,
  '/payload': schemaOrMultiFormatSchemaRules,
  '/traits': {
    '/*': messageTraitRules,
    validate: checkType(TYPE_ARRAY),
  },
  unify: [
    valueDefaults(ASYNCAPI_MESSAGE_DEFAULTS),
    valueReplaces(ASYNCAPI_MESSAGE_REPLACES),
    contentTypeDefault,
  ],
}

const parameterRules: NormalizationRules = {
  '/enum': {
    '/*': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_ARRAY),
    unify: unifyEnum,
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
  unify: [
    valueDefaults(ASYNCAPI_PARAMETER_DEFAULTS),
    valueReplaces(ASYNCAPI_PARAMETER_REPLACES),
  ],
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
  unify: [
    valueDefaults(ASYNCAPI_CHANNEL_DEFAULTS),
    valueReplaces(ASYNCAPI_CHANNEL_REPLACES),
  ],
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
  unify: [
    valueDefaults(ASYNCAPI_OPERATION_REPLY_DEFAULTS),
    valueReplaces(ASYNCAPI_OPERATION_REPLY_REPLACES),
  ],
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
    valueDefaults(ASYNCAPI_OPERATION_TRAIT_DEFAULTS),
    valueReplaces(ASYNCAPI_OPERATION_TRAIT_REPLACES),
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
  unify: [
    valueDefaults(ASYNCAPI_OPERATION_DEFAULTS),
    valueReplaces(ASYNCAPI_OPERATION_REPLACES),
  ],
}


const componentsRules: NormalizationRules = {
  '/schemas': {
    '/*': schemaOrMultiFormatSchemaRules,
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
  unify: [
    valueDefaults(ASYNCAPI_INFO_DEFAULTS),
    valueReplaces(ASYNCAPI_INFO_REPLACES),
  ],
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
