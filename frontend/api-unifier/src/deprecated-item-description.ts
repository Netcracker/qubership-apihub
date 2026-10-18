import { matchPaths, MatchResult, PREDICATE_UNCLOSED_END } from './path-matcher'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import {
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_HEADERS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_RESPONSES
} from './rules/openapi.const'
import { startFromOpenApiComponents } from './rules/openapi.utils'
import { DescriptionContext } from './types'

export const startFromOpenApiComponentsHeaders = (jsonPaths: JsonPath[]): boolean => {
  return !!openApiComponentsHeadersMatchResult(jsonPaths)
}
export const startFromOpenApiPaths = (jsonPath: JsonPath[]): boolean => {
  return !!matchPaths(jsonPath, [[OPEN_API_PROPERTY_PATHS, PREDICATE_UNCLOSED_END]])
}
export const startFromOpenApiComponentsResponses = (jsonPaths: JsonPath[]): boolean => { //response is a ref
  return !!openApiComponentsResponsesMatchResult(jsonPaths)
}

export const openApiComponentsMatchResult = (jsonPaths: JsonPath[]): MatchResult | undefined => {
  return matchPaths(jsonPaths, [[OPEN_API_PROPERTY_COMPONENTS, PREDICATE_UNCLOSED_END]])
}
export const openApiComponentsResponsesMatchResult = (jsonPaths: JsonPath[]): MatchResult | undefined => {
  return matchPaths(jsonPaths, [[OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_RESPONSES, PREDICATE_UNCLOSED_END]])
}
export const openApiComponentsHeadersMatchResult = (jsonPaths: JsonPath[]): MatchResult | undefined => {
  return matchPaths(jsonPaths, [[OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_HEADERS, PREDICATE_UNCLOSED_END]])
}
export const calculateHeaderName = (paths: JsonPath[], key: PropertyKey): string => {
  if (startFromOpenApiComponentsHeaders(paths)) {
    return `'${declarationPathsToRefName(openApiComponentsHeadersMatchResult(paths)?.path)}'`
  }
  if (paths.some(startFromOpenApiComponents)) {
    return ''
  }
  return `'${key.toString()}'`
}

export const calculateHeaderPlace = (paths: JsonPath[], suffix: string): string => {
  if ((startFromOpenApiPaths(paths))) {
    return `${suffix}`
  }
  if (startFromOpenApiComponentsResponses(paths)) {
    return `in '${declarationPathsToRefName(openApiComponentsResponsesMatchResult(paths)?.path)}'`
  }
  return ''
}

export function calculateParameterName(ctx: DescriptionContext): string {
  if (ctx.paths.every(startFromOpenApiComponents)) {
    return `'${declarationPathsToRefName(openApiComponentsMatchResult(ctx.paths)?.path)}'`
  }
  return `'${ctx.source.name}'`
}

export const calculateSchemaName = (ctx: DescriptionContext): string => {
  if (ctx.paths.some(startFromOpenApiComponents)) {
    return `in '${declarationPathsToRefName(openApiComponentsMatchResult(ctx.paths)?.path)}'`
  }
  return `${ctx.suffix}`
}

export function declarationPathsToRefName(path: JsonPath = []): string {
  const filteredPath = path.filter(item => item !== 'deprecated')

  return filteredPath.join('.')
}

export function nonEmptyString(str: string): string {
  return str?.length ? ` ${str}` : ''
}
