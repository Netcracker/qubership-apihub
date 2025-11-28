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

/***
 * Keep consistent ordering for the rules:
 * - classify rule ($) for the node itself first
 * - other rules for the node itself in rule-key alphabetical order
 * - rules for children
 *   - for specific child keys (in alphabetical order)
 *   - prefix rules
 *   - local rules ('/*')
 *   - global rules ('/**')
 * The only exception is top-level structure of AsyncAPI Object where specific keys are in the natural order from the specification.
***/

export const asyncApi3Rules = (options: AsyncApi3RulesOptions): CompareRules => {
  const sendSchemaRules = asyncApiSchemaRules({ version: SPEC_TYPE_ASYNCAPI_3, send: true })
  const receiveSchemaRules = asyncApiSchemaRules({ version: SPEC_TYPE_ASYNCAPI_3, send: false })

  // Common rules for tags (used in multiple places)
  const tagsRules: CompareRules = {
    $: allAnnotation,
    mapping: deepEqualsUniqueItemsArrayMappingResolver,
    '/*': {
      $: allAnnotation,
      '/description': { $: allAnnotation },
      '/name': { $: allAnnotation },
      ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
    },
  }

  // External documentation rules
  const externalDocsRules: CompareRules = {
    $: allAnnotation,
    '/description': { $: allAnnotation },
    '/url': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Server variable rules
  const serverVariableRules: CompareRules = {
    $: allAnnotation,
    '/default': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/enum': {
      $: allAnnotation,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': { $: allAnnotation, ignoreKeyDifference: true },
    },
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Server rules
  const serverRules: CompareRules = {
    $: allAnnotation,
    '/bindings': {
      $: allUnclassified,
      '/*': { $: allUnclassified },
      '/**': { $: allUnclassified },
    },
    '/description': { $: allAnnotation },
    '/host': { $: allAnnotation },
    '/pathname': { $: allAnnotation },
    '/protocol': { $: allAnnotation },
    '/protocolVersion': { $: allAnnotation },
    '/security': {
      $: allAnnotation,
      '/*': {
        $: allAnnotation,
        '/*': { $: allAnnotation },
      },
    },
    '/tags': tagsRules,
    '/title': { $: allAnnotation },
    '/variables': {
      $: allAnnotation,
      '/*': serverVariableRules,
    },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Servers map rules
  const serversRules: CompareRules = {
    $: allAnnotation,
    '/*': serverRules,
  }

  // Bindings rules (protocol-specific, unclassified)
  const bindingsRules: CompareRules = {
    $: allUnclassified,
    '/*': {
      $: allUnclassified,
      '/*': { $: allUnclassified },
      '/**': { $: allUnclassified },
    },
  }

  // Correlation ID rules
  const correlationIdRules: CompareRules = {
    $: addNonBreaking,
    '/description': { $: allAnnotation },
    '/location': { $: addNonBreaking },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Message examples rules
  const messageExamplesRules: CompareRules = {
    $: allAnnotation,
    '/*': {
      $: allAnnotation,
      '/headers': {
        $: allAnnotation,
        '/*': { $: allAnnotation },
        '/**': { $: allAnnotation },
      },
      '/name': { $: allAnnotation },
      '/payload': {
        $: allAnnotation,
        '/**': { $: allAnnotation },
      },
      '/summary': { $: allAnnotation },
      ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
    },
  }

  // Message rules factory based on send/receive context
  const messageRules = (isSend: boolean): CompareRules => ({
    $: allBreaking,
    '/bindings': bindingsRules,
    '/contentType': { $: addNonBreaking },
    '/correlationId': correlationIdRules,
    '/description': { $: allAnnotation },
    '/examples': messageExamplesRules,
    '/headers': () => ({
      ...(isSend ? sendSchemaRules : receiveSchemaRules),
      $: allBreaking,
    }),
    '/name': { $: allNonBreaking },
    '/payload': () => ({
      ...(isSend ? sendSchemaRules : receiveSchemaRules),
      $: allBreaking,
    }),
    '/schemaFormat': { $: allBreaking },
    '/summary': { $: allAnnotation },
    '/tags': tagsRules,
    '/title': { $: allAnnotation },
    '/traits': {
      $: addNonBreaking,
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  })

  // Channel parameter rules
  const channelParameterRules: CompareRules = {
    $: addNonBreaking,
    '/default': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/enum': {
      $: allBreaking,
      mapping: deepEqualsUniqueItemsArrayMappingResolver,
      '/*': { $: allBreaking, ignoreKeyDifference: true },
    },
    '/examples': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    '/location': { $: allBreaking },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Channel rules
  const channelRules: CompareRules = {
    $: addNonBreaking,
    '/address': { $: allAnnotation },
    '/bindings': bindingsRules,
    '/description': { $: allAnnotation },
    '/messages': {
      $: addNonBreaking,
      '/*': messageRules(true), // Default to send scope for channel-level messages
    },
    '/parameters': {
      $: allBreaking,
      '/*': channelParameterRules,
    },
    '/servers': {
      $: allAnnotation,
      '/*': { $: allAnnotation },
    },
    '/summary': { $: allAnnotation },
    '/tags': tagsRules,
    '/title': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Reply address rules
  const replyAddressRules: CompareRules = {
    $: addNonBreaking,
    '/description': { $: allAnnotation },
    '/location': { $: addNonBreaking },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Reply rules - uses SEND scope since it's about sending messages back
  const replyRules: CompareRules = {
    $: addNonBreaking,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_SEND,
    '/address': replyAddressRules,
    '/channel': { $: allBreaking },
    '/messages': {
      $: addNonBreaking,
      '/*': messageRules(true), // Reply messages use send scope
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Operation traits rules
  const operationTraitsRules: CompareRules = {
    $: addNonBreaking,
    '/*': {
      $: addNonBreaking,
      '/*': { $: allUnclassified },
      '/**': { $: allUnclassified },
    },
  }

  // Operation rules factory based on action type
  const operationRules = (isSendAction: boolean): CompareRules => ({
    // For send operations: add=non-breaking (can send new types), remove=breaking
    // For receive operations: add=breaking (must handle new types), remove=non-breaking
    $: isSendAction
      ? [nonBreaking, breaking, unclassified]
      : [breaking, nonBreaking, unclassified],
    [START_NEW_COMPARE_SCOPE_RULE]: isSendAction ? COMPARE_SCOPE_SEND : COMPARE_SCOPE_RECEIVE,
    '/action': { $: allBreaking },
    '/bindings': bindingsRules,
    '/channel': { $: allBreaking },
    '/deprecated': { $: allDeprecated },
    '/description': { $: allAnnotation },
    '/externalDocs': externalDocsRules,
    '/messages': {
      // For send: add message = non-breaking, remove = breaking
      // For receive: add message = breaking, remove = non-breaking
      $: isSendAction
        ? [nonBreaking, breaking, breaking]
        : [breaking, nonBreaking, breaking],
      '/*': messageRules(isSendAction),
    },
    '/reply': replyRules, // Reply always uses send scope
    '/security': {
      // Security changes follow the same pattern as messages
      $: isSendAction
        ? [nonBreaking, breaking, breaking]
        : [breaking, nonBreaking, breaking],
      '/*': {
        $: isSendAction
          ? [nonBreaking, breaking, breaking]
          : [breaking, nonBreaking, breaking],
        '/*': { $: allBreaking },
      },
    },
    '/summary': { $: allAnnotation },
    '/tags': tagsRules,
    '/title': { $: allAnnotation },
    '/traits': operationTraitsRules,
    ...asyncApiSpecificationExtensionRulesFunction(),
  })

  // Operations map rules with dynamic operation type detection
  const operationsRules: CompareRules = {
    $: addNonBreaking,
    '/*': ({ value }) => {
      // Determine if this is a send or receive operation based on the action field
      const action = (value as Record<string, unknown>)?.action
      const isSendAction = action === ASYNCAPI_ACTION_SEND
      return operationRules(isSendAction)
    },
  }

  // Security scheme rules
  const securitySchemeRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    '/bearerFormat': { $: allAnnotation },
    '/description': { $: allAnnotation },
    '/flows': {
      $: [breaking, nonBreaking, breaking],
      '/*': {
        $: [breaking, nonBreaking, breaking],
        ...asyncApiSpecificationExtensionRulesFunction(),
      },
    },
    '/in': { $: [breaking, nonBreaking, breaking] },
    '/name': { $: [breaking, nonBreaking, breaking] },
    '/openIdConnectUrl': { $: allAnnotation },
    '/scheme': { $: [breaking, nonBreaking, breaking] },
    '/scopes': {
      $: [nonBreaking, breaking, breaking],
      '/*': { $: [nonBreaking, breaking, breaking] },
    },
    '/type': { $: [breaking, nonBreaking, breaking] },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Components rules
  const componentsRules: CompareRules = {
    $: allNonBreaking,
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_COMPONENTS,
    '/channels': {
      $: [nonBreaking, breaking, breaking],
      '/*': channelRules,
    },
    '/correlationIds': {
      $: [nonBreaking, breaking, breaking],
      '/*': correlationIdRules,
    },
    '/messages': {
      $: [nonBreaking, breaking, breaking],
      '/*': messageRules(true), // Component messages default to send scope
    },
    '/messageTraits': {
      $: [nonBreaking, breaking, breaking],
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    '/operations': {
      $: [nonBreaking, breaking, breaking],
      '/*': ({ value }) => {
        const action = (value as Record<string, unknown>)?.action
        const isSendAction = action === ASYNCAPI_ACTION_SEND
        return operationRules(isSendAction)
      },
    },
    '/operationTraits': {
      $: [nonBreaking, breaking, breaking],
      '/*': {
        $: addNonBreaking,
        '/*': { $: allUnclassified },
        '/**': { $: allUnclassified },
      },
    },
    '/parameters': {
      $: [nonBreaking, breaking, breaking],
      '/*': channelParameterRules,
    },
    '/replies': {
      $: [nonBreaking, breaking, breaking],
      '/*': replyRules,
    },
    '/replyAddresses': {
      $: [nonBreaking, breaking, breaking],
      '/*': replyAddressRules,
    },
    '/schemas': {
      $: [nonBreaking, breaking, breaking],
      '/*': () => ({
        $: allUnclassified, // For component schemas, use unclassified as default
        ...sendSchemaRules,
      }),
    },
    '/securitySchemes': {
      $: [breaking, nonBreaking, breaking],
      '/*': securitySchemeRules,
    },
    '/servers': {
      $: [nonBreaking, breaking, breaking],
      '/*': serverRules,
    },
    ...asyncApiSpecificationExtensionRulesFunction(),
  }

  // Info rules
  const infoRules: CompareRules = {
    $: allAnnotation,
    '/contact': {
      $: allAnnotation,
      '/email': { $: allAnnotation },
      '/name': { $: allAnnotation },
      '/url': { $: allAnnotation },
      ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
    },
    '/description': { $: allAnnotation },
    '/externalDocs': externalDocsRules,
    '/license': {
      $: allAnnotation,
      '/name': { $: allAnnotation },
      '/url': { $: allAnnotation },
      ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
    },
    '/tags': tagsRules,
    '/termsOfService': { $: allAnnotation },
    '/title': { $: allAnnotation },
    '/version': { $: allAnnotation },
    ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
  }

  // Root AsyncAPI document rules
  return {
    ...asyncApiSpecificationExtensionRulesFunction(),
    '/asyncapi': { $: allAnnotation },
    '/id': { $: allAnnotation },
    '/defaultContentType': { $: allBreaking },
    '/info': infoRules,
    '/servers': serversRules,
    '/channels': {
      $: addNonBreaking,
      '/*': channelRules,
    },
    '/operations': operationsRules,
    '/components': componentsRules,
    '/tags': tagsRules,
    '/externalDocs': externalDocsRules,
  }
}

