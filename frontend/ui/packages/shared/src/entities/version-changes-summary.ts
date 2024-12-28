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

import type { OperationType } from '@netcracker/qubership-apihub-api-processor'
import type { PackageRef, PackagesRefs } from './operations'
import { toPackageRef } from './operations'
import { EMPTY_CHANGE_SUMMARY } from './version-changelog'
import type { VersionStatus } from './version-status'
import type { Key } from './keys'
import { hasNoChangesInSummary } from '../utils/change-severities'

export type VersionChangesSummaryDto = PackageComparisonSummaryDto | DashboardComparisonSummaryDto
export type VersionChangesSummary = PackageComparisonSummary | DashboardComparisonSummary

export type DashboardComparisonSummaryDto = Readonly<{
  refs: ReadonlyArray<RefComparisonSummaryDto>
  packages: PackagesRefs
}>

export type RefComparisonSummaryDto = Readonly<{
  packageRef?: string
  previousPackageRef?: string
  operationTypes: ReadonlyArray<OperationType>
  noContent?: boolean
}>

export type RefComparisonSummary = Readonly<{
  refKey?: Key
  version?: Key
  latestRevision: boolean
  previousVersion?: Key
  status?: VersionStatus
  previousStatus?: VersionStatus
  name: string
  operationTypes: ReadonlyArray<OperationType>
  parentPackages?: ReadonlyArray<string>
  packageRef?: PackageRef
  previousPackageRef?: PackageRef
  noContent?: boolean
}>

export type DashboardComparisonSummary = ReadonlyArray<RefComparisonSummary>

export type PackageComparisonSummaryDto = Readonly<{
  operationTypes: ReadonlyArray<OperationType>
  noContent?: boolean
}>

export type PackageComparisonSummary = PackageComparisonSummaryDto

const UNDEFINED_NAME = 'UNDEFINED NAME'

export function isPackageComparisonSummary(value: VersionChangesSummary): value is PackageComparisonSummary {
  return !!(value as PackageComparisonSummary)?.operationTypes
}

export function isDashboardComparisonSummary(value: VersionChangesSummary): value is DashboardComparisonSummary {
  return Array.isArray(value)
}

function isDashboardSummaryDto(value: VersionChangesSummaryDto): value is DashboardComparisonSummaryDto {
  return !!(value as DashboardComparisonSummaryDto)?.refs
}

export function toVersionChangesSummary(value: VersionChangesSummaryDto): VersionChangesSummary {
  if (isDashboardSummaryDto(value)) {
    return value.refs.map((ref) => {
      const changedPackage = toPackageRef(ref.packageRef, value.packages)
      const originalPackage = toPackageRef(ref.previousPackageRef, value.packages)
      return {
        refKey: changedPackage?.refId || originalPackage?.refId,
        name: changedPackage?.name ?? originalPackage?.name ?? UNDEFINED_NAME,
        version: changedPackage?.version,
        previousVersion: originalPackage?.version,
        status: changedPackage?.status as VersionStatus,
        previousStatus: originalPackage?.status as VersionStatus,
        operationTypes: ref.operationTypes,
        parentPackages: changedPackage?.parentPackages ?? originalPackage?.parentPackages ?? [],
        packageRef: changedPackage,
        previousPackageRef: originalPackage,
        noContent: ref.noContent,
        latestRevision: changedPackage?.latestRevision ?? true,
      }
    })
  } else {
    return value
  }
}

export function hasNoContent(value: VersionChangesSummary): boolean {
  if (isPackageComparisonSummary(value)) {
    return !!value.noContent
  }
  if (isDashboardComparisonSummary(value)) {
    const refs = (value ?? []) as DashboardComparisonSummary
    return refs
      .map((ref: RefComparisonSummary) => !!ref.noContent)
      .reduce((previous, current) => previous || current, false)
  }
  return false
}

export function hasNoVersionChanges(value: VersionChangesSummary): boolean {
  if (isPackageComparisonSummary(value)) {
    const checkedChangesAbsence = value.operationTypes.map(hasNoChangesForOperationType)
    return !checkedChangesAbsence.length || checkedChangesAbsence.reduce((prev, curr) => prev && curr, true)
  }
  if (isDashboardComparisonSummary(value)) {
    const refs = (value ?? []) as DashboardComparisonSummary
    const checkedChangesAbsence = refs.map(ref => {
      const checkedChangesAbsenceForRef = ref.operationTypes.map(hasNoChangesForOperationType)
      return !checkedChangesAbsenceForRef.length || checkedChangesAbsenceForRef.reduce((prev, curr) => prev && curr, true)
    })
    return !checkedChangesAbsence.length || checkedChangesAbsence.reduce((prev, curr) => prev && curr, true)
  }
  return true
}

function hasNoChangesForOperationType(item: OperationType): boolean {
  return hasNoChangesInSummary(item.numberOfImpactedOperations ?? EMPTY_CHANGE_SUMMARY)
}
