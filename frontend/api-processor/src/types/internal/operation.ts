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

import { DeprecateItem, OperationsApiType } from '../external'
import { ApiAudience } from '../package'
import { OpenAPIV3 } from 'openapi-types'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { ApihubApiCompatibilityKind } from '../../consts'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

export interface OperationSearch {
  useOperationDataAsSearchText: boolean
  searchTextFilePath?: string
}

export interface ApiOperation<T = any, M = any> {
  operationId: string
  documentId: string
  apiType: OperationsApiType
  apiKind: ApihubApiCompatibilityKind
  deprecated: boolean
  tags: string[]
  metadata: M
  data?: T

  // new properties
  deprecatedItems?: DeprecateItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
  models?: Record<string, string>       // schema models { name: hash }

  // other params (not used in builder logic)
  // [key: string]: unknown

  title: string
  search: OperationSearch
  searchText?: string
  // refPackage?: PackageRef
  // changes?: OperationChanges[]
  // changeSummary?: ChangeSummary
  hasExample?: boolean
  apiAudience?: ApiAudience
  versionInternalDocumentId: string
}

/**
 * Operation fields a diff of the two documents that derived it cannot see: both come from the document `info`
 * (`apiKind` also from a build label), and `info` is never attributed to an operation. Add a field only after
 * checking that the diff misses it.
 */
export type ComparedOperationFields = Pick<ApiOperation, 'apiKind' | 'apiAudience'>

/**
 * The part of each derived operation a document keeps, to grade collisions once the operations are gone: the index
 * keeps only the winner of each id.
 */
export type OperationClaim = Pick<ApiOperation, 'operationId' | 'apiType'> & ComparedOperationFields

// `Realm` is included so the DDL version-internal / comparison documents serialize through the same
// `serializeDocument` / `denormalize` path as REST (AD3; plan Tasks 3 & 8).
export type ApiDocument = OpenAPIV3.Document | GraphApiSchema | AsyncAPIV3.AsyncAPIObject | Realm
