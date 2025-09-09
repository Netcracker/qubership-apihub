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

import type { FileKey, Key } from './keys'
import type { OperationDto, OperationsData, PackageRef, PackagesRefs } from './operations'
import type { SpecType } from '../utils/specs'

export type DocumentsDto = Readonly<{
  documents: ReadonlyArray<DocumentDto>
  packages: PackagesRefs
}>

export type Documents = ReadonlyArray<Document>

export type Document = Readonly<{
  key: Key
  slug: Key
  filename: string
  title: string
  type: SpecType
  format: FileFormat
  version?: string
  labels?: Labels
  description?: string
  info?: Readonly<DocumentInfo>
  externalDocs?: Readonly<ExternalDocsLink>
  operations: OperationsData
  packageRef?: PackageRef
}>

export type DocumentDto = Readonly<{
  fileId: FileKey
  slug: Key
  filename: string
  title: string
  type: SpecType
  format: FileFormat
  version?: string
  labels?: Labels
  description?: string
  info?: Readonly<DocumentInfo>
  externalDocs?: Readonly<ExternalDocsLink>
  operations?: ReadonlyArray<OperationDto>
  packages?: PackagesRefs // For operations
  packageRef?: string // For dashboards
}>

export type DocumentInfo = {
  contact?: Readonly<DocLink & { email?: string }>
  license?: Readonly<DocLink>
  termsOfService?: string
}

export type DocLink = {
  name?: string
  url?: string
}

export type ExternalDocsLink = Omit<DocLink, 'name'> & { description?: string }

export type Labels = string[]

export const JSON_FILE_FORMAT = 'json'
export const YAML_FILE_FORMAT = 'yaml'
export const MD_FILE_FORMAT = 'md'
export const UNKNOWN_FILE_FORMAT = 'unknown'

export type FileFormat =
  | typeof JSON_FILE_FORMAT
  | typeof YAML_FILE_FORMAT
  | typeof MD_FILE_FORMAT
  | typeof UNKNOWN_FILE_FORMAT
