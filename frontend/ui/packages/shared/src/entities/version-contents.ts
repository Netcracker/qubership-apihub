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

import type { VersionStatus } from './version-status'
import type { ChangesSummary } from './change-severities'
import type { PackagesRefs, Tags } from './operations'
import type { OperationGroup, OperationGroupWithApiTypeDto } from './operation-groups'
import type { Key, VersionKey } from './keys'
import type { Principal } from './principals'
import type { ApiType } from './api-types'
import type { ChangesSummaryDto } from './change-severities'
import type { ApiAudienceTransition } from '@netcracker/qubership-apihub-api-processor'

export type NumberOfImpactedOperations = ChangesSummaryDto

export type PackageVersionContent = Readonly<{
  key: Key
  version: Key
  packageKey: Key
  status: VersionStatus
  createdAt: string
  createdBy: Principal
  operationGroups: ReadonlyArray<OperationGroup>
  latestRevision: boolean
  previousVersion?: VersionKey
  previousVersionPackageId?: VersionKey
  versionLabels?: string[]
  operationTypes?: Record<ApiType, OperationTypeSummary>
  revisionsCount: number
}>

export type PackageVersionContentDto = Readonly<{
  version: Key
  packageId: Key
  status: VersionStatus
  createdAt: string
  createdBy: Principal
  operationGroups?: ReadonlyArray<OperationGroupWithApiTypeDto>
  previousVersion?: VersionKey
  previousVersionPackageId?: VersionKey
  versionLabels?: string[]
  operationTypes?: ReadonlyArray<OperationTypeSummaryDto>
  notLatestRevision?: boolean
  revisionsCount?: number
}>

export type OperationTypeSummary = Readonly<{
  apiType: ApiType
  changesSummary: ChangesSummary
  numberOfImpactedOperations: NumberOfImpactedOperations
  operationsCount: number
  deprecatedCount: number
  noBwcOperationsCount: number
  internalAudienceOperationsCount: number
  unknownAudienceOperationsCount: number
  apiAudienceTransitions: ApiAudienceTransition[]
  operations?: object
}>

export type OperationTypeSummaryDto = OperationTypeSummary

export type VersionDeprecatedSummaryDto = PackageDeprecatedSummaryDto | DashboardDeprecatedSummaryDto

export type VersionDeprecatedSummary = PackageDeprecatedSummary | DashboardDeprecatedSummary

export type DashboardDeprecatedSummaryDto = Readonly<{
  refs: RefDeprecatedSummaryDto[]
  packages: PackagesRefs
}>

export type RefDeprecatedSummaryDto = Readonly<{
  packageRef: Key
  operationTypes: ReadonlyArray<OperationTypeDeprecatedSummary> | undefined
}>

export type DashboardDeprecatedSummary = ReadonlyArray<RefDeprecatedSummary>

export type RefDeprecatedSummary = Readonly<{
  refKey?: Key
  operationTypes?: Record<ApiType, OperationTypeDeprecatedSummary>
}>

export type PackageDeprecatedSummaryDto = Readonly<{
  operationTypes: OperationTypeDeprecatedSummary[] | undefined
}>

export type PackageDeprecatedSummary = Readonly<{
  operationTypes?: Record<ApiType, OperationTypeDeprecatedSummary>
}>

export type OperationTypeDeprecatedSummary = Readonly<{
  apiType: ApiType
  deprecatedCount: string
  tags: Tags
}>

export function isDashboardDeprecatedSummaryDto(value: VersionDeprecatedSummaryDto): value is DashboardDeprecatedSummaryDto {
  return !!(value as DashboardDeprecatedSummaryDto)?.refs
}

export function isDashboardDeprecatedSummary(value: VersionDeprecatedSummary): value is DashboardDeprecatedSummary {
  return Array.isArray(value)
}
