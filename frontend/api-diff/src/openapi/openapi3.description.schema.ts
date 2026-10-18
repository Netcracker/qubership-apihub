import { DiffTemplateParamsCalculator, DynamicParams } from '../types'
import {
  DIFF_ACTION_TO_ACTION_MAP,
  DIFF_ACTION_TO_PREPOSITION_MAP,
  GREP_TEMPLATE_PARAM_HEADER_NAME,
  GREP_TEMPLATE_PARAM_MEDIA_TYPE,
  GREP_TEMPLATE_PARAM_PARAMETER_NAME,
  GREP_TEMPLATE_PARAM_RESPONSE_NAME
} from '../core'
import { resolveAllDeclarationPath } from '../utils'
import {
  grepValue,
  matchPaths,
  MatchResult,
  OPEN_API_HTTP_METHODS,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_CONTENT,
  OPEN_API_PROPERTY_HEADERS,
  OPEN_API_PROPERTY_PARAMETERS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_REQUEST_BODIES,
  OPEN_API_PROPERTY_REQUEST_BODY,
  OPEN_API_PROPERTY_RESPONSES,
  OPEN_API_PROPERTY_SCHEMA,
  OPEN_API_PROPERTY_SCHEMAS,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
} from '@netcracker/qubership-apihub-api-unifier'
import {
  calculateComponentsPath,
  calculateEncodingPlaceInRequest,
  calculateEncodingPlaceInResponse,
  calculateHeaderPlace,
  calculateMatchingPathEnd,
  calculateParameterPlace,
  calculateRequestPlace,
  calculateResponsePlace
} from './openapi3.description'
import {
  PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_REQUEST,
  PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_RESPONSE
} from './openapi3.description.encoding'

export const schemaParamsCalculator: DiffTemplateParamsCalculator = (diff, ctx) => {
  const result = {
    action: DIFF_ACTION_TO_ACTION_MAP[diff.action],
    preposition: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  }

  const declarationPaths = resolveAllDeclarationPath(diff)

  let matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_COMPONENTS)
  if (matchResult) {
    const scope = diff.scope
    const componentsSchemaPath = calculateComponentsPath(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult, componentsSchemaPath)
    return {
      ...result,
      ...commonSchemaParams,
      scope
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_PARAMETER)
  if (matchResult) {
    const place = calculateParameterPlace(matchResult, diff, ctx, 1)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_REQUEST)
  if (matchResult) {
    const place = calculateRequestPlace(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_RESPONSE)
  if (matchResult) {
    const place = calculateResponsePlace(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_HEADER)
  if (matchResult) {
    const place = calculateHeaderPlace(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_HEADER_IN_RESPONSE)
  if (matchResult) {
    const place = calculateHeaderPlace(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_RESPONSE)
  if (matchResult) {
    const place = calculateEncodingPlaceInResponse(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_ENCODING_IN_HEADER_IN_REQUEST)
  if (matchResult) {
    const place = calculateEncodingPlaceInRequest(matchResult)
    const commonSchemaParams = calculateCommonSchemaParams(matchResult)
    return {
      ...result,
      ...commonSchemaParams,
      place
    }
  }

  return result
}

const calculateCommonSchemaParams = (schemaMatchResult: MatchResult, componentsSchemaPath?: string): DynamicParams => {
  let schemaPath
  const pathEnd = calculateMatchingPathEnd(schemaMatchResult)
  if (pathEnd.length < 4) {
    schemaPath = componentsSchemaPath
    return { schemaPath }
  }
  if (pathEnd[0] !== OPEN_API_PROPERTY_SCHEMA) {
    pathEnd.shift()
  }
  pathEnd.pop()
  schemaPath = pathEnd.join('.')
  if (componentsSchemaPath) {
    schemaPath = schemaPath ? [componentsSchemaPath, schemaPath].join('.') : componentsSchemaPath
  }
  return { schemaPath }
}

const PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_COMPONENTS = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_SCHEMAS, PREDICATE_ANY_VALUE, PREDICATE_UNCLOSED_END],
]
const PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_PARAMETER = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, grepValue(GREP_TEMPLATE_PARAM_PARAMETER_NAME), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END],
  [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, grepValue(GREP_TEMPLATE_PARAM_PARAMETER_NAME), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_PARAMETERS, grepValue(GREP_TEMPLATE_PARAM_PARAMETER_NAME), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END]),
]
const PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_REQUEST = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_REQUEST_BODIES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_REQUEST_BODY, OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END]),
]
const PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_RESPONSE = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_CONTENT, grepValue(GREP_TEMPLATE_PARAM_MEDIA_TYPE), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END])
]
const PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_HEADER = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END],
]
const PREDICATES_PATHS_FOR_CHANGED_SCHEMA_IN_HEADER_IN_RESPONSE = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), OPEN_API_PROPERTY_HEADERS, grepValue(GREP_TEMPLATE_PARAM_HEADER_NAME), OPEN_API_PROPERTY_SCHEMA, PREDICATE_UNCLOSED_END]),
]
