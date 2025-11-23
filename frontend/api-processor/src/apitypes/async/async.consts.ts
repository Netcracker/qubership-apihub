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

import { FILE_FORMAT_JSON, FILE_FORMAT_YAML } from '../../consts'
import { ResolvedVersionDocument, ZippableDocument } from '../../types'
import { API_KIND_KEY, DEPRECATED_META_KEY } from '../../utils/apihubSpecificationExtensions'

export const ASYNCAPI_API_TYPE = 'asyncapi' as const

export const ASYNC_SCOPES = {
  all: 'all',
  annotation: 'annotation',
  request: 'request',
  response: 'response',
  properties: 'properties',
  examples: 'examples',
} as const

// Only AsyncAPI 3.0 is supported
export const ASYNC_DOCUMENT_TYPE = {
  AAS3: 'asyncapi-3-0',
} as const

export const ASYNC_FILE_FORMAT = {
  YAML: FILE_FORMAT_YAML,
  JSON: FILE_FORMAT_JSON,
} as const

// Re-export shared constants for AsyncAPI
export const ASYNC_KIND_KEY = API_KIND_KEY
export { DEPRECATED_META_KEY }

export function isAsyncApiDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(ASYNC_DOCUMENT_TYPE).some(type => document.type === type)
}
