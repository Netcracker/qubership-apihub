import { DiffTemplateParamsCalculator, PrimitiveType } from '../types'
import { DIFF_ACTION_TO_ACTION_MAP, DIFF_ACTION_TO_PREPOSITION_MAP, GREP_TEMPLATE_PARAM_RESPONSE_NAME } from '../core'
import { checkPrimitiveType, resolveAllDeclarationPath } from '../utils'
import {
  grepValue,
  matchPaths,
  OPEN_API_HTTP_METHODS,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_RESPONSES,
  PREDICATE_ANY_VALUE,
  startFromOpenApiComponents,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateComponentsPath } from './openapi3.description'

export const responseParamsCalculator: DiffTemplateParamsCalculator = (diff, _) => {
  const result = {
    action: DIFF_ACTION_TO_ACTION_MAP[diff.action],
    preposition: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  }

  const declarationPaths = resolveAllDeclarationPath(diff)

  let matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_RESPONSE)
  if (matchResult) {
    const responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    return {
      ...result,
      responseName
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATH_FOR_CHANGED_FIELD_IN__RESPONSE)
  if (matchResult) {
    let componentPath: string | undefined
    let responseName: PrimitiveType | undefined
    if (startFromOpenApiComponents(matchResult.path)) {
      componentPath = calculateComponentsPath(matchResult)
    } else {
      responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    }
    return {
      ...result,
      componentPath,
      responseName
    }
  }

  return result
}

const PREDICATES_PATH_FOR_CHANGED_RESPONSE = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME)],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME)])
]
const PREDICATES_PATH_FOR_CHANGED_FIELD_IN__RESPONSE = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), PREDICATE_ANY_VALUE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_RESPONSES, grepValue(GREP_TEMPLATE_PARAM_RESPONSE_NAME), PREDICATE_ANY_VALUE])
]
