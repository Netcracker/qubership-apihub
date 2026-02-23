import {
  addNonBreaking,
  allAnnotation,
  allBreaking,
  allDeprecated,
  allNonBreaking,
  allUnclassified,
  breaking,
  deepEqualsUniqueItemsArrayMappingResolver,
  nonBreaking,
  unclassified,
} from '../core'
import {
  CompareRules,
  START_NEW_COMPARE_SCOPE_RULE,
} from '../types'
import { AsyncApi3RulesOptions } from './asyncapi3.types'
import { asyncApiSchemaRules } from './asyncapi3.schema'
import { asyncApiSpecificationExtensionRulesFunction } from './asyncapi3.compare.rules'
import {
  COMPARE_SCOPE_COMPONENTS,
  COMPARE_SCOPE_RECEIVE,
  COMPARE_SCOPE_SEND,
  ASYNCAPI_ACTION_SEND,
} from './asyncapi3.const'
import { SPEC_TYPE_ASYNCAPI_3 } from '@netcracker/qubership-apihub-api-unifier'
import { externalDocumentationRules } from './asyncapi3.rules.common'
import { bindingsRules } from './asyncapi3.bindings'

/**
 * Keep consisten ordering for the rules
 * - Classify rule ($) for the node itself first
 * - Other rules for the node itself in the order they listed in specification
 * - Children: specific keys, then prefix rules, then '/*', then '/**' *
 */

