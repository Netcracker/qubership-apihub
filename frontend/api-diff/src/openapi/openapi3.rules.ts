import {
  allAnnotation,
  allBreaking,
  allDeprecated,
  allNonBreaking,
  allUnclassified,
  breaking,
  breakingIfAfterTrue,
  diffDescription,
  GREP_TEMPLATE_PARAM_ENCODING_NAME,
  GREP_TEMPLATE_PARAM_EXAMPLE_NAME,
  GREP_TEMPLATE_PARAM_HEADER_NAME,
  GREP_TEMPLATE_PARAM_MEDIA_TYPE,
  GREP_TEMPLATE_PARAM_PARAMETER_NAME,
  GREP_TEMPLATE_PARAM_RESPONSE_NAME,
  nonBreaking,
  TEMPLATE_PARAM_ACTION,
  TEMPLATE_PARAM_COMPONENT_PATH,
  TEMPLATE_PARAM_EXAMPLE_PATH,
  TEMPLATE_PARAM_HEADER_PATH,
  TEMPLATE_PARAM_PARAMETER_LOCATION,
  TEMPLATE_PARAM_PARAMETER_PATH,
  TEMPLATE_PARAM_PLACE,
  TEMPLATE_PARAM_PREPOSITION,
  TEMPLATE_PARAM_PROPERTY_NAME,
  TEMPLATE_PARAM_REQUEST_PATH,
  TEMPLATE_PARAM_RESPONSE_PATH,
  TEMPLATE_PARAM_SCOPE,
  unclassified,
  deepEqualsUniqueItemsArrayMappingResolver,
} from '../core'
import {
  COMPARE_MODE_OPERATION,
  CompareRules,
  DescriptionTemplates,
  IGNORE_DIFFERENCE_IN_KEYS_RULE,
  START_NEW_COMPARE_SCOPE_RULE,
} from '../types'
import { OpenApi3RulesOptions } from './openapi3.types'
import { openApiSchemaRules } from './openapi3.schema'
import {
  apihubAllowEmptyValueParameterClassifyRule,
  apihubParametersRemovalClassifyRule,
  globalSecurityClassifyRule,
  globalSecurityItemClassifyRule,
  operationSecurityClassifyRule,
  operationSecurityItemClassifyRule,
  paramClassifyRule,
  parameterAllowReservedClassifyRule,
  parameterExplodeClassifyRule,
  parameterNameClassifyRule,
  parameterRequiredClassifyRule,
  parameterStyleClassifyRule,
  pathChangeClassifyRule,
} from './openapi3.classify'
import {
  contentMediaTypeMappingResolver,
  paramMappingResolver,
  pathMappingResolver,
  singleOperationPathMappingResolver,
} from './openapi3.mapping'
import { isResponseSchema } from './openapi3.utils'
import { apihubCaseInsensitiveKeyMappingResolver } from './mapping'
import { nonBreakingIf } from '../utils'
import { COMPARE_SCOPE_COMPONENTS, COMPARE_SCOPE_RESPONSE, COMPARE_SCOPE_REQUEST } from './openapi3.const'
import { parameterParamsCalculator } from './openapi3.description.parameter'
import { requestParamsCalculator } from './openapi3.description.request'
import { responseParamsCalculator } from './openapi3.description.response'
import { contentParamsCalculator } from './openapi3.description.content'
import { examplesParamsCalculator } from './openapi3.description.examples'
import { headerParamsCalculator } from './openapi3.description.header'
import { encodingParamsCalculator } from './openapi3.description.encoding'

const documentAnnotationRule: CompareRules = { $: allAnnotation }
const operationAnnotationRule: CompareRules = { $: allAnnotation }

