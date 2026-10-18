import { DiffTemplateParamsCalculator } from '../types'
import { DIFF_ACTION_TO_ACTION_MAP, DIFF_ACTION_TO_PREPOSITION_MAP } from '../core'
import { resolveAllDeclarationPath } from '../utils'
import {
  matchPaths,
  OPEN_API_HTTP_METHODS,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_REQUEST_BODIES,
  OPEN_API_PROPERTY_REQUEST_BODY,
  PREDICATE_ANY_VALUE,
  startFromOpenApiComponents,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateComponentsPath } from './openapi3.description'

export const requestParamsCalculator: DiffTemplateParamsCalculator = (diff, _) => {
  const result = {
    action: DIFF_ACTION_TO_ACTION_MAP[diff.action],
    preposition: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  }

  const declarationPaths = resolveAllDeclarationPath(diff)

  let matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_REQUEST)
  if (matchResult) {
    return result
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_FIELD_IN_REQUEST)
  if (matchResult) {
    let requestPath: string | undefined
    if (startFromOpenApiComponents(matchResult.path)) {
      requestPath = calculateComponentsPath(matchResult)
    }
    return {
      ...result,
      requestPath
    }
  }

  return result
}

const PREDICATES_PATH_FOR_CHANGED_REQUEST = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_REQUEST_BODIES, PREDICATE_ANY_VALUE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_REQUEST_BODY])
]
const PREDICATES_PATH_FOR_CHANGED_FIELD_IN_REQUEST = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_REQUEST_BODIES, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_REQUEST_BODY, PREDICATE_ANY_VALUE])
]
