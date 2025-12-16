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

import { OperationsApiType, PackageId, VersionId } from './types'
import { ChangeSummary } from './comparison'

export type VersionResolver = (
  packageId: PackageId,
  version: VersionId,
  includeOperations?: boolean,
) => Promise<ResolvedVersion | null>

export type ResolvedVersion = {
  previousVersion?: string
  previousVersionPackageId?: string
  operationTypes?: OperationTypes[]
  version: string
  apiProcessorVersion: string

  // other params (not used in builder logic)
  [key: string]: unknown
  // changeSummary?: object
  // operationSummary?: object
  // createdAt: string
  // createdBy: string
  // versionLabels?: string[]
}

export type OperationTypes = {
  apiType: OperationsApiType
  changesSummary?: ChangeSummary
  operationsCount?: number
  deprecatedCount?: number
}

export interface ResolvedVersionOperationsHashMap {
  [operationId: string]: string
}
