import { CompareResult, StrictCompareOptions } from '../types'
import { compare } from '../core'
import { openApi3Rules } from './openapi3.rules'
import { OpenApiSpecVersion } from '@netcracker/qubership-apihub-api-unifier'

export const compareOpenApi = (version: OpenApiSpecVersion) => (before: unknown, after: unknown, options: StrictCompareOptions): CompareResult => {
  return compare(before, after, {
      ...options,
      rules: openApi3Rules({
        mode: options.mode,
        version: version,
      }),
    },
  )
}
