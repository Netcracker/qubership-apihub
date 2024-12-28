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

import { ApiAudience } from '../package'
import { OperationsApiType, PackageId, VersionId } from './types'
import { ClassifierType, DiffType } from '@netcracker/qubership-apihub-api-diff'

export type VersionComparisonResolver = (
  version: VersionId,
  packageId: PackageId,
  previousVersion: VersionId,
  previousVersionPackageId: PackageId,
) => Promise<ResolvedComparisonSummary | null>

export type ResolvedComparisons = { comparisons: ResolvedComparisonSummary[] }

export interface ResolvedComparisonSummary {
  packageId: PackageId
  version: VersionId
  revision: number
  previousVersion: VersionId
  previousVersionPackageId: PackageId
  previousVersionRevision: number
  operationTypes: OperationType[]
}

export interface OperationType {
  apiType: OperationsApiType
  changesSummary: ChangeSummary
  numberOfImpactedOperations: ChangeSummary
  apiAudienceTransitions: ApiAudienceTransition[]
  tags?: string[]
}

export const BREAKING_CHANGE_TYPE = 'breaking'
export const NON_BREAKING_CHANGE_TYPE = 'non-breaking'
export const UNCLASSIFIED_CHANGE_TYPE = 'unclassified'
export const SEMI_BREAKING_CHANGE_TYPE = 'semi-breaking'
export const DEPRECATED_CHANGE_TYPE = 'deprecated'
export const ANNOTATION_CHANGE_TYPE = 'annotation'

export type ChangeSummary = Record<DiffType, number>
export type ImpactedOperationSummary = Record<DiffType, boolean>

export const DIFF_TYPES: DiffType[] = Object.values(ClassifierType)

export interface ApiAudienceTransition {
  previousAudience: ApiAudience
  currentAudience: ApiAudience
  operationsCount: number
}
