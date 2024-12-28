import { DiffTemplateParamsCalculator, DynamicParams, FAILED_PARAMS_CALCULATION, PrimitiveType } from '../types'
import { DIFF_ACTION_TO_ACTION_MAP, DIFF_ACTION_TO_PREPOSITION_MAP } from '../core'
import {
  calculateParentJumpDeep,
  checkPrimitiveType,
  resolveAllDeclarationPath,
  resolveCurrentNode,
  resolveParentNode,
  resolveValueFromCompareContext
} from '../utils'
import {
  calculateMatchingDepth,
  matchPaths,
  MatchResult,
  OPEN_API_HTTP_METHODS,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_EXAMPLE,
  OPEN_API_PROPERTY_PARAMETERS,
  OPEN_API_PROPERTY_PATHS,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  startFromOpenApiComponents,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateChangedProperty, calculateComponentsPath } from './openapi3.description'

export const parameterParamsCalculator: DiffTemplateParamsCalculator = (diff, ctx) => {
  const result = {
    action: DIFF_ACTION_TO_ACTION_MAP[diff.action],
    preposition: DIFF_ACTION_TO_PREPOSITION_MAP[diff.action]
  }

  const calculateCommonParams = (matchResult: MatchResult, parameterNode: any): DynamicParams => {
    let parameterPath: string | undefined
    let parameterName: PrimitiveType | undefined
    const parameterLocation = checkPrimitiveType(parameterNode['in'])
    if (startFromOpenApiComponents(matchResult.path)) {
      parameterPath = calculateComponentsPath(matchResult)
    } else {
      parameterName = checkPrimitiveType(parameterNode['name'])
    }
    return { parameterLocation, parameterPath, parameterName }
  }

  const declarationPaths = resolveAllDeclarationPath(diff)

  let matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_PARAMETER)
  if (matchResult) {
    const parameterNode = resolveCurrentNode(diff, ctx)
    if (!parameterNode) {
      return FAILED_PARAMS_CALCULATION
    }
    const commonParams = calculateCommonParams(matchResult, parameterNode)
    return {
      ...result,
      ...commonParams
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_PARAMETER)
  if (matchResult) {
    const parameterNode = resolveParentNode(diff, ctx)
    if (!parameterNode) {
      return FAILED_PARAMS_CALCULATION
    }
    const commonParams = calculateCommonParams(matchResult, parameterNode)
    return {
      ...result,
      ...commonParams
    }
  }

  matchResult = matchPaths(declarationPaths, PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_EXAMPLE_FIELD_IN_PARAMETER)
  if (matchResult) {
    const matchingDepth = calculateMatchingDepth(matchResult)
    const propertyName = calculateChangedProperty(matchResult)
    const parameterNode = resolveValueFromCompareContext(diff, ctx, ...calculateParentJumpDeep(matchResult.path.length - matchingDepth))
    if (!parameterNode) {
      return FAILED_PARAMS_CALCULATION
    }
    const commonParams = calculateCommonParams(matchResult, parameterNode)
    return {
      ...result,
      ...commonParams,
      propertyName
    }
  }

  return result
}

const PREDICATES_PATHS_FOR_CHANGED_PARAMETER = [
  [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE])
]
const PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_PARAMETER = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE],
  [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE])
]
const PREDICATES_PATHS_FOR_CHANGED_FIELD_IN_EXAMPLE_FIELD_IN_PARAMETER = [
  [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END],
  [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END],
  ...OPEN_API_HTTP_METHODS.map(httpMethod => [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, httpMethod, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END])
]
