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
export function normalizeOpenApiDocument(operation: unknown, source?: unknown): OpenAPIV3.Document {
  const normalizedDocument = normalize(operation, {
    source: source,
    ...NORMALIZE_OPTIONS,
  })
  return denormalize(normalizedDocument, NORMALIZE_OPTIONS) as OpenAPIV3.Document
}
