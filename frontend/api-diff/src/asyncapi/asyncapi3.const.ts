import type { CompareScope } from '../types'

// AsyncAPI-specific compare scopes
// COMPARE_SCOPE_SEND is semantically equivalent to OpenAPI's COMPARE_SCOPE_REQUEST
// COMPARE_SCOPE_RECEIVE is semantically equivalent to OpenAPI's COMPARE_SCOPE_RESPONSE
export const COMPARE_SCOPE_SEND: CompareScope = 'send'
export const COMPARE_SCOPE_RECEIVE: CompareScope = 'receive'
export const COMPARE_SCOPE_COMPONENTS: CompareScope = 'components'

// Re-export action constants from api-unifier (do not duplicate)
export {
  ASYNCAPI_ACTION_SEND,
  ASYNCAPI_ACTION_RECEIVE,
} from '@netcracker/qubership-apihub-api-unifier'

