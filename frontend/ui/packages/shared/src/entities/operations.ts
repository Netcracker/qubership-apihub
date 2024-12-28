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

import { API_AUDIENCE_EXTERNAL, API_AUDIENCE_INTERNAL, API_AUDIENCE_UNKNOWN } from '@netcracker/qubership-apihub-api-processor'
import type { MethodType } from './method-types'
import type { PackageKind } from './packages'
import type { VersionStatus } from './version-status'
import type { GraphQlOperationType } from './graphql-operation-types'
import type { OperationChangeData, OperationInfoFromDifferentVersions } from './version-changelog'
import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import type { Key, VersionKey } from './keys'
import type { ApiType } from './api-types'
import { API_TYPE_REST } from './api-types'
import type { DeprecateItem } from '@netcracker/qubership-apihub-api-processor'

export const DEFAULT_API_TYPE: ApiType = API_TYPE_REST

export type OperationsDto = Readonly<{
  operations: ReadonlyArray<OperationDto>
  packages: PackagesRefs
}>
export type OperationDto = RestOperationDto | GraphQlOperationDto

export type OperationMetadataDto = Readonly<{
  operationId: Key
  title: string
  apiType?: ApiType
  apiKind: ApiKind
  apiAudience: ApiAudience
  data?: object
  packageRef?: string
  dataHash: string
  deprecated?: boolean
  tags?: Readonly<Tags>
  customTags?: CustomTags
}>

export type RestOperationDto = OperationMetadataDto & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperationDto = OperationMetadataDto & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export type DeprecatedItem = DeprecateItem
export type DeprecatedItems = ReadonlyArray<DeprecatedItem>
export type DeprecatedItemsDto = {
  deprecatedItems: DeprecatedItems
}

export type OperationsWithDeprecationsDto = Readonly<{
  operations: ReadonlyArray<OperationWithDeprecationsDto>
  packages: PackagesRefs
}>
export type OperationWithDeprecationsDto = Omit<OperationDto, 'dataHash' | 'data'> & Readonly<{
  deprecatedCount?: string
  deprecatedInfo?: object
  deprecatedItems?: DeprecatedItemsDto
  deprecatedInPreviousVersions?: string[]
}>

export type OperationsGroupedByTag<T extends Operation = OperationData> = {
  [tag: string]: T[]
}

export type OperationWithDifference = RestOperationWithDifference | GraphQlOperationWithDifference
export type Operation = RestOperation | GraphQlOperation
export type Operations = ReadonlyArray<Operation>
export type OperationsData = ReadonlyArray<OperationData>
export type PagedOperations = ReadonlyArray<OperationsData>

type OperationCommon = Readonly<{
  operationKey: Key
  title: string
  apiKind: ApiKind
  apiAudience: ApiAudience
  dataHash?: string
  packageRef?: PackageRef
  tags?: Readonly<Tags>
  customTags?: CustomTags
}>

type OperationWithDifferenceCommon = Readonly<{
  operationKey: Key
  currentOperation?: OperationInfoFromDifferentVersions
  previousOperation?: OperationInfoFromDifferentVersions
  tags?: Readonly<Tags>
  customTags?: CustomTags
}>

export type JSONValue =
  | null
  | undefined
  | string
  | boolean
  | number
  | JSONValue[]
  | { [key: string]: JSONValue }

export type CustomTags = { [key: string]: object }

export type RestOperation = OperationCommon & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperation = OperationCommon & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export type RestOperationWithDifference = OperationWithDifferenceCommon & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperationWithDifference = OperationWithDifferenceCommon & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export type OperationData = Operation & Readonly<{
  apiType?: ApiType
  data?: object
  deprecated: boolean
}>

export type PackagesRefs = {
  [rawRefId: string]: PackageRefDto
}
export type PackageRefDto = {
  refId: string
  kind?: string
  name?: string
  version: string
  notLatestRevision?: boolean
  status?: VersionStatus
  deletedAt?: string
  deletedBy?: string
  parentPackages?: ReadonlyArray<string>
}

export type OperationWithDeprecations = OperationData & Readonly<{
  deprecatedCount?: string
  deprecatedInfo?: string
  deprecatedItems?: DeprecatedItems
  deprecatedInPreviousVersions?: string[]
}>
export type OperationsWithDeprecations = ReadonlyArray<OperationWithDeprecations>

export type PackageRef = {
  key: Key
  refId: Key
  kind?: PackageKind
  name?: string
  version: VersionKey
  latestRevision: boolean
  status?: VersionStatus
  deletedAt?: string
  deletedBy?: string
  parentPackages?: ReadonlyArray<string>
}

