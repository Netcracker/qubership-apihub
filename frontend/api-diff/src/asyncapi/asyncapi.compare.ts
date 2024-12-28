import { CompareResult, StrictCompareOptions } from '../types'
import { asyncApi2Rules } from './asyncapi2.rules'
import { compare } from '../core'

export const compareAsyncApi = (before: unknown, after: unknown, options: StrictCompareOptions): CompareResult => {
  return compare(before, after, {
    ...options,
    rules: asyncApi2Rules(options.mode),
  })
}
