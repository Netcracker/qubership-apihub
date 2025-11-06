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

import { ApiKind, OperationId, OperationsApiType } from '../external'
import { PackageDeprecatedItem } from './deprecated'

export type PackageOperations = {
  operations: PackageOperation[]
}

export interface PackageOperation {
  operationId: OperationId
  documentId: string
  title: string
  apiType: OperationsApiType
  deprecated: boolean
  apiKind: ApiKind
  metadata: RestMetadata | GraphQLMetaData
  searchScopes: Record<string, string>
  tags: string[]

  // new properties
  deprecatedItems?: PackageDeprecatedItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
  models?: Record<string, string>       // schema models { name: hash }
  apiAudience?: ApiAudience
  versionInternalDocumentId?: string
}

export interface RestMetadata {
  path: string
  method: string
  tags: string[]
  title: string
}

export interface GraphQLMetaData {
  type: string
  method: string
  title: string
  tags?: string[]
}

export const API_AUDIENCE_INTERNAL = 'internal'
export const API_AUDIENCE_EXTERNAL = 'external'
export const API_AUDIENCE_UNKNOWN = 'unknown'
export type ApiAudience = typeof API_AUDIENCE_INTERNAL | typeof API_AUDIENCE_EXTERNAL | typeof API_AUDIENCE_UNKNOWN
