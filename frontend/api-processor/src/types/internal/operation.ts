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

import { ApiKind, DeprecateItem, OperationsApiType } from '../external'
import { ApiAudience } from '../package'

export type SearchScopes<T extends string = string> = Record<T, Set<string>>

export interface ApiOperation<T = any, M = any> {
  operationId: string
  documentId: string
  apiType: OperationsApiType
  apiKind: ApiKind
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
  searchScopes: SearchScopes
  // refPackage?: PackageRef
  // changes?: OperationChanges[]
  // changeSummary?: ChangeSummary
  hasExample?: boolean
  apiAudience?: ApiAudience
  versionInternalDocumentId?: string
}
