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

import type { DiffTypeDto } from '@netcracker/qubership-apihub-api-processor'
import { replacePropertyInChangesSummary } from '@netcracker/qubership-apihub-api-processor'
import type { ActionType, ChangesSummary } from './change-severities'
import {
  ADD_ACTION_TYPE,
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  DEPRECATED_CHANGE_SEVERITY,
  NON_BREAKING_CHANGE_SEVERITY,
  REMOVE_ACTION_TYPE,
  REPLACE_ACTION_TYPE,
  RISKY_CHANGE_SEVERITY,
  UNCLASSIFIED_CHANGE_SEVERITY,
} from './change-severities'
import type { GraphQlOperationType } from './graphql-operation-types'
import type { Key } from './keys'
import type { MethodType } from './method-types'
import type {
  ApiAudience,
  ApiKind,
  GraphQlOperation,
  Operation,
  PackageRef,
  PackagesRefs,
  RestOperation,
} from './operations'
import { toPackageRef } from './operations'

// DTO Types
export type VersionChangesDto = Partial<Readonly<{
  previousVersion: Key
  previousVersionPackageId: Key
  operations: ReadonlyArray<OperationChangeDataDto>
  packages: PackagesRefs
}>>

// Base DTO interface for operation info
export interface OperationInfoDto {
  readonly operationId: Key
  readonly title: string
  readonly apiKind: ApiKind
  readonly apiAudience: ApiAudience
  readonly tags: string[]
  readonly packageRef?: string
}

export interface RestOperationInfoDto extends OperationInfoDto {
  readonly method: MethodType
  readonly path: string
}

export interface GraphQlOperationInfoDto extends OperationInfoDto {
  readonly method: string
  readonly type: GraphQlOperationType
}

// Combined DTO type for operation changes
export interface OperationChangeDataDto {
  readonly changeSummary: ChangesSummary<DiffTypeDto>
  readonly currentOperation?: OperationInfoDto
  readonly previousOperation?: OperationInfoDto
  readonly comparisonInternalDocumentId?: Key
}

// Domain Types
export type VersionChanges = Readonly<{
  previousVersion?: Key
  previousVersionPackageKey?: Key
  operations: ReadonlyArray<OperationChangeBase<Operation>>
}>

export type DifferentVersionChanges = Readonly<{
  operations: ReadonlyArray<OperationChangeBase<Operation>>
}>

export type VersionChangesData = VersionChangesDto

export type PagedVersionChanges = ReadonlyArray<VersionChanges>
export type PagedDiffVersionChanges = ReadonlyArray<DifferentVersionChanges>

// Base domain interface for operation info
export interface OperationInfo {
  readonly operationKey: Key
  readonly title: string
  readonly apiKind: ApiKind
  readonly apiAudience: ApiAudience
  readonly packageRef?: PackageRef
}

export interface RestOperationInfo extends OperationInfo {
  readonly method: MethodType
  readonly path: string
}

export interface GraphQlOperationInfo extends OperationInfo {
  readonly method: string
  readonly type: GraphQlOperationType
}

// Base interface for all operation change types
export interface OperationChangeBase<T extends Operation = Operation> {
  readonly changeSummary: ChangesSummary
  readonly action: ActionType
  readonly currentOperation?: T
  readonly previousOperation?: T
  readonly comparisonInternalDocumentId?: Key
}

// Type aliases for specific operation types
export type RestOperationChange = OperationChangeBase<RestOperation>
export type GraphQlOperationChange = OperationChangeBase<GraphQlOperation>

export const toVersionChanges = (dto: VersionChangesDto): VersionChanges => {
  return {
    previousVersion: dto?.previousVersion,
    previousVersionPackageKey: dto?.previousVersionPackageId,
    operations: dto?.operations?.map(
      (operationChange) => toOperationChange(operationChange, dto?.packages),
    ) ?? [],
  }
}

export const toDiffVersionChanges = (dto: VersionChangesDto): DifferentVersionChanges => {
  return {
    operations: dto?.operations?.map(
      (operationChange) => toOperationChange(operationChange, dto?.packages, false),
    ) ?? [],
  }
}

// Unified transformation function
export const toOperationChange = (
  dto: OperationChangeDataDto,
  packagesRefs?: PackagesRefs,
  includePackageRefs: boolean = true,
): OperationChangeBase<Operation> => {
  return {
    changeSummary: replacePropertyInChangesSummary(dto.changeSummary),
    currentOperation: dto.currentOperation
      ? {
        ...dto.currentOperation,
        operationKey: dto.currentOperation.operationId,
        packageRef: includePackageRefs ? toPackageRef(dto.currentOperation.packageRef, packagesRefs) : undefined,
      }
      : undefined,
    previousOperation: dto.previousOperation
      ? {
        ...dto.previousOperation,
        operationKey: dto.previousOperation.operationId,
        packageRef: includePackageRefs ? toPackageRef(dto.previousOperation.packageRef, packagesRefs) : undefined,
      }
      : undefined,
    comparisonInternalDocumentId: dto.comparisonInternalDocumentId,
    action: calculateAction(dto.currentOperation?.operationId, dto.previousOperation?.operationId),
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
  [RISKY_CHANGE_SEVERITY]: 0,
  [DEPRECATED_CHANGE_SEVERITY]: 0,
  [NON_BREAKING_CHANGE_SEVERITY]: 0,
  [ANNOTATION_CHANGE_SEVERITY]: 0,
  [UNCLASSIFIED_CHANGE_SEVERITY]: 0,
}
