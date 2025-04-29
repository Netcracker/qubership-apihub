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

import {
  API_AUDIENCE_EXTERNAL,
  API_AUDIENCE_INTERNAL,
  API_AUDIENCE_UNKNOWN,
  GRAPHQL_API_TYPE,
  ResolvedOperation,
  REST_API_TYPE,
  ApiKind as ApiKindFromProcessor,
  ApiAudience as ApiAudienceFromProcessor,
} from '@netcracker/qubership-apihub-api-processor'

export type OperationsDto = Readonly<{
  operations: ReadonlyArray<OperationDto>
  // todo
  // packages: PackagesRefs
}>
export type OperationDto = RestOperationDto | GraphQlOperationDto

export const EMPTY_OPERATIONS: OperationsDto = {
  operations: []
}

export const API_TYPE_REST = REST_API_TYPE
export const API_TYPE_GRAPHQL = GRAPHQL_API_TYPE

export type ApiType =
  | typeof API_TYPE_REST
  | typeof API_TYPE_GRAPHQL

export const ALL_API_KIND = 'all'
export const BWC_API_KIND = 'bwc'
export const NO_BWC_API_KIND = 'no-bwc'
export const EXPERIMENTAL_API_KIND = 'experimental'

export type ApiKind =
  | typeof ALL_API_KIND
  | typeof BWC_API_KIND
  | typeof NO_BWC_API_KIND
  | typeof EXPERIMENTAL_API_KIND

export const API_AUDIENCE_ALL = 'all'

export type ApiAudience =
  | typeof API_AUDIENCE_INTERNAL
  | typeof API_AUDIENCE_EXTERNAL
  | typeof API_AUDIENCE_UNKNOWN
  | typeof API_AUDIENCE_ALL

export type Tags = readonly string[]

export type CustomTags = { [key: string]: object }

export const GET_METHOD_TYPE = 'get'
export const POST_METHOD_TYPE = 'post'
export const PUT_METHOD_TYPE = 'put'
export const PATCH_METHOD_TYPE = 'patch'
export const DELETE_METHOD_TYPE = 'delete'

export type MethodType =
  | typeof GET_METHOD_TYPE
  | typeof POST_METHOD_TYPE
  | typeof PUT_METHOD_TYPE
  | typeof PATCH_METHOD_TYPE
  | typeof DELETE_METHOD_TYPE

export const QUERY_OPERATION_TYPE = 'query'
export const MUTATION_OPERATION_TYPE = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPE = 'subscription'

export type GraphQlOperationType =
  | typeof QUERY_OPERATION_TYPE
  | typeof MUTATION_OPERATION_TYPE
  | typeof SUBSCRIPTION_OPERATION_TYPE

export type OperationMetadataDto = Readonly<{
  operationId: string
  title: string
  apiType: ApiType
  apiKind: ApiKind
  apiAudience: ApiAudience
  data?: object
  packageRef?: string
  dataHash: string
  deprecated?: boolean
  tags?: Readonly<Tags>
  customTags?: CustomTags
}>

export type RestOperationDto = OperationMetadataDto & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperationDto = OperationMetadataDto & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export function isRestOperationDto(operation: OperationDto): operation is RestOperationDto {
  const asRestOperation = (operation as RestOperationDto)
  return asRestOperation.path !== undefined
}

export function toVersionOperation(value: OperationDto): ResolvedOperation {
  const metadata = isRestOperationDto(value)
    ? {
      tags: value.tags,
      method: value.method,
      path: value.path,
    }
    : {
      tags: value.tags,
      method: value.method,
      type: value.type,
    }
  return {
    apiType: value.apiType,
    operationId: value.operationId,
    data: value.data!,
    dataHash: value.dataHash,
    // todo why cast?
    apiKind: value.apiKind as ApiKindFromProcessor,
    // todo why cast?
    apiAudience: value.apiAudience as ApiAudienceFromProcessor,
    deprecated: value.deprecated ?? false,
    title: value.title,
    metadata: metadata,
  }
}
