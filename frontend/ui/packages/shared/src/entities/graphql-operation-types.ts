export const QUERY_OPERATION_TYPE = 'query'
export const MUTATION_OPERATION_TYPE = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPE = 'subscription'

export type GraphQlOperationType =
  | typeof QUERY_OPERATION_TYPE
  | typeof MUTATION_OPERATION_TYPE
  | typeof SUBSCRIPTION_OPERATION_TYPE

export const GRAPHQL_OPERATION_TYPE_COLOR_MAP: Record<GraphQlOperationType, string> = {
  [QUERY_OPERATION_TYPE]: '#00BB5B',
  [MUTATION_OPERATION_TYPE]: '#4FC0F8',
  [SUBSCRIPTION_OPERATION_TYPE]: '#FFB02E',
}
