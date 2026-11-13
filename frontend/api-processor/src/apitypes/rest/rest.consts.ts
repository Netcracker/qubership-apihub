import {
  DEPRECATED_META_KEY,
  FILE_FORMAT_JSON,
  FILE_FORMAT_YAML,
  FILE_FORMAT_YML,
  HASH_FLAG,
  NORMALIZE_OPTIONS,
  ORIGINS_SYMBOL,
} from '../../consts'
import { KeyOfConstType, ResolvedVersionDocument, ZippableDocument } from '../../types'
import { TEXT_DOCUMENT_TYPE } from '../text'
import { NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

export const REST_DOCUMENT_TYPE = {
  OAS3: 'openapi-3-0',
  OAS31: 'openapi-3-1',
  SWAGGER: 'openapi-2-0',
} as const

export type RestDocumentType = KeyOfConstType<typeof REST_DOCUMENT_TYPE>

export const REST_FILE_FORMAT = {
  YAML: FILE_FORMAT_YAML,
  YML: FILE_FORMAT_YML,
  JSON: FILE_FORMAT_JSON,
} as const

// Re-export shared constants for backward compatibility
// TODO: just use new constants for REST
export { DEPRECATED_META_KEY }

export function isRestDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(REST_DOCUMENT_TYPE).some(type => document.type === type)
}

export function isTextDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(TEXT_DOCUMENT_TYPE).some(type => document.type === type)
}

export const REST_EFFECTIVE_NORMALIZE_OPTIONS: NormalizeOptions = {
  ...NORMALIZE_OPTIONS,
  originsFlag: ORIGINS_SYMBOL,
  hashFlag: HASH_FLAG,
}
