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

import type { UserDto } from '../auth/types'
import type { FileFormat } from '../global-search/types'
import type { VersionStatus } from './version-statuses'
import type { Principal } from './principal'

export const GROUP_KIND = 'group'
export const PACKAGE_KIND = 'package'
export const WORKSPACE_KIND = 'workspace'
export const DASHBOARD_KIND = 'dashboard'

export type PackageKind =
  | typeof GROUP_KIND
  | typeof PACKAGE_KIND
  | typeof WORKSPACE_KIND
  | typeof DASHBOARD_KIND

export const ADMIN_USER_ROLE_ID = 'admin'
export const EDITOR_USER_ROLE_ID = 'editor'
export const VIEWER_USER_ROLE_ID = 'viewer'

export type UserRole =
  | typeof ADMIN_USER_ROLE_ID
  | typeof EDITOR_USER_ROLE_ID
  | typeof VIEWER_USER_ROLE_ID

export const READ_PERMISSION = 'read'
export const CREATE_AND_UPDATE_PACKAGE_PERMISSION = 'create_and_update_package'
export const DELETE_PACKAGE_PERMISSION = 'delete_package'
export const MANAGE_DRAFT_VERSION_PERMISSION = 'manage_draft_version'
export const MANAGE_RELEASE_VERSION_PERMISSION = 'manage_release_version'
export const MANAGE_DEPRECATED_VERSION_PERMISSION = 'manage_deprecated_version'
export const MANAGE_ARCHIVED_VERSION_PERMISSION = 'manage_archived_version'
export const USER_ACCESS_MANAGEMENT_PERMISSION = 'user_access_management'
export const ACCESS_TOKEN_MANAGEMENT_PERMISSION = 'access_token_management'

export type PackagePermission =
  | typeof READ_PERMISSION
  | typeof CREATE_AND_UPDATE_PACKAGE_PERMISSION
  | typeof DELETE_PACKAGE_PERMISSION
  | typeof MANAGE_DRAFT_VERSION_PERMISSION
  | typeof MANAGE_RELEASE_VERSION_PERMISSION
  | typeof MANAGE_DEPRECATED_VERSION_PERMISSION
  | typeof MANAGE_ARCHIVED_VERSION_PERMISSION
  | typeof USER_ACCESS_MANAGEMENT_PERMISSION
  | typeof ACCESS_TOKEN_MANAGEMENT_PERMISSION

export type PackagePermissions = ReadonlyArray<PackagePermission>

export type SystemTokenDto = Readonly<{
  apiKey?: string
  id: string
  packageId: string
  name: string
  createdAt: string
  createdBy: {
    key: string
    name: string
    avatarUrl: string
  }
  roles: string[]
}>

export type SystemTokensDto = Readonly<{
  apiKeys: SystemTokenDto[]
}>

export type PackageMembers = Readonly<{
  members: PackageMember[]
}>

export type PackageMember = Readonly<{
  user: UserDto
  role: string
  inheritance?: PackageInheritance
}>

export type PackageInheritance = Readonly<{
  packageId: string
  kind: string
  name: string
}>

export type Package = Readonly<{
  key: string
  alias: string
  name: string
  parentGroup?: string
  kind: PackageKind
  description?: string
  isFavorite?: boolean
  serviceName?: string
  // todo remove userRole after full transition to permissions
  userRole?: UserRole
  permissions?: PackagePermissions
  parents?: ParentPackages
  defaultReleaseVersion?: string
  releaseVersionPattern?: string
  restGroupingPrefix?: string
  defaultRole?: DefaultPackageRoleType
  packageVisibility?: boolean
  defaultVersion?: string
  defaultVersionDetails?: DefaultPackageVersion
  bwcErrors?: BwcErrors
}>

