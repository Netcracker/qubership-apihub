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

import { OpenAPIV3 } from 'openapi-types'
import { normalize, OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { isArray } from '@netcracker/qubership-apihub-json-crawl'

export const removeOasExtensions = (document: OpenAPIV3.Document, allowedOasExtensions?: OpenApiExtensionKey[]): OpenAPIV3.Document => {
  return normalize(
    document,
    {
      resolveRef: false,
      mergeAllOf: false,
      removeOasExtensions: isArray(allowedOasExtensions),
      shouldRemoveOasExtension: (key) => !allowedOasExtensions?.includes(key),
    },
  ) as OpenAPIV3.Document
}
