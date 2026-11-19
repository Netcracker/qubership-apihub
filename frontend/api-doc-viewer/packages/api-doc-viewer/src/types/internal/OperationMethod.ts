export const QUERY_OPERATION_METHOD = 'query'
export const MUTATION_OPERATION_METHOD = 'mutation'
export const SUBSCRIPTION_OPERATION_METHOD = 'subscription'
export type GraphQlOperationMethod =
  | typeof QUERY_OPERATION_METHOD
  | typeof MUTATION_OPERATION_METHOD
  | typeof SUBSCRIPTION_OPERATION_METHOD