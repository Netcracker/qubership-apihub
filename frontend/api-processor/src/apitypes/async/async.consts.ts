import {
  FILE_FORMAT_JSON, FILE_FORMAT_YAML, HASH_FLAG, NORMALIZE_OPTIONS, ORIGINS_SYMBOL, DEPRECATED_META_KEY,
  FIRST_REFERENCE_KEY_PROPERTY,
} from '../../consts'
import { NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { ResolvedVersionDocument, ZippableDocument } from '../../types'

// Only AsyncAPI 3.0 is supported
export const ASYNC_DOCUMENT_TYPE = {
  AAS3: 'asyncapi-3-0',
} as const

export const ASYNC_FILE_FORMAT = {
  YAML: FILE_FORMAT_YAML,
  JSON: FILE_FORMAT_JSON,
} as const

// Re-export shared constants for AsyncAPI
export { DEPRECATED_META_KEY }

export function isAsyncApiDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(ASYNC_DOCUMENT_TYPE).some(type => document.type === type)
}

export const ASYNC_EFFECTIVE_NORMALIZE_OPTIONS: NormalizeOptions = {
  ...NORMALIZE_OPTIONS,
  originsFlag: ORIGINS_SYMBOL,
  hashFlag: HASH_FLAG,
  firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
}