export const openApi3Rules = (options: OpenApi3RulesOptions): CompareRules => {
  const requestSchemaRules = openApiSchemaRules(options)
  const responseSchemaRules = openApiSchemaRules({ ...options, response: true })

  const serversRules: CompareRules = {
    $: allAnnotation,
    '/**': {
      $: allAnnotation,
    },
    '/*': {
      '/variables': {
        '/*': {
          '/enum': {
            mapping: deepEqualsUniqueItemsArrayMappingResolver,
            '/*': { ignoreKeyDifference: true },
          },
        },
      },
    },
  }

  const examplesRules: CompareRules = {
    $: allAnnotation,
    '/*': {
      $: allAnnotation,
      description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] example '{{${GREP_TEMPLATE_PARAM_EXAMPLE_NAME}}}'`),
      descriptionParamCalculator: examplesParamsCalculator,
      '/summary': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
      },
      '/description': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
      },
      '/externalValue': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
      },
      '/value': {
        $: allAnnotation,
        description: diffDescription(resolveExamplesDescriptionTemplates()),
        '/**': {
          $: allAnnotation,
          description: diffDescription(resolveExamplesDescriptionTemplates()),
        }
      },
    },
    '/**': { $: allAnnotation },
  }

  const parametersRules: CompareRules = {
    '/*': {
      [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_REQUEST,
      [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
      description: diffDescription([`[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`]),
      descriptionParamCalculator: parameterParamsCalculator,
      $: paramClassifyRule,
      '/name': {
        $: parameterNameClassifyRule,
        description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`),
      },
      '/in': {
        $: [nonBreaking, breaking, breaking],
        description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`),
      },
      '/schema': () => ({
        ...requestSchemaRules,
        $: allBreaking,
      }),
      '/description': {
        $: allAnnotation,
        description: diffDescription(resolveParameterDescriptionTemplates('description'))
      },
      '/required': {
        $: parameterRequiredClassifyRule,
        description: diffDescription(resolveParameterDescriptionTemplates('required status'))
      },
      '/deprecated': {
        $: allDeprecated,
        description: diffDescription(resolveParameterDescriptionTemplates('deprecated status'))
      },
      '/style': {
        $: parameterStyleClassifyRule,
        description: diffDescription(resolveParameterDescriptionTemplates('delimited style'))
      },
      '/explode': {
        $: parameterExplodeClassifyRule,
        description: diffDescription(resolveParameterDescriptionTemplates('explode status'))
      },
      '/allowReserved': {
        $: parameterAllowReservedClassifyRule,
        description: diffDescription(resolveParameterDescriptionTemplates('allowReserved status'))
      },
      '/allowEmptyValue': {
        $: apihubAllowEmptyValueParameterClassifyRule,
        description: diffDescription(resolveParameterDescriptionTemplates('allowEmptyValue status'))
      },
      '/example': {
        $: allAnnotation,
        description: diffDescription(resolveParameterDescriptionTemplates('example')),
        '/**': {
          $: allAnnotation,
          description: diffDescription(resolveParameterDescriptionTemplates())
        }
      },
      '/examples': examplesRules
    },
  }

  const headersRules: CompareRules = {
    $: [nonBreaking, breaking, breaking],
    '/*': {
      $: [nonBreaking, breaking, breaking],
      description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}'`),
      descriptionParamCalculator: headerParamsCalculator,
      '/description': {
        $: allAnnotation,
        description: diffDescription(resolveHeaderDescriptionTemplates('description')),
      },
      '/required': {
        $: [breaking, nonBreaking, breakingIfAfterTrue],
        description: diffDescription(resolveHeaderDescriptionTemplates('required status')),
      },
      '/deprecated': {
        $: allDeprecated,
        description: diffDescription(resolveHeaderDescriptionTemplates('deprecated status')),
      },
      '/allowEmptyValue': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('allowEmptyValue status')),
      },
      '/style': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('delimited style')),
      },
      '/explode': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('explode status')),
      },
      '/allowReserved': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('allowReserved status')),
      },
      '/example': {
        $: allUnclassified,
        description: diffDescription(resolveHeaderDescriptionTemplates('example')),
        '/**': {
          $: allUnclassified,
          description: diffDescription(resolveHeaderDescriptionTemplates())
        }
      },
      '/examples': examplesRules,
      '/schema': ({ path }) => ({
        $: allBreaking,
        ...isResponseSchema(path) ? responseSchemaRules : requestSchemaRules,
      }),
    },
  }

  const encodingRules: CompareRules = {
    $: [breaking, nonBreaking, breaking],
    descriptionParamCalculator: encodingParamsCalculator,
    '/*': {
      description: diffDescription(resolveEncodingDescriptionTemplates()),
      '/contentType': {
        $: [nonBreaking, breaking, breaking],
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      '/headers': headersRules,
      '/style': {
        $: [nonBreaking, breaking, breaking],
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      '/explode': {
        $: [nonBreaking, breaking, breaking],
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
      '/allowReserved': {
        $: [nonBreaking, breaking, breaking],
        description: diffDescription(resolveEncodingDescriptionTemplates())
      },
    },
  }

  const contentRules: CompareRules = {
    $: [nonBreaking, breaking, breaking],
    mapping: contentMediaTypeMappingResolver,
    '/*': {
      $: [nonBreaking, breaking, nonBreaking],
      description: diffDescription([
        `[{{${TEMPLATE_PARAM_ACTION}}}] '{{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}}' media type {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`,
        `[{{${TEMPLATE_PARAM_ACTION}}}] '{{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}}' media type {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}'`,
        `[{{${TEMPLATE_PARAM_ACTION}}}] '{{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}}' media type {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}}`,
      ]),
      descriptionParamCalculator: contentParamsCalculator,
      '/schema': ({ path }) => ({
        $: allBreaking,
        ...isResponseSchema(path) ? responseSchemaRules : requestSchemaRules,
      }),
      '/example': {
        $: allAnnotation,
        description: diffDescription([
          `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
          `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
          `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
        ]),
        '/**': {
          $: allAnnotation,
          description: diffDescription([
            `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
            `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}' ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
            `[{{${TEMPLATE_PARAM_ACTION}}}] {{${TEMPLATE_PARAM_PROPERTY_NAME}}} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_SCOPE}}} ({{${GREP_TEMPLATE_PARAM_MEDIA_TYPE}}})`,
          ]),
        }
      },
      '/examples': examplesRules,
      '/encoding': encodingRules,
    },
  }

  const requestBodiesRules: CompareRules = {
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_REQUEST,
    $: [nonBreaking, breaking, breaking],
    description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] request body`),
    descriptionParamCalculator: requestParamsCalculator,
    '/description': {
      $: allAnnotation,
      description: diffDescription(resolveRequestDescriptionTemplates('description'))
    },
    '/required': {
      $: [breaking, nonBreaking, breakingIfAfterTrue],
      description: diffDescription(resolveRequestDescriptionTemplates('required status'))
    },
    '/content': contentRules,
  }

  const responsesRules: CompareRules = {
    $: [nonBreaking, breaking, breaking],
    [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_RESPONSE,
    mapping: apihubCaseInsensitiveKeyMappingResolver,
    '/*': {
      description: diffDescription(`[{{${TEMPLATE_PARAM_ACTION}}}] response '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`),
      descriptionParamCalculator: responseParamsCalculator,
      $: [nonBreaking, breaking, (ctx) => nonBreakingIf(ctx.before.key.toString().toLocaleLowerCase() === ctx.after.key.toString().toLocaleLowerCase())],
      '/description': {
        $: allAnnotation,
        description: diffDescription([
          `[{{${TEMPLATE_PARAM_ACTION}}}] description {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_COMPONENT_PATH}}}'`,
          `[{{${TEMPLATE_PARAM_ACTION}}}] description {{${TEMPLATE_PARAM_PREPOSITION}}} response '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`
        ]),
      },
      '/headers': headersRules,
      '/content': contentRules,
    },
  }

  return {
    '/openapi': documentAnnotationRule,
    '/info': {
      ...documentAnnotationRule,
      '/**': documentAnnotationRule,
    },
    '/servers': serversRules,
    '/paths': {
      $: allUnclassified,
      mapping: options.mode === COMPARE_MODE_OPERATION ? singleOperationPathMappingResolver : pathMappingResolver,
      '/*': {
        $: pathChangeClassifyRule,
        mapping: options.mode === COMPARE_MODE_OPERATION ? singleOperationPathMappingResolver : pathMappingResolver,
        '/summary': { $: allAnnotation },
        '/description': { $: allAnnotation },
        '/*': {
          $: [nonBreaking, breaking, unclassified],
          '/*': operationAnnotationRule,
          '/tags': {
            ...operationAnnotationRule,
            mapping: deepEqualsUniqueItemsArrayMappingResolver,
            '/*': {
              ...operationAnnotationRule,
              [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
            },
          },
          '/parameters': {
            ...parametersRules,
            $: [nonBreaking, apihubParametersRemovalClassifyRule, breaking],
            mapping: paramMappingResolver(2),
          },
          '/requestBody': requestBodiesRules,
          '/callbacks': {
            '/*': {
              //no support?
            },
          },
          '/responses': responsesRules,
          '/deprecated': { $: allDeprecated },
          '/security': {
            $: operationSecurityClassifyRule,
            '/*': {
              $: operationSecurityItemClassifyRule,
              '/*': {
                $: allBreaking,
                mapping: deepEqualsUniqueItemsArrayMappingResolver,
                '/*': {
                  $: [breaking, nonBreaking, breaking],
                  ignoreKeyDifference: true,
                },
              },
            },
          },
          '/servers': serversRules,
          '/externalDocs': {
            $: allAnnotation,
            '/*': { $: allAnnotation },
          },
        },
        '/servers': serversRules,
        '/parameters': {
          ...parametersRules,
          $: [nonBreaking, breaking, breaking],
          mapping: paramMappingResolver(1),
        },
      },
    },
    '/components': {
      $: allNonBreaking,
      [START_NEW_COMPARE_SCOPE_RULE]: COMPARE_SCOPE_COMPONENTS,
      '/schemas': {
        $: [nonBreaking, breaking, breaking],
        '/*': () => ({
          ...requestSchemaRules,
          $: allUnclassified,/*for mode One operation*/
        }),
      },
      '/responses': {
        $: [nonBreaking, breaking, breaking],
        '/*': responsesRules,
      },
      '/parameters': {
        $: [nonBreaking, breaking, breaking],
        '/*': parametersRules,
      },
      '/examples': examplesRules,
      '/requestBodies': {
        $: [nonBreaking, breaking, breaking],
        '/*': requestBodiesRules,
      },
      '/headers': headersRules,
      '/securitySchemes': {
        $: [breaking, nonBreaking, breaking],
        '/*': {
          $: [breaking, nonBreaking, breaking],
          '/type': { $: [breaking, nonBreaking, breaking] },
          '/description': { $: allAnnotation },
          '/name': { $: [breaking, nonBreaking, breaking] },
          '/in': { $: [breaking, nonBreaking, breaking] },
          '/scheme': { $: [breaking, nonBreaking, breaking] },
          '/bearerFormat': { $: allAnnotation },
          '/flows': { $: [breaking, nonBreaking, breaking] },
          '/openIdConnectUrl': { $: allAnnotation },
        },
      },
    },
    '/security': {
      $: globalSecurityClassifyRule,
      '/*': { $: globalSecurityItemClassifyRule },
    },
    '/tags': { $: allAnnotation },
    '/externalDocs': { $: allAnnotation },
  }
}

const resolveHeaderDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}' in response '{{${GREP_TEMPLATE_PARAM_RESPONSE_NAME}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} header '{{${GREP_TEMPLATE_PARAM_HEADER_NAME}}}' in '{{${TEMPLATE_PARAM_RESPONSE_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_HEADER_PATH}}}'`,
])

const resolveParameterDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${TEMPLATE_PARAM_PARAMETER_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} {{${TEMPLATE_PARAM_PARAMETER_LOCATION}}} parameter '{{${GREP_TEMPLATE_PARAM_PARAMETER_NAME}}}'`
])

const resolveRequestDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${TEMPLATE_PARAM_REQUEST_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} request body`,
])

const resolveExamplesDescriptionTemplates = (details: string = `{{${TEMPLATE_PARAM_PROPERTY_NAME}}}`): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} example '{{${TEMPLATE_PARAM_EXAMPLE_PATH}}}'`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] ${details} {{${TEMPLATE_PARAM_PREPOSITION}}} example '{{${GREP_TEMPLATE_PARAM_EXAMPLE_NAME}}}' {{${TEMPLATE_PARAM_PLACE}}}`,
])

const resolveEncodingDescriptionTemplates = (): DescriptionTemplates => ([
  `[{{${TEMPLATE_PARAM_ACTION}}}] Encoding details {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${GREP_TEMPLATE_PARAM_ENCODING_NAME}}}' {{${TEMPLATE_PARAM_PLACE}}}`,
  `[{{${TEMPLATE_PARAM_ACTION}}}] Encoding details ({{${TEMPLATE_PARAM_PROPERTY_NAME}}}) {{${TEMPLATE_PARAM_PREPOSITION}}} '{{${GREP_TEMPLATE_PARAM_ENCODING_NAME}}}' {{${TEMPLATE_PARAM_PLACE}}}`
])
