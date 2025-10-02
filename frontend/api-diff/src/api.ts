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
  OpenApiSpecVersion,
} from '@netcracker/qubership-apihub-api-unifier'
import { DEFAULT_NORMALIZED_RESULT, DEFAULT_OPTION_DEFAULTS_META_KEY, DEFAULT_OPTION_ORIGINS_META_KEY, DIFF_META_KEY } from './core'

function isOpenApiSpecVersion(specType: SpecType): specType is OpenApiSpecVersion {
  return specType === SPEC_TYPE_OPEN_API_30 || specType === SPEC_TYPE_OPEN_API_31
}

function areSpecTypesCompatible(beforeType: SpecType, afterType: SpecType): boolean {
  if (beforeType === afterType) {
    return true
  }

  // Allow comparison between different OpenAPI versions
  return isOpenApiSpecVersion(beforeType) && isOpenApiSpecVersion(afterType)
}

function selectEngineSpecType(beforeType: SpecType, afterType: SpecType): SpecType {
  // For OpenAPI version comparisons, use the higher version
  if (isOpenApiSpecVersion(beforeType) && isOpenApiSpecVersion(afterType)) {
    if (beforeType === SPEC_TYPE_OPEN_API_31 || afterType === SPEC_TYPE_OPEN_API_31) {
      return SPEC_TYPE_OPEN_API_31
    }
    return SPEC_TYPE_OPEN_API_30
  }

  // For same spec types or other compatible types, use the before type
  return beforeType
}

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
  if (!areSpecTypesCompatible(beforeSpec.type, afterSpec.type)) {
    throw new Error(`Specification cannot be different. Got ${beforeSpec.type} and ${afterSpec.type}`)
  }
  const engine = COMPARE_ENGINES_MAP[selectEngineSpecType(beforeSpec.type, afterSpec.type)]
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
