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

import { KeyOfConstType, OperationId, OperationsApiType, PackageId, VersionId } from './types'
import { DeprecateItem } from './deprecated'
import { API_KIND } from '../../consts'
import { ApiAudience } from '../package'

export type ApiKind = KeyOfConstType<typeof API_KIND>

export type VersionOperationsResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  operationsIds?: OperationId[],
  includeData?: boolean,
) => Promise<ResolvedOperations | null>

export interface ResolvedOperations {
  operations: ResolvedOperation[]
  // packages: Record<string, PackageData>
}

export interface ResolvedOperation<M = any> {
  operationId: OperationId
  documentId: string
  title: string
  apiType: OperationsApiType
  apiKind: ApiKind
  deprecated: boolean
  metadata: M // TODO: align with contract
  data?: unknown
  tags?: string[]

  // new properties
  deprecatedItems?: DeprecateItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
  models?: Record<string, string>       // schema models { name: hash }

  // other params (not used in builder logic)
  // [key: string]: unknown

  // searchScopes?: object
  // refPackage?: PackageRef
  // changes?: OperationChanges[]
  // changeSummary?: ChangeSummary
  apiAudience?: ApiAudience
}
