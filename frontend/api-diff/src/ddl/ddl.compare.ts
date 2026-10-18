import { COMPARE_SCOPE_ROOT, CompareResult, StrictCompareOptions } from '../types'
import { compare } from '../core'
import {
  createEvaluationCacheService,
  DDL_API_NORMALIZE_OPTIONS,
  SPEC_TYPE_DDL_API_1,
} from '@netcracker/qubership-apihub-api-unifier'
import { ddlRules } from './ddl.rules'
import { DIALECT_DIFF_POSTGRES } from './ddl.postgres'

/**
 * ddlapi compare engine. Binds the hardcoded PostgreSQL diff dialect and the ddlapi normalize
 * options so the comparison runs on normalized Realms (origins + defaulted empty arrays
 * present). `DDL_API_NORMALIZE_OPTIONS` is spread first so any caller option still wins.
 */
export const compareDdlApi = (version: typeof SPEC_TYPE_DDL_API_1) =>
  (before: unknown, after: unknown, options: StrictCompareOptions): CompareResult =>
    compare(before, after, {
      ...DDL_API_NORMALIZE_OPTIONS,
      ...options,
      rules: ddlRules({ mode: options.mode, version }, DIALECT_DIFF_POSTGRES),
      compareScope: COMPARE_SCOPE_ROOT,
      mergedJsoCache: createEvaluationCacheService(),
      diffUniquenessCache: createEvaluationCacheService(),
      createdMergedJso: new Set(),
    })
