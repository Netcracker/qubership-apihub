import type { OpenAPIV3 } from 'openapi-types'
import type { NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { denormalize, normalize } from '@netcracker/qubership-apihub-api-unifier'

export const SYNTHETIC_TITLE_FLAG = Symbol('synthetic-title')

export const NORMALIZE_OPTIONS: NormalizeOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: SYNTHETIC_TITLE_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
}

// TODO: Think about generic function or add document type checking
export function normalizeOperation(operation: unknown, source?: unknown): OpenAPIV3.Document {
  const normalizedDocument = normalize(operation, {
    source: source,
    ...NORMALIZE_OPTIONS,
  })
  return denormalize(normalizedDocument, NORMALIZE_OPTIONS) as OpenAPIV3.Document
}
