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

import { Diff } from '@netcracker/qubership-apihub-api-diff'
import {
  ApiKind,
  BuildConfig,
  ChangeSummary,
  ImpactedOperationSummary,
  OperationType,
  PackageId,
  VersionComparisonResolver,
  VersionDeprecatedResolver,
  VersionId,
  VersionOperationsResolver,
} from '../external'
import { ChangeMessage, NotificationMessage } from '../package'
import { _VersionReferencesResolver, _VersionResolver, ApiBuilder, BuilderType } from './apiBuilder'

export type ChangeKind = keyof ChangeSummary

export type RestChangesMetadata = {
  method: string // post | get | patch | ...
  path: string // /api/v2/methods/method
}

export type GraphQLChangesMetadata = {
  type: string // query | mutation | subscription
  method: string // getQuote
}

export type OperationChangesMetadata = {
  title: string
  tags: string[]
  previousOperationMetadata?: OperationChangesMetadata
} & Partial<RestChangesMetadata> & Partial<GraphQLChangesMetadata>

export interface OperationChanges {
  operationId: string
  apiType: BuilderType
  apiKind?: ApiKind
  previousApiKind?: ApiKind
  dataHash?: string
  previousDataHash?: string
  changeSummary: ChangeSummary
  impactedSummary: ImpactedOperationSummary
  // @deprecated. OOM problem
  diffs?: Diff[] 
  metadata?: OperationChangesMetadata & {
    [key: string]: unknown
  }
}

export interface OperationChangesDto extends Omit<OperationChanges, 'diffs' | 'impactedSummary' | 'mergedJso'> {
  changes?: ChangeMessage[]
}

export interface VersionsComparison {
  comparisonFileId?: string
  packageId: PackageId
  version: VersionId
  revision?: number
  previousVersion: VersionId
  previousVersionPackageId: PackageId
  previousVersionRevision?: number
  fromCache: boolean
  operationTypes: OperationType[]
  data?: OperationChanges[]
}

export interface VersionsComparisonDto extends Omit<VersionsComparison, 'data'> {
  data?: OperationChangesDto[]
}

export interface CompareContext {
  apiBuilders: ApiBuilder[]
  batchSize?: number
  config: BuildConfig
  notifications: NotificationMessage[]
  versionResolver: _VersionResolver
  versionOperationsResolver: VersionOperationsResolver
  versionReferencesResolver: _VersionReferencesResolver
  versionComparisonResolver: VersionComparisonResolver
  versionDeprecatedResolver: VersionDeprecatedResolver
}
