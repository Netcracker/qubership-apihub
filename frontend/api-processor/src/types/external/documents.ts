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

import { ApihubApiCompatibilityKind } from '../../consts'
import { FileFormat } from '../internal'
import { ResolvedReferenceMap } from './references'
import { FileId, OperationsApiType, PackageId, TemplatePath, VersionId } from './types'

export type ResolvedDocument = {
  fileId: string
  filename: string
  slug: string
  type: string
  format: FileFormat
  title: string
  version?: string
  labels?: Labels
}

export type VersionDocumentsResolver = (
  version: VersionId,
  packageId: PackageId,
  apiType?: OperationsApiType,
) => Promise<ResolvedVersionDocuments | null>

export type ResolvedVersionDocuments = {
  documents: ReadonlyArray<ResolvedVersionDocument>
  packages: ResolvedReferenceMap
}

export type ResolvedVersionDocument = ResolvedDocument & {
  packageRef?: string
  apiKind?: ApihubApiCompatibilityKind
  shareabilityStatus?: ShareabilityStatus
}

export type Labels = string[]

export type GroupDocumentsResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  filterByOperationGroup: string,
) => Promise<ResolvedGroupDocuments | null>

export type ResolvedGroupDocuments = {
  documents: ReadonlyArray<ResolvedGroupDocument>
  packages: ResolvedReferenceMap
}

export type ResolvedGroupDocument = ResolvedDocument & {
  includedOperationIds?: string[]
  data?: string
  packageRef?: string
  description: string
}

export type RawDocumentResolver = (
  version: VersionId,
  packageId: PackageId,
  slug: string,
) => Promise<File | null>

export type FileResolver = (fileId: FileId) => Promise<Blob | null>

export type TemplateResolver = (templatePath: TemplatePath) => Promise<Blob | null>

export const SHAREABILITY_STATUS_SHAREABLE = 'shareable' as const
export const SHAREABILITY_STATUS_NON_SHAREABLE = 'non-shareable' as const
export const SHAREABILITY_STATUS_UNKNOWN = 'unknown' as const

export const SHAREABILITY_STATUSES = [
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
] as const

export type ShareabilityStatus = (typeof SHAREABILITY_STATUSES)[number]
