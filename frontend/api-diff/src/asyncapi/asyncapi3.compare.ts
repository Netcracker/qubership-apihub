import { CompareResult, StrictCompareOptions } from '../types'
import { compare } from '../core'
import { asyncApi3Rules } from './asyncapi3.rules'
import { SPEC_TYPE_ASYNCAPI_3 } from '@netcracker/qubership-apihub-api-unifier'

export const compareAsyncApi = (version: typeof SPEC_TYPE_ASYNCAPI_3) => (before: unknown, after: unknown, options: StrictCompareOptions): CompareResult => {
  return compare(before, after, {
    ...options,
    rules: asyncApi3Rules({
      mode: options.mode,
      version: version,
    }),
  })
}

