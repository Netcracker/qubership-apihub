import { ASYNCAPI_API_TYPE, GRAPHQL_API_TYPE, REST_API_TYPE } from '@netcracker/qubership-apihub-api-processor'
import { isNotEmpty } from '../utils/arrays'

export const API_TYPE_REST = REST_API_TYPE
export const API_TYPE_GRAPHQL = GRAPHQL_API_TYPE
export const API_TYPE_ASYNCAPI = ASYNCAPI_API_TYPE

export type ApiType =
  | typeof API_TYPE_REST
  | typeof API_TYPE_GRAPHQL
  | typeof API_TYPE_ASYNCAPI

export const API_TYPES: ApiType[] = [API_TYPE_REST, API_TYPE_GRAPHQL, API_TYPE_ASYNCAPI]
export const API_TYPE_TITLE_MAP: Record<ApiType, string> = {
  [API_TYPE_REST]: 'REST API',
  [API_TYPE_GRAPHQL]: 'GraphQL API',
  [API_TYPE_ASYNCAPI]: 'AsyncAPI',
}

export function toApiTypeMap<T extends {
  apiType: ApiType
}>(operationTypes?: ReadonlyArray<T>): Record<ApiType, T> | undefined {
  return isNotEmpty(operationTypes)
    ? (Object.fromEntries(
      operationTypes!.map(operationType => [operationType.apiType, operationType]),
    )) as Record<ApiType, T>
    : undefined
}

export function isApiType(apiType: string): apiType is ApiType {
  return API_TYPES.some(type => type === apiType)
}
