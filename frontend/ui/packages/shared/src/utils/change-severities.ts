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

import { isEmpty } from './arrays'
import type { ChangeSummary } from '@netcracker/qubership-apihub-api-processor'
import type { ChangeSeverity, ChangesSummary } from '../entities/change-severities'
import {
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  DEPRECATED_CHANGE_SEVERITY,
  NON_BREAKING_CHANGE_SEVERITY,
  SEMI_BREAKING_CHANGE_SEVERITY,
  UNCLASSIFIED_CHANGE_SEVERITY,
} from '../entities/change-severities'
import type { StatusMarkerVariant } from '../components/StatusMarker'
import {
  ERROR_STATUS_MARKER_VARIANT,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '../components/StatusMarker'
import type { PackageSummary } from '../entities/packages'

export function countVersionDifferences(
  changes: ChangesSummary | undefined,
): number {
  let totalAmount = 0
  changes && Object.values(changes).forEach(changesAmount => (totalAmount += changesAmount))
  return totalAmount
}

export function countVersionDifferencesBySeverity(
  changes: ChangesSummary | undefined,
  changeSeverity: ChangeSeverity,
): number {
  if (!changes) {
    return 0
  }

  if (changeSeverity === BREAKING_CHANGE_SEVERITY) {
    return changes.breaking
  }
  if (changeSeverity === SEMI_BREAKING_CHANGE_SEVERITY) {
    return changes[SEMI_BREAKING_CHANGE_SEVERITY]
  }
  if (changeSeverity === DEPRECATED_CHANGE_SEVERITY) {
    return changes.deprecated
  }
  if (changeSeverity === NON_BREAKING_CHANGE_SEVERITY) {
    return changes[NON_BREAKING_CHANGE_SEVERITY]
  }
  if (changeSeverity === ANNOTATION_CHANGE_SEVERITY) {
    return changes.annotation
  }
  if (changeSeverity === UNCLASSIFIED_CHANGE_SEVERITY) {
    return changes.unclassified
  }
  return 0
}

export function filterChangesBySeverity(filters: ChangeSeverity[], changes: ChangesSummary | undefined): boolean {
  return isEmpty(filters) || !!filters.find((filterItem => countVersionDifferencesBySeverity(changes, filterItem) !== 0))
}

export function getMajorSeverity(changes: ChangeSummary): ChangeSeverity {
  if (changes.breaking) {
    return BREAKING_CHANGE_SEVERITY
  }
  if (changes[SEMI_BREAKING_CHANGE_SEVERITY]) {
    return SEMI_BREAKING_CHANGE_SEVERITY
  }
  if (changes.deprecated) {
    return DEPRECATED_CHANGE_SEVERITY
  }
  if (changes[NON_BREAKING_CHANGE_SEVERITY]) {
    return NON_BREAKING_CHANGE_SEVERITY
  }
  if (changes.annotation) {
    return ANNOTATION_CHANGE_SEVERITY
  }
  return UNCLASSIFIED_CHANGE_SEVERITY
}

export function hasNoChangesInSummary(changes: ChangesSummary): boolean {
  return countVersionDifferences(changes) === 0
}

// TODO: Copy-pasted from countVersionDifferences - correct types
export function hasNoChangesInSummaryRecord(changes: Record<ChangeSeverity, number>): boolean {
  let totalAmount = 0
  changes && Object.values(changes).forEach(changesAmount => (totalAmount += changesAmount))
  return totalAmount === 0
}

export type BwcData = {
  type: StatusMarkerVariant
  count: number
} | null

export function getBwcData(summary: PackageSummary | undefined): BwcData {
  if (!summary) {
    return null
  }

  const breakingChanges = summary[BREAKING_CHANGE_SEVERITY] || 0
  const totalChanges = Object.values(summary).reduce((sum, count) => sum + count, 0)

  if (breakingChanges > 0) {
    return { type: ERROR_STATUS_MARKER_VARIANT, count: breakingChanges }
  }

  if (totalChanges > 0) {
    return { type: WARNING_STATUS_MARKER_VARIANT, count: totalChanges }
  }

  return { type: SUCCESS_STATUS_MARKER_VARIANT, count: 0 }
}

