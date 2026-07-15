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
import { ChangeMessage, DdlChangesMetadata, DdlEntityDescriptor, DdlEntityId, NotificationMessage } from '../package'
import {
  _RawDocumentResolver,
  _VersionReferencesResolver,
  _VersionResolver,
  ApiBuilder,
  BuilderType,
} from './apiBuilder'
import { ObjectHashCache } from '../../utils/hashes'
import { VersionValidationLevel } from './builder'
import { ApihubApiCompatibilityKind, DDL_CONTRACT_TYPE } from '../../consts'

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

// ---- DDL comparison types (AD2) ----
// The DDL analogs of OperationChanges / OperationType / VersionsComparison. Fields are renamed per AD2:
// operationId → ddlEntityId, operationTypes → contractsChangesSummary (an object keyed by contract type,
// not an array), numberOfImpactedOperations → numberOfImpactedEntities. DDL drops `tags` +
// `apiAudienceTransitions`. The internal change carries the
// per-side id/descriptor flat (`ddlEntityId`/`metadata` + `previous*`); the DTO groups
// each side into a `ddlEntityData`/`previousDdlEntityData` object — see DdlChangesDto.

export interface DdlChanges<T extends DiffType | DiffTypeDto = DiffType> {
  ddlEntityId?: DdlEntityId
  previousDdlEntityId?: DdlEntityId
  changeSummary: ChangeSummary<T>
  impactedSummary: ImpactedOperationSummary // internal-only (drives numberOfImpactedEntities)
  // @deprecated. OOM problem
  diffs?: Diff[] // internal-only
  metadata?: DdlChangesMetadata
  previousMetadata?: DdlChangesMetadata
  comparisonInternalDocumentId?: string
}

// The data of one side of a DDL change: the entity's id and its descriptor
// (kind/name/schemaName/description). Self-contained so a change entry can carry current + previous sides.
// apiKind is not surfaced per DDL entity (not supported for DDL entities).
export interface DdlEntityChangeData extends DdlEntityDescriptor {
  ddlEntityId: DdlEntityId
}

// Serialized per-pair change (the elements of `ddl-comparisons/<comparisonFileId>`'s `entities` array).
// No `contractType` (redundant — the whole file is DDL). The current/previous sides are grouped into
// `ddlEntityData`/`previousDdlEntityData`: `ddlEntityData` is omitted for a pure remove, and
// `previousDdlEntityData` for a pure add.
export interface DdlChangesDto {
  ddlEntityData?: DdlEntityChangeData
  previousDdlEntityData?: DdlEntityChangeData
  changeSummary: ChangeSummary<DiffTypeDto>
  comparisonInternalDocumentId?: string
  changes?: ChangeMessage<DiffTypeDto>[]
}

// The change summary for one contract type within a comparison: the version-level change totals plus the
// number of impacted entities. Held under its contract-type key in `contractsChangesSummary`.
export interface DdlContractChangesSummary<T extends DiffType | DiffTypeDto = DiffType> {
  changesSummary: ChangeSummary<T>
  numberOfImpactedEntities: ChangeSummary<T>
}

// Per-contract change summaries, keyed by contract type (`ddl` — the only one today). Replaces the former
// `contractTypes` array; since the key already carries the contract type, the redundant `contractType`
// field is dropped. Empty (`{}`) when the comparison has no DDL content.
export type DdlContractsChangesSummary<T extends DiffType | DiffTypeDto = DiffType> =
  Partial<Record<typeof DDL_CONTRACT_TYPE, DdlContractChangesSummary<T>>>

export interface DdlComparison<T extends DiffType | DiffTypeDto = DiffType> {
  comparisonFileId?: string
  packageId: PackageId
  version: VersionId
  revision?: number
  previousVersion: VersionId
  previousVersionPackageId: PackageId
  previousVersionRevision?: number
  fromCache: boolean
  contractsChangesSummary: DdlContractsChangesSummary<T>
  data?: DdlChanges[]
  comparisonInternalDocuments: ComparisonInternalDocument[]
}

export interface DdlComparisonDto extends Omit<DdlComparison<DiffTypeDto>, 'data' | 'comparisonInternalDocuments'> {
  data?: DdlChangesDto[]
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
  apiProcessorVersionValidationLevel?: VersionValidationLevel
}

export type BuilderVersionInfo = {
  previousVersionBuilderVersion?: string
  currentVersionBuilderVersion?: string
}

export type CompareResult = {
  comparisons: VersionsComparison[]
  ddlComparisons: DdlComparison[]
} & BuilderVersionInfo
