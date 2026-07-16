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

import type { Labels } from './documents'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ApiKind, Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { ApiAudience } from '@netcracker/qubership-apihub-api-processor'

export type SearchResults = Readonly<{
  packages: PackageSearchResult[]
  operations: OperationSearchResult[]
  documents: DocumentSearchResult[]
}>

export type PackageSearchResult = Readonly<{
  packageKey: Key
  name: string
  description?: string
  serviceName?: string
  parentPackages: string[]
  version: Key
  status: VersionStatus
  createdAt: string
  labels?: Labels
}>

export interface OperationSearchResult extends Operation {
  packageKey: Key
  name: string
  description?: string
  serviceName?: string
  parentPackages: string[]
  version: Key
  status: VersionStatus
  operationKey: Key
  title: string
  deprecated: boolean
  apiType: ApiType
  path: string
  method?: MethodType
  type?: GraphQlOperationTypes
}

export type DocumentSearchResult = Readonly<{
  packageKey: Key
  name: string
  parentPackages: string[]
  version: Key
  status: VersionStatus
  slug: Key
  type: SpecType
  title: string
  labels?: Labels
  content?: string
  createdAt: string
}>

export type SearchResultsDto = Readonly<Partial<{
  packages: PackageSearchResultDto[]
  operations: OperationSearchResultDto[]
  documents: DocumentSearchResultDto[]
}>>

export type PackageSearchResultDto = Readonly<{
  packageId: Key
  name: string
  description?: string
  serviceName?: string
  parentPackages: string[]
  version: Key
  status: VersionStatus
  createdAt: string
  labels?: Labels
}>

export type OperationSearchResultDto = Readonly<{
  packageId: Key
  name: string
  parentPackages: string[]
  version: Key
  status: VersionStatus
  operationId: Key
  title: string
  deprecated?: boolean
  apiType: ApiType
  path: string
  method: MethodType
  apiAudience: ApiAudience
  documentId: Key
  apiKind: ApiKind
}>

export type DocumentSearchResultDto = Readonly<{
  packageId: Key
  name: string
  parentPackages: string[]
  version: Key
  status: VersionStatus
  slug: Key
  type: SpecType
  title: string
  labels?: Labels
  content?: string
  createdAt: string
}>

export const PACKAGE_LEVEL = 'packages'
export const OPERATION_LEVEL = 'operations'
export const DOCUMENT_LEVEL = 'documents'

export type Level =
  | typeof PACKAGE_LEVEL
  | typeof OPERATION_LEVEL
  | typeof DOCUMENT_LEVEL

export const QUERY_OPERATION_TYPES = 'query'
export const MUTATION_OPERATION_TYPES = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPES = 'subscription'

export type GraphQlOperationTypes =
  | typeof QUERY_OPERATION_TYPES
  | typeof MUTATION_OPERATION_TYPES
  | typeof SUBSCRIPTION_OPERATION_TYPES

export type SearchCriteria = {
  searchString: string
  packageIds?: Key[]
  versions?: Key[]
  status?: VersionStatus
  creationDateInterval?: {
    startDate: string
    endDate: string
  }
  apiType?: ApiType
}
