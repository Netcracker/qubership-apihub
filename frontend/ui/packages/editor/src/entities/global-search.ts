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

import type { Key, VersionKey } from './keys'

import type { Group, GroupDto } from './groups'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'

export type SearchResults = Readonly<{
  packages: PackageSearchResult[]
  versions: VersionSearchResult[]
  documents: DocumentSearchResult[]
}>

export type PackageSearchResult = Readonly<{
  key: Key
  name: string
  description: string
  parentPackages: Group[]
}>

export type VersionSearchResult = Readonly<{
  key: Key
  name: string
  parentPackages: Group[]
  version: VersionKey
  status: VersionStatus
  publishedAt: string
  files: FileResult[]
}>

export type DocumentSearchResult = Readonly<{
  key: Key
  name: string
  parentPackages: Group[]
  version: VersionKey
  status: VersionStatus
  publishedAt: string
  files: FileResult[]
}>

// TODO: Remove partial when BE will be ready
export type SearchResultsDto = Readonly<Partial<{
  packages: PackageSearchResultDto[]
  versions: VersionSearchResultDto[]
  documents: DocumentSearchResultDto[]
}>>

export type PackageSearchResultDto = Readonly<{
  packageId: string
  name: string
  description: string
  parentPackages: GroupDto[]
}>

export type VersionSearchResultDto = Readonly<{
  packageId: string
  name: string
  parentPackages: GroupDto[]
  version: string
  status: VersionStatus
  publishedAt: string
  files: FileResultDto[]
}>

export type DocumentSearchResultDto = Readonly<{
  packageId: string
  name: string
  parentPackages: GroupDto[]
  version: string
  status: VersionStatus
  publishedAt: string
  files: FileResultDto[]
}>

export type FileResult = Readonly<{
  key: Key
  title: string
  slug: string
  type: SpecType
  labels: string[]
  format: FileFormat
}>

export type FileResultDto = Readonly<{
  fileId: string
  title: string
  slug: string
  type: SpecType
  labels: string[]
  format: FileFormat
}>

// TODO: Use when BE provide file content to search results
export type MarkdownResult = Readonly<{
  package: PackageResult
  version: VersionResult
  file: FileResult
  data: MarkdownData[]
}>

export type OpenApiResult = Readonly<{
  package: PackageResult
  version: VersionResult
  file: FileResult
  endpoints: EndpointResult[]
  schemas: SchemaResult[]
  overview: OverviewResult
}>

export type JsonSchemaResult = Readonly<{
  package: PackageResult
  version: VersionResult
  file: FileResult
  schema: ComponentResult
}>

export type MarkdownResultDto = Readonly<{
  package: PackageResultDto
  version: VersionResultDto
  file: FileResultDto
  data: MarkdownData[]
}>

export type OpenApiResultDto = Readonly<{
  package: PackageResultDto
  version: VersionResultDto
  file: FileResultDto
  endpoints: EndpointResultDto[]
  schemas: SchemaResultDto[]
  overview: OverviewResultDto
}>

export type JsonSchemaResultDto = Readonly<{
  package: PackageResultDto
  version: VersionResultDto
  file: FileResultDto
  schema: ComponentResultDto
  data: {
    path: string
    text: string
  }
}>

export type PackageResult = Readonly<{
  key: Key
  name: string
  parentGroups: string[]
}>

export type VersionResult = VersionResultDto

export type EndpointResult = EndpointResultDto
export type SchemaResult = SchemaResultDto
export type ComponentResult = ComponentResultDto
export type OverviewResult = OverviewResultDto

export type PackageResultDto = Readonly<{
  id: Key
  name: string
  parentGroups: string[]
}>

export type VersionResultDto = Readonly<{
  version: string
  status: VersionStatus
  publishedAt: string
}>

export type EndpointResultDto = Readonly<{
  name: string
  type: MethodType
  path: string
  href: string
  data: OpenApiData[]
}>

export type SchemaResultDto = Readonly<{
  name: string
  href: string
  text: string
}>

export type ComponentResultDto = Readonly<{
  name: string
}>

export type OpenApiData = {
  path: string
  text: string
}

export type OverviewResultDto = Readonly<{
  name: string //TODO: Always Overview?
  text: string
}>

export type MarkdownData = {
  line: number
  text: string
}

export const PACKAGE_LEVEL = 'package'
export const VERSION_LEVEL = 'version'
export const DOCUMENT_LEVEL = 'document'

export type Level =
  | typeof PACKAGE_LEVEL
  | typeof VERSION_LEVEL
  | typeof DOCUMENT_LEVEL

export type SearchCriteria = {
  searchLevel: Level
  searchString: string
  packageIds?: Key[]
  versions?: string[]
  statuses?: VersionStatus[]
  publicationDateInterval?: {
    startDate: string
    endDate: string
  }
}
