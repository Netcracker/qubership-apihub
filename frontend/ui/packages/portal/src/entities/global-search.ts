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
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

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

export type OperationSearchResult = Readonly<{
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
}>

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

export const REQUEST_SCOPE = 'request'
export const RESPONSE_SCOPE = 'response'

export const ARGUMENT_SCOPE = 'argument'
export const PROPERTY_SCOPE = 'property'
export const ANNOTATION_SCOPE = 'annotation'

export const PROPERTIES_AND_PARAMETER_DETAILED_SCOPE = 'Properties / Parameter'
export const PROPERTIES_DETAILED_SCOPE = 'properties'
export const ANNOTATION_DETAILED_SCOPE = 'annotation'
export const EXAMPLES_DETAILED_SCOPE = 'examples'

export const QUERY_OPERATION_TYPES = 'query'
export const MUTATION_OPERATION_TYPES = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPES = 'subscription'

export type RestScope =
  | typeof REQUEST_SCOPE
  | typeof RESPONSE_SCOPE

export type GraphqlScope =
  | typeof ARGUMENT_SCOPE
  | typeof PROPERTY_SCOPE
  | typeof ANNOTATION_SCOPE

export type Scopes = RestScope | GraphqlScope

export type RestDetailedScope =
  | typeof PROPERTIES_DETAILED_SCOPE
  | typeof ANNOTATION_DETAILED_SCOPE
  | typeof EXAMPLES_DETAILED_SCOPE

export type OptionRestDetailedScope =
  | typeof PROPERTIES_AND_PARAMETER_DETAILED_SCOPE
  | typeof ANNOTATION_DETAILED_SCOPE
  | typeof EXAMPLES_DETAILED_SCOPE

export type GraphQlOperationTypes =
  | typeof QUERY_OPERATION_TYPES
  | typeof MUTATION_OPERATION_TYPES
  | typeof SUBSCRIPTION_OPERATION_TYPES

export type SearchCriteria = {
  searchString: string
  packageIds?: Key[]
  versions?: Key[]
  statuses?: VersionStatus[]
  creationDateInterval?: {
    startDate: string
    endDate: string
  }
  operationParams?: SearchRestParams | SearchGQLParams
}

export type SearchRestParams = Partial<{
  apiType: ApiType
  scope: Scopes[]
  detailedScope: RestDetailedScope[]
  methods: MethodType[]
}>

export type SearchGQLParams = Partial<{
  apiType: ApiType
  scope: Scopes[]
  operationTypes: GraphQlOperationTypes[]
}>

export const REST_SCOPES: RestScope[] = [RESPONSE_SCOPE, REQUEST_SCOPE]
export const GRAPHQL_SCOPES: GraphqlScope[] = [ARGUMENT_SCOPE, PROPERTY_SCOPE, ANNOTATION_SCOPE]

export const API_TYPE_SCOPES_MAP: Record<ApiType, RestScope[] | GraphqlScope[]> = {
  [API_TYPE_REST]: REST_SCOPES,
  [API_TYPE_GRAPHQL]: GRAPHQL_SCOPES,
}

export const OPERATIONS_TYPES: GraphQlOperationTypes[] = [QUERY_OPERATION_TYPES, MUTATION_OPERATION_TYPES, SUBSCRIPTION_OPERATION_TYPES]

export const DETAILED_SCOPES: OptionRestDetailedScope[] = [PROPERTIES_AND_PARAMETER_DETAILED_SCOPE, ANNOTATION_DETAILED_SCOPE, EXAMPLES_DETAILED_SCOPE]

export const detailedScopeMapping: Record<OptionRestDetailedScope, RestDetailedScope> = {
  [PROPERTIES_AND_PARAMETER_DETAILED_SCOPE]: PROPERTIES_DETAILED_SCOPE,
  [ANNOTATION_DETAILED_SCOPE]: ANNOTATION_DETAILED_SCOPE,
  [EXAMPLES_DETAILED_SCOPE]: EXAMPLES_DETAILED_SCOPE,
}
