import { COMPARE_SCOPE_ROOT, CompareResult, StrictCompareOptions } from '../types'
import { jsonSchemaRules } from './jsonSchema.rules'
import { compare } from '../core'
import { createEvaluationCacheService, JsonSchemaSpecVersion } from '@netcracker/qubership-apihub-api-unifier'

export const compareJsonSchema = (version: JsonSchemaSpecVersion) => (before: unknown, after: unknown, options: StrictCompareOptions): CompareResult => {
  return compare(before, after, {
    ...options,
    rules: jsonSchemaRules({ version: version, additionalRules: {} }),
    compareScope: COMPARE_SCOPE_ROOT,
    mergedJsoCache: createEvaluationCacheService(),
    diffUniquenessCache: createEvaluationCacheService(),
    createdMergedJso: new Set(),
  })
}
