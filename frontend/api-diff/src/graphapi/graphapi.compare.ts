import type { CompareResult, StrictCompareOptions } from '../types'
import { graphApiRules } from './graphapi.rules'
import { compare } from '../core'

export const compareGraphApi = (before: unknown, after: unknown, options: StrictCompareOptions): CompareResult => {
  return compare(before, after, {
    ...options,
    rules: graphApiRules(),
  })
}


