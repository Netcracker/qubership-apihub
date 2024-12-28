import { DiffTemplateParamsCalculator, DynamicParams, PrimitiveType } from '../types'
import {
  DIFF_ACTION_TO_ACTION_MAP,
  DIFF_ACTION_TO_PREPOSITION_MAP,
  GREP_TEMPLATE_PARAM_HEADER_NAME,
  GREP_TEMPLATE_PARAM_RESPONSE_NAME
} from '../core'
import { checkPrimitiveType, resolveAllDeclarationPath } from '../utils'
import {
  grepValue,
  matchPaths,
  MatchResult,
  OPEN_API_HTTP_METHODS,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_EXAMPLE,
  OPEN_API_PROPERTY_HEADERS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_RESPONSES,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  startFromOpenApiComponents,
} from '@netcracker/qubership-apihub-api-unifier'
import {
  calculateChangedProperty,
  calculateComponentsPath,
  calculateEncodingPlaceInRequest,
  calculateEncodingPlaceInResponse,
} from './openapi3.description'
import {
  PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_REQUEST,
  PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_RESPONSE
} from './openapi3.description.encoding'

export const headerParamsCalculator: DiffTemplateParamsCalculator = (diff, _) => {
  const result = {
    action: DIFF_ACTION_TO_ACTION_MAP[diff.action],
    preposition: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  }

  const calculateResponseCaseParams = (matchResult: MatchResult): DynamicParams => {
    let responseName: PrimitiveType | undefined
    let responsePath: string | undefined
    const headerName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_HEADER_NAME])
    if (startFromOpenApiComponents(matchResult.path)) {
      responsePath = calculateComponentsPath(matchResult)
    } else {
      responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    }
    return { headerName, responsePath, responseName }
  }

  const declarationPaths = resolveAllDeclarationPath(diff)

  let matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_HEADER)
  if (matchResult) {
    const headerName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_HEADER_NAME])
    return {
      ...result,
      headerName
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_HEADER_IN_COMPONENTS)
  if (matchResult) {
    const headerPath = calculateComponentsPath(matchResult)
    return {
      ...result,
      headerPath
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_HEADER_IN_RESPONSES)
  if (matchResult) {
    const responseParams = calculateResponseCaseParams(matchResult)
    return {
      ...result,
      ...responseParams
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_EXAMPLE_IN_HEADER_IN_COMPONENTS)
  if (matchResult) {
    const propertyName = calculateChangedProperty(matchResult)
    const headerPath = calculateComponentsPath(matchResult)
    return {
      ...result,
      headerPath,
      propertyName
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_EXAMPLE_IN_HEADER_IN_RESPONSES)
  if (matchResult) {
    const propertyName = calculateChangedProperty(matchResult)
    const responseParams = calculateResponseCaseParams(matchResult)
    return {
      ...result,
      ...responseParams,
      propertyName
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_RESPONSE)
  if (matchResult) {
    const propertyName = calculateChangedProperty(matchResult)
    const place = calculateEncodingPlaceInResponse(matchResult)
    return {
      ...result,
      propertyName,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_REQUEST)
  if (matchResult) {
    const propertyName = calculateChangedProperty(matchResult)
    const place = calculateEncodingPlaceInRequest(matchResult)
    return {
      ...result,
      propertyName,
      place
    }
  }

  return result
}

const PREDICATES_PATHS_FOR_CHANGED_HEADER = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME)],
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME)],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME)]),
]
const PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_HEADER_IN_COMPONENTS = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_HEADERS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE],
]
const PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_HEADER_IN_RESPONSES = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), PREDICATE_ANY_VALUE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), PREDICATE_ANY_VALUE]),
]
const PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_EXAMPLE_IN_HEADER_IN_COMPONENTS = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_HEADERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END],
]
const PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_EXAMPLE_IN_HEADER_IN_RESPONSES = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), PREDICATE_ANY_VALUE, PREDICATE_UNCLOSED_END]),
]