export type PackageDto = Readonly<{
  packageId: string
  parentId?: string
  alias: string
  name: string
  kind: PackageKind
  description?: string
  isFavorite?: boolean
  serviceName?: string
  userRole?: UserRole
  permissions?: PackagePermissions
  defaultRole?: DefaultPackageRoleType
  parents?: ParentPackagesDto
  defaultReleaseVersion?: string
  releaseVersionPattern?: string
  restGroupingPrefix?: string
  defaultVersion?: string
  defaultVersionDetails?: DefaultPackageVersion
}>
export type ParentPackagesDto = ReadonlyArray<ParentPackageDto>

export type DefaultPackageVersion = Readonly<{
  previousVersion?: string
  status?: string
  versionLabels?: string[]
  summary?: PackageSummary
}>

export type ParentPackageDto = {
  packageId: string
  alias: string
  name: string
  parentId?: string
  kind: 'group' | 'package' | 'workspace' | 'dashboard'
}

export type PackageSummary = Readonly<{
  breaking?: number
  semiBreaking?: number
  nonBreaking?: number
  deprecate?: number
  annotation?: number
  unclassified?: number
}>

export type PackagesDto = Readonly<{
  packages: ReadonlyArray<PackageDto>
}>

export type Packages = ReadonlyArray<Package>
export type ParentPackages = ReadonlyArray<ParentPackage>

export type ParentPackage = {
  key: string
  alias: string
  name: string
  parentGroup?: string
  kind: 'group' | 'package' | 'workspace' | 'dashboard'
}

export type BwcErrors = Readonly<{
  type: 'loading' | 'default' | 'success' | 'warning' | 'error'
}>

export const PUBLIC_PACKAGE_ROLE = 'viewer'
export const PRIVATE_PACKAGE_ROLE = 'none'
export type  DefaultPackageRoleType = | typeof PUBLIC_PACKAGE_ROLE | typeof PRIVATE_PACKAGE_ROLE

export type OperationsDto = Readonly<{
  operations: ReadonlyArray<OperationDto>
  packages: PackagesRefs
}>
export type OperationDto = RestOperationMetadata | GraphQlOperationMetadata

type OperationMetadata = Readonly<{
  operationId: string
  title: string
  apiKind?: ApiKind
  apiType: ApiType
  data?: object
  packageRef?: string
  dataHash?: string
  deprecated?: boolean
  tags?: string[]
}>

export type RestOperationMetadata = OperationMetadata & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperationMetadata = OperationMetadata & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export type OperationsWithDeprecatedDto = Readonly<{
  operations: ReadonlyArray<OperationWithDeprecatedDto>
  packages: PackagesRefs
}>

export type DeprecatedItemDto = Readonly<{
  jsonPath: string[]
  description: string
  deprecatedInPreviousVersions?: string[]
  deprecatedInfo: object
}>
export type DeprecatedItemsDto = ReadonlyArray<DeprecatedItemDto>

export type OperationWithDeprecatedDto = Omit<OperationDto, 'dataHash' | 'data'> & Readonly<{
  deprecatedCount?: string
  deprecatedInfo?: object
  deprecatedItems?: DeprecatedItemsDto
  deprecatedInPreviousVersions?: string[]
}>

export type Operations = ReadonlyArray<Operation>
export type Operation = Readonly<{
  operationKey: string
  title: string
  apiKind: 'bwc' | 'no-bwc' | 'debug' | 'experimental' | 'all'
  apiType: ApiType
  data?: object
  packageRef?: PackageRef
  deprecated?: boolean
  path: string
  method: MethodType
  tags?: string[]
}>

export type PackagesRefs = {
  [rawRefId: string]: PackageRef
}
export type PackageRef = Partial<{
  refId: string
  kind: 'group' | 'package' | 'workspace' | 'dashboard'
  name: string
  version: string
  status: VersionStatus
  parents?: ParentPackagesDto
}>

export type OperationsApiType = 'rest' | 'graphql'

export type OperationGroupDto = Readonly<{
  groupName: string
  description?: string
  isPrefixGroup: boolean
  operationsCount?: number
}>
export type OperationGroupWithApiTypeDto = OperationGroupDto & { apiType: OperationsApiType }

export type OperationTagsDto = Readonly<{
  tags: Readonly<string[]>
}>

