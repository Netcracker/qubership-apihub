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

import { DDL_API_NORMALIZE_OPTIONS, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { KeyOfConstType, ResolvedVersionDocument, ZippableDocument } from '../../types'
import { FILE_FORMAT_DDL, FILE_FORMAT_SQL, ORIGINS_SYMBOL } from '../../consts'

// DDL has a single document type; `kind` (table) is per entity, not per document (AD5).
export const DDL_DOCUMENT_TYPE = {
  DDL: 'ddl',
} as const

export type DdlDocumentType = KeyOfConstType<typeof DDL_DOCUMENT_TYPE>

export function isDdlDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(DDL_DOCUMENT_TYPE).some(type => document.type === type)
}

// File extensions the DDL parser claims (detection is by extension — AD5).
export const DDL_FILE_EXTENSIONS = [FILE_FORMAT_SQL, FILE_FORMAT_DDL] as const

export type DdlFileExtension = typeof DDL_FILE_EXTENSIONS[number]

/** Type guard narrowing a raw extension to a `DdlFileExtension` (a subset of `FileFormat`). */
export const isDdlFileExtension = (extension: string): extension is DdlFileExtension =>
  DDL_FILE_EXTENSIONS.some(value => value === extension)

// Normalize options for the DDL internal/comparison documents (AD3, Task 3). The DDL base options plus
// `originsFlag` only: the unifier's DDL rules consult origins, but `hashFlag`/`syntheticTitleFlag` are
// JSON-Schema concerns (REST/async) and do nothing for DDL, so they are intentionally omitted.
export const DDL_EFFECTIVE_NORMALIZE_OPTIONS: NormalizeOptions = {
  ...DDL_API_NORMALIZE_OPTIONS,
  originsFlag: ORIGINS_SYMBOL,
}
