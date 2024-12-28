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

import { GRAPHQL_DOCUMENT_TYPE, GRAPHQL_SCOPES, GRAPHQL_TYPE } from './graphql.consts'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

import type { ApiOperation, NotificationMessage, VersionDocument } from '../../types'

export type GraphQLScopeType = keyof typeof GRAPHQL_SCOPES
export type GraphQLSchemaType = keyof typeof GRAPHQL_TYPE
export type GraphQLMethodType = (typeof GRAPHQL_TYPE)[GraphQLSchemaType]
export type GraphQLDocumentType = (typeof GRAPHQL_DOCUMENT_TYPE)[keyof typeof GRAPHQL_DOCUMENT_TYPE]

export interface GraphQLOperationMeta {
  type: GraphQLMethodType // query | mutation | subscription
  method: string // getQuote
}

export type VersionGraphQLDocument = VersionDocument<GraphApiSchema>

export type VersionGraphQLOperation = ApiOperation<GraphApiSchema, GraphQLOperationMeta>

export interface GraphQLRefCache {
  scopes: Record<GraphQLScopeType, string>
  refs: string[]
  data: any
}

export interface GraphQLOperationContext {
  operationId: string
  scopes: Record<GraphQLScopeType, string>
  operationData: GraphApiSchema
  document: VersionGraphQLDocument
  refsCache: Record<string, GraphQLRefCache>
  notifications: NotificationMessage[]
}
