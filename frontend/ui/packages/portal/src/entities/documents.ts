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
import type { FileFormat } from './file-formats'
import { UNKNOWN_FILE_FORMAT } from './file-formats'
import type {
  OperationData,
  OperationDto,
  OperationsData,
  PackageRef,
  PackagesRefs,
  Tags,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { toPackageRef } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { getFileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import type { GraphQlOperationType } from '@netcracker/qubership-apihub-ui-shared/entities/graphql-operation-types'

export type DocumentsDto = Readonly<{
  documents: ReadonlyArray<DocumentDto>
  packages: PackagesRefs
}>

export type Documents = ReadonlyArray<Document>

export type Document = Readonly<{
  key: Key
  slug: Key
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

export function toDocument(value: DocumentDto, packagesRefs?: PackagesRefs): Document {
  return {
    key: value.fileId,
    slug: value.slug,
    title: value.title,
    type: value.type,
    format: value.format ?? getFileFormat(value.fileId),
    version: value.version,
    labels: value.labels,
    description: value.description,
    info: value.info,
    externalDocs: value.externalDocs,
    operations: value.operations?.map(
      operation => toOperation(operation, value.packages),
    ) ?? [],
    packageRef: toPackageRef(value.packageRef, packagesRefs),
  }
}

export function toDocuments(value: DocumentsDto): Documents {
  return value.documents.map((document) => toDocument(document, value.packages))
}

export const EMPTY_DOC: Document = {
  format: UNKNOWN_FILE_FORMAT,
  type: UNKNOWN_SPEC_TYPE,
  operations: [],
  key: '',
  title: '',
  slug: '',
}

export type RestMetaData = {
  path: string
  method: MethodType
  tags?: Readonly<Tags>
}

export type GraphQlMetaData = {
  method: string
  type: GraphQlOperationType
  tags?: Readonly<Tags>
}

export type ApiTypeMetadataDto = RestMetaData | GraphQlMetaData

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

export function toOperation(value: OperationDto, packagesRefs?: PackagesRefs): OperationData {
  const { ...operation } = value
  return {
    ...operation,
    operationKey: value.operationId,
    packageRef: toPackageRef(value.packageRef, packagesRefs),
    deprecated: value.deprecated ?? false,
  }
}

export type Labels = string[]