export type PackageVersionContentDto = Readonly<{
  version: string
  packageId: string
  status: VersionStatus
  createdAt: string
  createdBy: Principal
  previousVersion?: string
  previousVersionPackageId?: string
  versionLabels?: string[]
  operationTypes?: ReadonlyArray<OperationTypeSummaryDto>
  operationGroups?: ReadonlyArray<unknown>
  revisionsCount?: number
  notLatestRevision?: boolean
}>

export type OperationTypeSummaryDto = Readonly<{
  apiType: ApiType
  changesSummary: ChangesSummaryDto
  operationsCount: number
  deprecatedCount: number
  operations?: object
}>

export type VersionChangesDto = Partial<Readonly<{
  previousVersion: string
  previousVersionPackageId: string
  operations: ReadonlyArray<OperationChangesDto>
  packages: PackagesRefs
}>>

export type ChangesSummaryDto = Readonly<{
  breaking: number
  semiBreaking: number
  deprecated: number
  nonBreaking: number
  annotation: number
  unclassified: number
}>

export type OperationChangesDto = RestOperationChangesMetadata | GraphQlOperationChangesMetadata

export type OperationChangesMetadata = Readonly<{
  operationId: string
  changeSummary: ChangesSummaryDto
  title?: string
  packageRef?: string
  previousVersionPackageRef?: string
  apiKind?: ApiKind
  dataHash?: string
  previousDataHash?: string
  tags?: readonly string[]
}>

export type RestOperationChangesMetadata = OperationChangesMetadata & Readonly<{
  method: MethodType
  path: string
}>

export type GraphQlOperationChangesMetadata = OperationChangesMetadata & Readonly<{
  method: string
  type: GraphQlOperationType
}>

export type VersionChangesSummaryDto = PackageComparisonSummaryDto | DashboardComparisonSummaryDto

export interface OperationType {
  apiType: ApiType
  changesSummary?: ChangesSummaryDto
  tags?: string[]
}

export type PackageComparisonSummaryDto = Readonly<{
  operationTypes: ReadonlyArray<OperationType>
  noContent?: boolean
}>

export type RefComparisonSummaryDto = Readonly<{
  packageRef?: string
  previousPackageRef?: string
  operationTypes: ReadonlyArray<OperationType>
  noContent?: boolean
}>

export type DashboardComparisonSummaryDto = Readonly<{
  refs: ReadonlyArray<RefComparisonSummaryDto>
  packages: PackagesRefs
}>

export type DocumentsDto = Readonly<{
  documents: ReadonlyArray<DocumentDto>
}>

export type RestMetaData = {
  path: string
  method: string
  tags: string[]
}

//todo unification with graphql
export type DocumentOperationDto = Omit<RestOperationMetadata, 'method' | 'path'> & { metadata: RestMetaData }

export type DocumentDto = Readonly<{
  fileId: string
  slug: string
  title: string
  type: SpecType
  version?: string
  format?: FileFormat
  labels?: string[]
  metaData?: MetaData
  description?: string
  info?: Readonly<DocumentInfo>
  externalDocs?: Readonly<ExternalDocsLink>
  operations?: ReadonlyArray<DocumentOperationDto>
}>

export type MetaData = {
  summary?: string
  description?: string
  version: string
}

export type DocumentInfo = {
  contact?: Readonly<Link & { email?: string }>
  license?: Readonly<Link>
  termsOfService?: string
}

export type Link = {
  name?: string
  url?: string
}

export type ExternalDocsLink = Omit<Link, 'name'> & { description?: string }

export type RestOperationDto = Omit<OperationDto, 'method' | 'path'> & { metadata: RestMetaData }
export type RestOperationsDto = ReadonlyArray<RestOperationDto>

export type RestOperation = Omit<Operation, 'method' | 'path'> & { metadata: RestMetaData }
export type RestOperations = ReadonlyArray<RestOperation>

export type RevisionsDto = Readonly<{
  revisions: ReadonlyArray<RevisionDto>
}>

