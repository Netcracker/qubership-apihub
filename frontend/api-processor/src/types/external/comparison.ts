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
import {
  annotation,
  breaking,
  ClassifierType, deprecated,
  DiffType,
  nonBreaking,
  risky,
  unclassified,
} from '@netcracker/qubership-apihub-api-diff'

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

export interface OperationType<T extends DiffType | DiffTypeDto = DiffType> {
  apiType: OperationsApiType
  changesSummary: ChangeSummary<T>
  numberOfImpactedOperations: ChangeSummary<T>
  apiAudienceTransitions: ApiAudienceTransition[]
  tags?: string[]
}

export const BREAKING_CHANGE_TYPE = breaking
export const NON_BREAKING_CHANGE_TYPE = nonBreaking
export const UNCLASSIFIED_CHANGE_TYPE = unclassified
export const RISKY_CHANGE_TYPE = risky
export const DEPRECATED_CHANGE_TYPE = deprecated
export const ANNOTATION_CHANGE_TYPE = annotation
export const SEMI_BREAKING_CHANGE_TYPE = 'semi-breaking'

export type ChangeSummary<T extends DiffType | DiffTypeDto = DiffType> = Record<T, number>
export type ImpactedOperationSummary = Record<DiffType, boolean>
export const DIFF_TYPES: DiffType[] = Object.values(ClassifierType)

export interface ApiAudienceTransition {
  previousAudience: ApiAudience
  currentAudience: ApiAudience
  operationsCount: number
}

export type ChangeSummaryDto = Record<DiffTypeDto, number>
export type DiffTypeDto = typeof ClassifierTypeDto[keyof typeof ClassifierTypeDto]
export const ClassifierTypeDto = {
  breaking,
  nonBreaking,
  SEMI_BREAKING_CHANGE_TYPE,
  annotation,
  unclassified,
  deprecated,
} as const
