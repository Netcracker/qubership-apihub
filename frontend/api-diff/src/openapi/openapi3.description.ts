import {
  GREP_TEMPLATE_PARAM_ENCODING_NAME,
  GREP_TEMPLATE_PARAM_HEADER_NAME,
  GREP_TEMPLATE_PARAM_MEDIA_TYPE,
  GREP_TEMPLATE_PARAM_RESPONSE_NAME
} from '../core'
import { calculateParentJumpDeep, checkPrimitiveType, isEmptyArray, resolveValueFromCompareContext } from '../utils'
import { calculateMatchingDepth, MatchResult, startFromOpenApiComponents, } from '@netcracker/qubership-apihub-api-unifier'
import { CompareContext, Diff, PrimitiveType } from '../types'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export const calculateChangedProperty = (matchResult: MatchResult, ignoredLastProperty: boolean = false): string | undefined => {
  const path = calculateMatchingPathEnd(matchResult, ignoredLastProperty)
  if (isEmptyArray(path)) {
    return undefined
  }
  return path.join('.')
}

export const calculateMatchingPathEnd = (matchResult: MatchResult, ignoredLastProperty: boolean = false): JsonPath => {
  let matchingDepth = calculateMatchingDepth(matchResult)
  matchingDepth = ignoredLastProperty ? matchingDepth + 1 : matchingDepth
  return matchResult.path.slice(matchingDepth)
}

export const calculateComponentsPath = (matchResult: MatchResult): string => {
  return matchResult.path.slice(0, 3).join('.')
}

export const calculateRequestPlace = (matchResult: MatchResult): string => {
  let place: string
  const mediaType = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_MEDIA_TYPE])
  if (startFromOpenApiComponents(matchResult.path)) {
    const requestPath = calculateComponentsPath(matchResult)
    place = `in '${requestPath}' (${mediaType})`
  } else {
    place = `in request body (${mediaType})`
  }
  return place
}

export const calculateResponsePlace = (matchResult: MatchResult): string => {
  let place: string
  const mediaType = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_MEDIA_TYPE])
  if (startFromOpenApiComponents(matchResult.path)) {
    const responsePath = calculateComponentsPath(matchResult)
    place = `in '${responsePath}' (${mediaType})`
  } else {
    const responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    place = `in response '${responseName}' (${mediaType})`
  }
  return place
}

export const calculateParameterPlace = (matchResult: MatchResult, diff: Diff, ctx: CompareContext, depthInParameter: number = 0): string | undefined => {
  let parameterName: PrimitiveType | undefined
  let parameterIn: PrimitiveType | undefined
  let parameterPath: string | undefined
  let place: string
  if (startFromOpenApiComponents(matchResult.path)) {
    parameterPath = calculateComponentsPath(matchResult)
    place = `in '${parameterPath}'`
  } else {
    const matchingDepth = calculateMatchingDepth(matchResult)
    const parameterNode = resolveValueFromCompareContext(diff, ctx, ...calculateParentJumpDeep(matchResult.path.length - matchingDepth + 1 - depthInParameter))
    if (!parameterNode) {
      return undefined
    }
    parameterName = checkPrimitiveType(parameterNode['name'])
    parameterIn = checkPrimitiveType(parameterNode['in'])
    place = `in ${parameterIn} parameter '${parameterName}'`
  }
  return place
}

export const calculateHeaderPlace = (matchResult: MatchResult): string => {
  let place: string
  let headerName: PrimitiveType | undefined
  let headerPath: string | undefined
  if (startFromOpenApiComponents(matchResult.path)) {
    headerPath = calculateComponentsPath(matchResult)
    place = `in '${headerPath}'`
  } else {
    headerName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_HEADER_NAME])
    place = `in header '${headerName}'`
  }
  return place
}

export const calculateEncodingPlaceInResponse = (matchResult: MatchResult): string => {
  let responsePath: string
  const mediaType = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_MEDIA_TYPE])
  if (startFromOpenApiComponents(matchResult.path)) {
    const componentsResponsePath = calculateComponentsPath(matchResult)
    responsePath = `'${componentsResponsePath}' (${mediaType})`
  } else {
    const responseName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_RESPONSE_NAME])
    responsePath = `response '${responseName}' (${mediaType})`
  }
  const headerName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_HEADER_NAME])
  const encodingName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_ENCODING_NAME])
  return `in header ${headerName} of encoding '${encodingName}' of ${responsePath}`
}

export const calculateEncodingPlaceInRequest = (matchResult: MatchResult): string => {
  let requestPath: string
  const mediaType = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_MEDIA_TYPE])
  if (startFromOpenApiComponents(matchResult.path)) {
    const componentsRequestPath = calculateComponentsPath(matchResult)
    requestPath = `'${componentsRequestPath}' (${mediaType})`
  } else {
    requestPath = `request body (${mediaType})`
  }
  const headerName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_HEADER_NAME])
  const encodingName = checkPrimitiveType(matchResult.grepValues[GREP_TEMPLATE_PARAM_ENCODING_NAME])
  return `in header ${headerName} of encoding '${encodingName}' of ${requestPath}`
}