export const asyncApi3Rules = (options: AsyncApi3RulesOptions): CompareRules => {
  const sendSchemaRules = asyncApiSchemaRules({ version: SPEC_TYPE_ASYNCAPI_3, send: true })
  const receiveSchemaRules = asyncApiSchemaRules({ version: SPEC_TYPE_ASYNCAPI_3, send: false })

  const tagRules: CompareRules = {
    $: allAnnotation,
    '/name': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/externalDocs': externalDocumentationRules,
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  const tagsRules: CompareRules = {
    $: allAnnotation,
    mapping: deepEqualsUniqueItemsArrayMappingResolver,
    '/*': tagRules,
  }

  const oAuthFlowRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const oAuthFlowsRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    ...asyncApiSpecificationExtensionRulesFunction(),
    '/*': oAuthFlowRules,
  }

  const securitySchemeRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    '/type': { $: [breaking, nonBreaking, breaking] },
    '/description': { $: allAnnotation },
    '/name': { $: [breaking, nonBreaking, breaking] },
    '/in': { $: [breaking, nonBreaking, breaking] },
    '/scheme': { $: [breaking, nonBreaking, breaking] },
    '/bearerFormat': { $: allAnnotation },
    '/flows': oAuthFlowsRules,
    '/openIdConnectUrl': { $: allAnnotation },
    '/scopes': {
      $: [nonBreaking, breaking, breaking],
      '/*': { $: [nonBreaking, breaking, breaking] },
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const serverVariableRules: CompareRules = {
    $: allAnnotation,
    '/enum': {
      $: allAnnotation,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': { $: allAnnotation, ignoreKeyDifference: true },
    },
    '/default': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Server rules
  const serverRules: CompareRules = {
    $: allAnnotation,
    '/host': { $: allAnnotation },
    '/protocol': { $: allAnnotation },
    '/protocolVersion': { $: allAnnotation },
    '/pathname': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/variables': {
      $: allAnnotation,
      '/*': serverVariableRules,
    },
    '/security': {
      $: allAnnotation,
      '/*': {
        $: allAnnotation,
        '/*': { $: allAnnotation },
      },
    },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  const serversRules: CompareRules = {
    $: allAnnotation,
    '/*': serverRules,
  }

  const correlationIdRules: CompareRules = {
    $: allUnclassified,
    '/description': { $: allUnclassified },
    '/location': { $: allUnclassified },
    ...asyncApiSpecificationExtensionRulesFunction(allUnclassified),
  }

  const messageExampleRules: CompareRules = {
    $: allAnnotation,
    '/headers': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
      '/**': { $: allAnnotation },
    },
    '/payload': {
      $: allAnnotation,
      '/**': { $: allAnnotation },
    },
    '/name': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  const messageExamplesRules: CompareRules = {
    $: allAnnotation,
    '/*': messageExampleRules,
  }

  // Message rules factory based on send/receive context
  const messageRules = (isSend: boolean): CompareRules => ({
    $: allBreaking,
    '/headers': () => ({
      ...(isSend ? sendSchemaRules : receiveSchemaRules),
      $: allBreaking,
    }),
    '/correlationId': correlationIdRules,
    '/contentType': { $: addNonBreaking },
    '/name': { $: allNonBreaking },
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    '/examples': messageExamplesRules,
    '/payload': () => ({
      ...(isSend ? sendSchemaRules : receiveSchemaRules),
      $: allBreaking,
    }),
    '/traits': {
      $: allUnclassified,
      '/*': {
        $: allUnclassified,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    ...asyncApiSpecificationExtensionRulesFunction(allUnclassified),
  })

  //TODO: validate classification
  const parameterRules: CompareRules = {
    $: allUnclassified,
    '/enum': {
      $: allUnclassified,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': { $: allUnclassified, ignoreKeyDifference: true },
    },
    '/default': { $: allUnclassified },
    '/description': { $: allAnnotation },
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    '/location': { $: allUnclassified },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const channelRules: CompareRules = {
    $: addNonBreaking,
    '/address': { $: allUnclassified },
    '/messages': {
      $: addNonBreaking,
      '/*': messageRules(true), // Default to send scope for channel-level messages
    },
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/servers': {
      $: allUnclassified,
      '/*': { $: allUnclassified },
    },
    '/parameters': {
      $: allUnclassified,
      '/*': parameterRules,
    },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const operationReplyAddressRules: CompareRules = {
    $: allUnclassified,
    '/description': { $: allAnnotation },
    '/location': { $: allUnclassified },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const operationReplyRules: CompareRules = {
    $: allUnclassified,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_SEND, //TODO: invert operation scope
    '/address': operationReplyAddressRules,
    '/channel': { $: allUnclassified },
    '/messages': {
      $: allUnclassified,
      '/*': messageRules(true), //TODO: fix scope
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  const operationTraitsRules: CompareRules = {
    $: allUnclassified,
    '/*': {
      $: allUnclassified,
      '/*': { $: allUnclassified },
      '/**': { $: allUnclassified },
    },
  }

  // Operation rules factory based on action type
  const operationRules = (isSendAction: boolean): CompareRules => ({
    // For send operations: add=non-breaking (can send new types), remove=breaking
    // For receive operations: add=breaking (must handle new types), remove=non-breaking
    $: isSendAction //TODO: fix scopes
      ? [nonBreaking, breaking, unclassified]
      : [breaking, nonBreaking, unclassified],
    [START_NEW_COMPARE_SCOPE_RULE]: isSendAction ? COMPARE_SCOPE_SEND : COMPARE_SCOPE_RECEIVE,
    '/title': { $: allAnnotation },
    '/summary': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/security': {
      $: allUnclassified,
      '/*': securitySchemeRules,
    },
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    '/bindings': bindingsRules,
    '/reply': operationReplyRules, // Reply always uses send scope
    '/action': { $: allBreaking },
    '/channel': { $: allBreaking },
    '/traits': operationTraitsRules,
    '/messages': {
      $: allUnclassified,
      '/*': messageRules(isSendAction),
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  })

  //TODO: review
  const operationsRules: CompareRules = {
    $: addNonBreaking,
    '/*': ({ value }) => {
      // Determine if this is a send or receive operation based on the action field
      const action = (value as Record<string, unknown>)?.action
      const isSendAction = action === ASYNCAPI_ACTION_SEND
      return operationRules(isSendAction)
    },
  }

  // Components rules
  const componentsRules: CompareRules = {
    $: allNonBreaking,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_COMPONENTS,
    '/schemas': {
      $: [nonBreaking, breaking, breaking],
      '/*': () => ({
        $: allUnclassified, // For component schemas, use unclassified as default
        ...sendSchemaRules,
      }),
    },
    '/servers': {
      $: [nonBreaking, breaking, breaking],
      '/*': serverRules,
    },
    '/channels': {
      $: [nonBreaking, breaking, breaking],
      '/*': channelRules,
    },
    '/operations': {
      $: [nonBreaking, breaking, breaking],
      '/*': ({ value }) => {
        const action = (value as Record<string, unknown>)?.action
        const isSendAction = action === ASYNCAPI_ACTION_SEND
        return operationRules(isSendAction)
      },
    },
    '/messages': {
      $: [nonBreaking, breaking, breaking],
      '/*': messageRules(true), // Component messages default to send scope
    },
    '/securitySchemes': {
      $: [breaking, nonBreaking, breaking],
      '/*': securitySchemeRules,
    },
    '/serverVariables': {
      $: [nonBreaking, breaking, breaking],
      '/*': serverVariableRules,
    },
    '/parameters': {
      $: [nonBreaking, breaking, breaking],
      '/*': parameterRules,
    },
    '/correlationIds': {
      $: [nonBreaking, breaking, breaking],
      '/*': correlationIdRules,
    },
    '/replies': {
      $: [nonBreaking, breaking, breaking],
      '/*': operationReplyRules,
    },
    '/replyAddresses': {
      $: [nonBreaking, breaking, breaking],
      '/*': operationReplyAddressRules,
    },
    '/externalDocs': {
      $: [nonBreaking, breaking, breaking],
      '/*': externalDocumentationRules,
    },
    '/tags': {
      $: [nonBreaking, breaking, breaking],
      '/*': tagRules,
    },
    '/operationTraits': {
      $: [nonBreaking, breaking, breaking],
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    '/messageTraits': {
      $: [nonBreaking, breaking, breaking],
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    '/serverBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    '/channelBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    '/operationBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    '/messageBindings': {
      $: [nonBreaking, breaking, breaking],
      '/*': bindingsRules,
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Contact rules (info.contact)
  const contactRules: CompareRules = {
    $: allAnnotation,
    '/name': { $: allAnnotation },
    '/url': { $: allAnnotation },
    '/email': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // License rules (info.license)
  const licenseRules: CompareRules = {
    $: allAnnotation,
    '/name': { $: allAnnotation },
    '/url': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Info rules
  const infoRules: CompareRules = {
    $: allAnnotation,
    '/title': { $: allAnnotation },
    '/version': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/termsOfService': { $: allAnnotation },
    '/contact': contactRules,
    '/license': licenseRules,
    '/tags': tagsRules,
    '/externalDocs': externalDocumentationRules,
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  return {
    '/asyncapi': { $: allAnnotation },
    '/id': { $: allAnnotation },
    '/info': infoRules,
    '/servers': serversRules,
    '/defaultContentType': { $: allUnclassified },
    '/channels': {
      $: allUnclassified,
      '/*': channelRules,
    },
    '/operations': operationsRules,
    '/components': componentsRules,
    ...asyncApiSpecificationExtensionRulesFunction(),
  }
}

