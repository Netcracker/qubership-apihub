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

import type { MethodType } from './method-types'
import type { ActionType, ChangesSummary, ChangesSummaryDto } from './change-severities'
import {
  ADD_ACTION_TYPE,
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  DEPRECATED_CHANGE_SEVERITY,
  NON_BREAKING_CHANGE_SEVERITY,
  REMOVE_ACTION_TYPE,
  REPLACE_ACTION_TYPE,
  SEMI_BREAKING_CHANGE_SEVERITY,
  UNCLASSIFIED_CHANGE_SEVERITY,
} from './change-severities'
import type { ApiAudience, ApiKind, Operation, OperationWithDifference, PackageRef, PackagesRefs, Tags } from './operations'
import { ALL_API_KIND, toPackageRef } from './operations'
import type { GraphQlOperationType } from './graphql-operation-types'
import type { Key } from './keys'
import { API_AUDIENCE_EXTERNAL } from '@netcracker/qubership-apihub-api-processor'

export type VersionChangesDto = Partial<Readonly<{
  previousVersion: Key
  previousVersionPackageId: Key
  operations: ReadonlyArray<OperationChangeDataDto>
  packages: PackagesRefs
}>>

export type VersionChanges = Readonly<{
  previousVersion?: Key
  previousVersionPackageKey?: Key
  operations: ReadonlyArray<OperationChangeData>
}>

export type DifferentVersionChanges = Readonly<{
  operations: ReadonlyArray<OperationWithDifferenceChangeData>
}>

export type VersionChangesData = VersionChangesDto

export type PagedVersionChanges = ReadonlyArray<VersionChanges>
export type PagedDiffVersionChanges = ReadonlyArray<DifferentVersionChanges>

export type OperationChangeDataDto = RestOperationChangeDto | GraphQlOperationChangeDto

export type OperationInfoFromDifferentVersions = Readonly<{
  title?: string
  apiKind: ApiKind
  apiAudience: ApiAudience
  dataHash?: string
  packageRef?: string
}>

type OperationChangeDataCommonDto = Readonly<{
  operationId: Key
  changeSummary: ChangesSummaryDto
  currentOperation?: OperationInfoFromDifferentVersions
  previousOperation?: OperationInfoFromDifferentVersions
  tags?: Tags
}>

export type RestOperationChangeDto = OperationChangeDataCommonDto & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperationChangeDto = OperationChangeDataCommonDto & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export type OperationChangeData = Operation & Readonly<{
  changeSummary: ChangesSummary
  action: ActionType // Optional, but always calculated
  currentOperation?: OperationInfoFromDifferentVersions
  previousOperation?: OperationInfoFromDifferentVersions
  previousPackageRef?: PackageRef
  previousDataHash?: string
}>

export type OperationWithDifferenceChangeData = OperationWithDifference & Readonly<{
  changeSummary: ChangesSummary
  action: ActionType
}>

export const toVersionChanges = (dto: VersionChangesDto): VersionChanges => {
  return {
    previousVersion: dto?.previousVersion,
    previousVersionPackageKey: dto?.previousVersionPackageId,
    operations: dto?.operations?.map(
      (operationChange) => toOperationChangeData(operationChange, dto?.packages),
    ) ?? [],
  }
}

export const toDiffVersionChanges = (dto: VersionChangesDto): DifferentVersionChanges => {
  return {
    operations: dto?.operations?.map(
      (operationChange) => toDiffOperationChangeData(operationChange),
    ) ?? [],
  }
}

export const toOperationChangeData = (dto: OperationChangeDataDto, packagesRefs?: PackagesRefs): OperationChangeData => {
  return {
    ...dto,
    operationKey: dto.operationId,
    title: dto.currentOperation?.title ?? dto.previousOperation?.title ?? '',
    apiKind: dto.currentOperation?.apiKind ?? dto.previousOperation?.apiKind ?? ALL_API_KIND,
    apiAudience: dto.currentOperation?.apiAudience ?? dto.previousOperation?.apiAudience ?? API_AUDIENCE_EXTERNAL,
    dataHash: dto.currentOperation?.dataHash ?? dto.previousOperation?.dataHash,
    packageRef: toPackageRef(dto.currentOperation?.packageRef ?? dto.previousOperation?.packageRef, packagesRefs),
    previousPackageRef: toPackageRef(dto.previousOperation?.packageRef, packagesRefs),
    action: calculateAction(dto.currentOperation?.dataHash, dto.previousOperation?.dataHash),
    tags: dto.tags,
  }
}

export const toDiffOperationChangeData = (dto: OperationChangeDataDto): OperationWithDifferenceChangeData => {
  return {
    ...dto,
    operationKey: dto.operationId,
    action: calculateAction(dto.currentOperation?.dataHash, dto.previousOperation?.dataHash),
    tags: dto.tags,
  }
}

export function calculateAction(current?: string, previous?: string): ActionType {
  return current && previous
    ? REPLACE_ACTION_TYPE
    : previous
      ? REMOVE_ACTION_TYPE
      : ADD_ACTION_TYPE
}

export const EMPTY_CHANGES = {
  operations: [],
}

export const EMPTY_CHANGE_SUMMARY: ChangesSummary = {
  [BREAKING_CHANGE_SEVERITY]: 0,
  [SEMI_BREAKING_CHANGE_SEVERITY]: 0,
  [DEPRECATED_CHANGE_SEVERITY]: 0,
  [NON_BREAKING_CHANGE_SEVERITY]: 0,
  [ANNOTATION_CHANGE_SEVERITY]: 0,
  [UNCLASSIFIED_CHANGE_SEVERITY]: 0,
}
