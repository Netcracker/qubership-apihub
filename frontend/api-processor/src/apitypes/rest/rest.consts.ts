/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FILE_FORMAT_JSON, FILE_FORMAT_YAML, FILE_FORMAT_YML } from '../../consts'
import { KeyOfConstType, ResolvedVersionDocument, ZippableDocument } from '../../types'
import { TEXT_DOCUMENT_TYPE, TextDocumentType } from '../text'

export const REST_API_TYPE = 'rest' as const

export const REST_SCOPES = {
  all: 'all',
  annotation: 'annotation',
  request: 'request',
  response: 'response',
  properties: 'properties',
  examples: 'examples',
} as const

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

export const REST_KIND_KEY = 'x-api-kind'

export const DEPRECATED_META_KEY = 'x-deprecated-meta'

export function isRestDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(REST_DOCUMENT_TYPE).includes(document.type as RestDocumentType)
}

export function isTextDocument(document: ResolvedVersionDocument): boolean {
  return Object.values(TEXT_DOCUMENT_TYPE).includes(document.type as TextDocumentType)
}
