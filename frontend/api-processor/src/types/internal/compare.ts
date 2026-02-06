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

import { Diff, DiffType } from '@netcracker/qubership-apihub-api-diff'
import {
  BuildConfig,
  ChangeSummary,
  DiffTypeDto,
  ImpactedOperationSummary,
  OperationType,
  PackageId,
  VersionComparisonResolver,
  VersionDeprecatedResolver,
  VersionDocumentsResolver,
  VersionId,
  VersionOperationsResolver,
} from '../external'
import { ChangeMessage, NotificationMessage } from '../package'
import {
  _RawDocumentResolver,
  _VersionReferencesResolver,
  _VersionResolver,
  ApiBuilder,
  BuilderType,
} from './apiBuilder'
import { ObjectHashCache } from '../../utils/hashes'
import { ApihubApiCompatibilityKind } from '../../consts'

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
} & Partial<RestChangesMetadata> & Partial<GraphQLChangesMetadata>

export interface OperationChanges<T extends DiffType | DiffTypeDto = DiffType> {
  operationId?: string
  previousOperationId?: string
  apiType: BuilderType
  apiKind?: ApihubApiCompatibilityKind
  previousApiKind?: ApihubApiCompatibilityKind
  changeSummary: ChangeSummary<T>
  impactedSummary: ImpactedOperationSummary
  // @deprecated. OOM problem
  diffs?: Diff[]
  metadata?: OperationChangesMetadata & {
    [key: string]: unknown
  }
  previousMetadata?: OperationChangesMetadata & {
    [key: string]: unknown
  }
  comparisonInternalDocumentId?: string
}

export interface OperationChangesDto extends Omit<OperationChanges<DiffTypeDto>, 'diffs' | 'impactedSummary' | 'mergedJso'> {
  changes?: ChangeMessage<DiffTypeDto>[]
}

export type ComparisonDocument = {
  comparisonDocumentId: string
  serializedComparisonDocument: string
}

export type ComparisonInternalDocument = ComparisonDocument & {
  comparisonFileId: string
}

export interface VersionsComparison<T extends DiffType | DiffTypeDto = DiffType> {
  comparisonFileId?: string
  packageId: PackageId
  version: VersionId
  revision?: number
  previousVersion: VersionId
  previousVersionPackageId: PackageId
  previousVersionRevision?: number
  fromCache: boolean
  operationTypes: OperationType<T>[]
  data?: OperationChanges[]
  comparisonInternalDocuments: ComparisonInternalDocument[]
}

export interface VersionsComparisonDto extends Omit<VersionsComparison<DiffTypeDto>, 'data' | 'comparisonInternalDocuments'> {
  data?: OperationChangesDto[]
}

export type InternalDocumentMetadata = {
  id: string
  filename: string
}

export type ComparisonInternalDocumentMetadata = InternalDocumentMetadata & { comparisonFileId: string }

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
  versionDocumentsResolver: VersionDocumentsResolver
  rawDocumentResolver: _RawDocumentResolver
  normalizedSpecFragmentsHashCache: ObjectHashCache
}
