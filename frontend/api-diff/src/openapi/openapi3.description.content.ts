import { DiffTemplateParamsCalculator, DynamicParams } from '../types'
import {
  DIFF_ACTION_TO_ACTION_MAP,
  DIFF_ACTION_TO_PREPOSITION_MAP,
  GREP_TEMPLATE_PARAM_MEDIA_TYPE,
  GREP_TEMPLATE_PARAM_RESPONSE_NAME
} from '../core'
import { checkPrimitiveType, resolveAllDeclarationPath } from '../utils'
import {
  grepValue,
  matchPaths,
  MatchResult,
  OPEN_API_HTTP_METHODS,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_CONTENT,
  OPEN_API_PROPERTY_EXAMPLE,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_REQUEST_BODIES,
  OPEN_API_PROPERTY_REQUEST_BODY,
  OPEN_API_PROPERTY_RESPONSES,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  startFromOpenApiComponents,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateChangedProperty, calculateComponentsPath } from './openapi3.description'

export const contentParamsCalculator: DiffTemplateParamsCalculator = (diff, _) => {
  const result = {
    action: DIFF_ACTION_TO_ACTION_MAP[diff.action],
    preposition: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  }

  const calculateCommonParams = (matchResult: MatchResult, place: string): DynamicParams => {
    let componentPath: string | undefined
    let scope: string | undefined
    const mediaType = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_MEDIA_TYPE])
    if (startFromOpenApiComponents(matchResult.path)) {
      componentPath = calculateComponentsPath(matchResult)
    } else {
      scope = place
    }
    return { mediaType, componentPath, scope }
  }

  const declarationPaths = resolveAllDeclarationPath(diff)

  let matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_CONTENT_IN_REQUEST)
  if (matchResult) {
    const commonParams = calculateCommonParams(matchResult, 'request body')
    return {
      ...result,
      ...commonParams
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_CONTENT_IN_RESPONSE)
  if (matchResult) {
    const responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    const commonParams = calculateCommonParams(matchResult, 'response')
    return {
      ...result,
      ...commonParams,
      responseName,
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_EXAMPLE_IN_CONTENT_IN_REQUEST)
  if (matchResult) {
    const propertyName = calculateChangedProperty(matchResult)
    const commonParams = calculateCommonParams(matchResult, 'request body')
    return {
      ...result,
      ...commonParams,
      propertyName,
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_EXAMPLE_IN_CONTENT_IN_RESPONSE)
  if (matchResult) {
    const propertyName = calculateChangedProperty(matchResult)
    const responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    const commonParams = calculateCommonParams(matchResult, 'response')
    return {
      ...result,
      ...commonParams,
      propertyName,
      responseName
    }
  }

  return result
}

const PREDICATES_PATH_FOR_CHANGED_CONTENT_IN_REQUEST = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_REQUEST_BODIES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE)],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_REQUEST_BODY, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE)])
]
const PREDICATES_PATH_FOR_CHANGED_CONTENT_IN_RESPONSE = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE)],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE)])
]
const PREDICATES_PATH_FOR_CHANGED_EXAMPLE_IN_CONTENT_IN_REQUEST = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_REQUEST_BODIES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_REQUEST_BODY, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE]),
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_REQUEST_BODIES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_REQUEST_BODY, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END])
]
const PREDICATES_PATH_FOR_CHANGED_EXAMPLE_IN_CONTENT_IN_RESPONSE = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE]),
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END])
]
