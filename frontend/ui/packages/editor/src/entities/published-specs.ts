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

import type { FileKey, Key, VersionKey } from './keys'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { getFileFormat, UNKNOWN_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'

export type PublishedSpec = Readonly<{
  key: Key
  slug: Key
  title: string
  type: SpecType
  format: FileFormat
  labels?: string[]
  openApiDetails?: OpenApiObject
}>

export type PublishedSpecDto = Readonly<{
  fileId: FileKey
  slug: Key
  title: string
  type: SpecType
  format?: FileFormat
  labels?: string[]
  openAPI?: OpenApiObject
}>

export function toPublishedSpec(value: PublishedSpecDto): PublishedSpec {
  return {
    key: value.fileId,
    slug: value.slug,
    title: value.title,
    type: value.type,
    format: value.format ?? getFileFormat(value.fileId),
    labels: value.labels,
    openApiDetails: value.openAPI,
  }
}

export type OpenApiObject = {
  title: string
  description?: string
  version: VersionKey
  operations: ReadonlyArray<OpenApiOperation>
}

export type OpenApiOperation = {
  path: string
  method: MethodType
  title: string
  tags: string[]
}

export const EMPTY_SPEC: PublishedSpec = {
  format: UNKNOWN_FILE_FORMAT,
  type: UNKNOWN_SPEC_TYPE,
  key: '',
  title: '',
  slug: '',
}
