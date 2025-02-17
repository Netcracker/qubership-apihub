export const REST_API_TYPE = 'rest'
export const GRAPHQL_API_TYPE = 'graphql'
export const TEXT_API_TYPE = 'text'
export const UNKNOWN_API_TYPE = 'unknown'

export type ApiType =
  typeof REST_API_TYPE |
  typeof GRAPHQL_API_TYPE |
  typeof TEXT_API_TYPE |
  typeof UNKNOWN_API_TYPE

export type OperationsApiType = typeof REST_API_TYPE | typeof GRAPHQL_API_TYPE
export const REST_API_TYPE_TITLE = 'REST API'

export const GRAPHQL_API_TYPE_TITLE = 'GraphQL API'

export type ApiTypeTitles =
  typeof REST_API_TYPE_TITLE |
  typeof GRAPHQL_API_TYPE_TITLE

export const API_TITLES_MAP: Record<OperationsApiType, ApiTypeTitles> = {
  [REST_API_TYPE]: REST_API_TYPE_TITLE,
  [GRAPHQL_API_TYPE]: GRAPHQL_API_TYPE_TITLE,
}

export const QUERY_OPERATION_TYPE = 'query'
export const MUTATION_OPERATION_TYPE = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPE = 'subscription'

export type GraphQlOperationType =
  typeof QUERY_OPERATION_TYPE
  | typeof MUTATION_OPERATION_TYPE
  | typeof SUBSCRIPTION_OPERATION_TYPE