export function toOperation(operationDto: OperationDto, packagesRefs: PackagesRefs): OperationData {
  return {
    ...operationDto,
    operationKey: operationDto.operationId,
    deprecated: operationDto.deprecated ?? false,
    packageRef: toPackageRef(operationDto.packageRef, packagesRefs),
  }
}

export function toOperations(value: OperationsDto): OperationsData {
  const { packages } = value
  return value.operations.map(operation => toOperation(operation, packages))
}

export const ALL_API_KIND = 'all'
export const BWC_API_KIND = 'bwc'
export const NO_BWC_API_KIND = 'no-bwc'
export const EXPERIMENTAL_API_KIND = 'experimental'

export type ApiKind =
  | typeof ALL_API_KIND
  | typeof BWC_API_KIND
  | typeof NO_BWC_API_KIND
  | typeof EXPERIMENTAL_API_KIND

export const API_KINDS: Record<ApiKind, string> = {
  [ALL_API_KIND]: 'All',
  [BWC_API_KIND]: 'BWC',
  [NO_BWC_API_KIND]: 'No BWC',
  [EXPERIMENTAL_API_KIND]: 'Experimental',
}

export const API_AUDIENCE_ALL = 'all'

export type ApiAudience =
  | typeof API_AUDIENCE_INTERNAL
  | typeof API_AUDIENCE_EXTERNAL
  | typeof API_AUDIENCE_UNKNOWN
  | typeof API_AUDIENCE_ALL

export const API_AUDIENCES: Record<ApiAudience, string> = {
  [API_AUDIENCE_INTERNAL]: 'Internal',
  [API_AUDIENCE_EXTERNAL]: 'External',
  [API_AUDIENCE_UNKNOWN]: 'Unknown',
  [API_AUDIENCE_ALL]: 'All',
}

export type Tags = readonly string[]

export type OperationTags = Readonly<Tags>
export type OperationTagsDto = Readonly<{
  tags: Readonly<Tags>
}>

export function toOperationTags(value: OperationTagsDto): OperationTags {
  return value.tags ?? []
}

export const DEFAULT_TAG = 'default'
export const EMPTY_TAG = ''

export const ALL_DEPRECATED_QUERY_STATUS = 'all'
export type DeprecatedQueryStatus = typeof ALL_DEPRECATED_QUERY_STATUS | 'true' | 'false'

export function toDeprecatedQueryStatus(value: boolean): DeprecatedQueryStatus {
  if (value) {
    return 'true'
  } else {
    return 'false'
  }
}

export function toPackageRef(packageRef: string | undefined, packages?: PackagesRefs): PackageRef | undefined {
  if (!packageRef) {
    return undefined
  }
  const relatedPackage = packages?.[packageRef]
  return relatedPackage ? {
    key: relatedPackage.refId,
    refId: relatedPackage.refId,
    version: relatedPackage.version,
    status: relatedPackage.status,
    name: relatedPackage.name,
    parentPackages: relatedPackage.parentPackages,
    latestRevision: !relatedPackage?.notLatestRevision,
  } : undefined
}

export function isRestOperation(operation: Operation | OperationWithDifference): operation is RestOperation {
  const asRestOperation = (operation as RestOperation)
  return asRestOperation.path !== undefined
}

export function isRestOperationDto(operation: OperationDto): operation is RestOperationDto {
  const asRestOperation = (operation as RestOperationDto)
  return asRestOperation.path !== undefined
}

export function isGraphQlOperation(operation: Operation | OperationWithDifference): operation is GraphQlOperation {
  const asGraphQlOperation = (operation as GraphQlOperation)
  return asGraphQlOperation.type !== undefined
}

export function isOperation(value: unknown): value is Operation {
  return !!value && typeof value === 'object' && 'title' in value
}

export function isOperationData(value: unknown): value is OperationData {
  return isOperation(value) && 'deprecated' in value
}

export function isOperationChangeData(value: unknown): value is OperationChangeData {
  return isOperation(value) && 'changeSummary' in value
}

export function isOperationDataArray(value: unknown): value is OperationData[] {
  return !!value && Array.isArray(value) && value.every(isOperationData)
}

export function isOperationChangeDataArray(value: unknown): value is OperationChangeData[] {
  return !!value && Array.isArray(value) && value.every(isOperationChangeData)
}

export type FetchNextOperationList = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<OperationsData, Error>>

export type SelectedPreviewOperationData = {
  operationKey: Key
  packageRef?: PackageRef
}
