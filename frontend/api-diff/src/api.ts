import { COMPARE_MODE_DEFAULT, COMPARE_SCOPE_ROOT, CompareEngine, CompareOptions, CompareResult } from './types'
import { compareJsonSchema } from './jsonSchema'
import { compareGraphApi } from './graphapi'
import { compareAsyncApi } from './asyncapi'
import { compareOpenApi } from './openapi'
import {
  createEvaluationCacheService,
  resolveSpec,
  SPEC_TYPE_ASYNCAPI_2,
  SPEC_TYPE_GRAPH_API,
  SPEC_TYPE_JSON_SCHEMA_04,
  SPEC_TYPE_JSON_SCHEMA_06,
  SPEC_TYPE_JSON_SCHEMA_07,
  SPEC_TYPE_OPEN_API_30,
  SPEC_TYPE_OPEN_API_31,
  SpecType,
} from '@netcracker/qubership-apihub-api-unifier'
import { DEFAULT_NORMALIZED_RESULT, DEFAULT_OPTION_DEFAULTS_META_KEY, DEFAULT_OPTION_ORIGINS_META_KEY, DIFF_META_KEY } from './core'

export const COMPARE_ENGINES_MAP: Record<SpecType, CompareEngine> = {
  [SPEC_TYPE_JSON_SCHEMA_04]: compareJsonSchema(SPEC_TYPE_JSON_SCHEMA_04),
  [SPEC_TYPE_JSON_SCHEMA_06]: compareJsonSchema(SPEC_TYPE_JSON_SCHEMA_06),
  [SPEC_TYPE_JSON_SCHEMA_07]: compareJsonSchema(SPEC_TYPE_JSON_SCHEMA_07),
  [SPEC_TYPE_OPEN_API_30]: compareOpenApi(SPEC_TYPE_OPEN_API_30),
  [SPEC_TYPE_OPEN_API_31]: compareOpenApi(SPEC_TYPE_OPEN_API_31),
  [SPEC_TYPE_ASYNCAPI_2]: compareAsyncApi,
  [SPEC_TYPE_GRAPH_API]: compareGraphApi,
}

// Wrapper function. Use it!
export function apiDiff(before: unknown, after: unknown, options: CompareOptions = {}): CompareResult {
  const beforeSpec = resolveSpec(before)
  const afterSpec = resolveSpec(after)
  if (beforeSpec.type !== afterSpec.type) {
    throw new Error(`Specification cannot be different. Got ${beforeSpec.type} and ${afterSpec.type}`)
  }
  const engine = COMPARE_ENGINES_MAP[beforeSpec.type]
  return engine(before, after, {
    mode: COMPARE_MODE_DEFAULT,
    normalizedResult: DEFAULT_NORMALIZED_RESULT,
    metaKey: DIFF_META_KEY,
    defaultsFlag: DEFAULT_OPTION_DEFAULTS_META_KEY,
    originsFlag: DEFAULT_OPTION_ORIGINS_META_KEY,
    compareScope: COMPARE_SCOPE_ROOT,
    mergedJsoCache: createEvaluationCacheService(),
    diffUniquenessCache: createEvaluationCacheService(),
    valueAdaptationCache: createEvaluationCacheService(),
    createdMergedJso: new Set(),
    ...options,
  })
}