export type RevisionDto = Readonly<{
  revision: string
  version: string
  notLatestRevision?: boolean
  status: VersionStatus
  createdBy: RevisionCreatorDto
  createdAt: string
  revisionLabels?: string[]
  publishMeta?: PublishMetaDto
}>

export type RevisionCreatorDto = {
  id: string
  name?: string
  email?: string
  avatarUrl?: string
}

export type PublishMetaDto = Partial<{
  commitId: string
  repositoryUrl: string
  cloudName: string
  cloudUrl: string
  namespace: string
}>

export const OPENAPI_3_1_SPEC_TYPE = 'openapi-3-1'
export const OPENAPI_3_0_SPEC_TYPE = 'openapi-3-0'
export const OPENAPI_2_0_SPEC_TYPE = 'openapi-2-0'
export const OPENAPI_SPEC_TYPE = 'openapi'
export const ASYNCAPI_2_SPEC_TYPE = 'asyncapi-2'
export const JSON_SCHEMA_SPEC_TYPE = 'json-schema'
export const MARKDOWN_SPEC_TYPE = 'markdown'
export const UNKNOWN_SPEC_TYPE = 'unknown'
export const GRAPHQL_SPEC_TYPE = 'graphql'

export type SpecType =
  | typeof OPENAPI_3_1_SPEC_TYPE
  | typeof OPENAPI_3_0_SPEC_TYPE
  | typeof OPENAPI_2_0_SPEC_TYPE
  | typeof OPENAPI_SPEC_TYPE
  | typeof ASYNCAPI_2_SPEC_TYPE
  | typeof JSON_SCHEMA_SPEC_TYPE
  | typeof MARKDOWN_SPEC_TYPE
  | typeof UNKNOWN_SPEC_TYPE
  | typeof GRAPHQL_SPEC_TYPE

export const GET_METHOD_TYPE = 'get'
export const POST_METHOD_TYPE = 'post'
export const PUT_METHOD_TYPE = 'put'
export const PATCH_METHOD_TYPE = 'patch'
export const DELETE_METHOD_TYPE = 'delete'

export type MethodType =
  | typeof GET_METHOD_TYPE
  | typeof POST_METHOD_TYPE
  | typeof PUT_METHOD_TYPE
  | typeof PATCH_METHOD_TYPE
  | typeof DELETE_METHOD_TYPE

export const REST_API_TYPE = 'rest'
export const GRAPHQL_API_TYPE = 'graphql'
export const TEXT_API_TYPE = 'text'
export const UNKNOWN_API_TYPE = 'unknown'
export type ApiType = typeof REST_API_TYPE | typeof GRAPHQL_API_TYPE | typeof TEXT_API_TYPE | typeof UNKNOWN_API_TYPE

export const QUERY_OPERATION_TYPE = 'query'
export const MUTATION_OPERATION_TYPE = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPE = 'subscription'

export type GraphQlOperationType =
  typeof QUERY_OPERATION_TYPE
  | typeof MUTATION_OPERATION_TYPE
  | typeof SUBSCRIPTION_OPERATION_TYPE

const BWC_API_KIND = 'bwc'
const NO_BWC_API_KIND = 'no-bwc'
const DEBUG_API_KIND = 'debug'
const EXPERIMENTAL_API_KIND = 'experimental'
const ALL_API_KIND = 'all'

export type ApiKind =
  typeof BWC_API_KIND
  | typeof NO_BWC_API_KIND
  | typeof DEBUG_API_KIND
  | typeof EXPERIMENTAL_API_KIND
  | typeof ALL_API_KIND

export function isRestOperationChanges(operation: OperationChangesDto): operation is RestOperationChangesMetadata {
  const asRestOperation = (operation as RestOperationChangesMetadata)
  return asRestOperation.path !== undefined
}

export function isGraphQlOperationChanges(operation: OperationChangesDto): operation is GraphQlOperationChangesMetadata {
  const asGraphQlOperation = (operation as GraphQlOperationChangesMetadata)
  return asGraphQlOperation.type !== undefined
}
