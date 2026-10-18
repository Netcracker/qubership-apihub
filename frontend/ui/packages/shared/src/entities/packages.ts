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

import type { PackagePermissions } from './package-permissions'
import type { UserRole } from './user-roles'
import type { StatusMarkerVariant } from '../components/StatusMarker'
import type { Key, VersionKey } from './keys'

export const GROUP_KIND = 'group'
export const PACKAGE_KIND = 'package'
export const WORKSPACE_KIND = 'workspace'
export const DASHBOARD_KIND = 'dashboard'

export type PackageKind =
  | typeof GROUP_KIND
  | typeof PACKAGE_KIND
  | typeof WORKSPACE_KIND
  | typeof DASHBOARD_KIND

export type BwcErrors = Readonly<{
  type: StatusMarkerVariant
  count: number
}>

export type LastReleaseVersionDetailsDto = Readonly<{
  version?: string
  notLatestRevision?: boolean
  summary?: PackageSummary
}>

export type LastReleaseVersionDetails = Readonly<{
  version?: string
  latestRevision?: boolean
  summary?: PackageSummary
}>

export type PackageSummary = Readonly<{
  breaking?: number
  semiBreaking?: number
  nonBreaking?: number
  deprecate?: number
  annotation?: number
  unclassified?: number
}>

export type PackageDto = Readonly<{
  packageId: Key
  parentId?: Key
  alias: string
  name: string
  kind: PackageKind
  description?: string
  isFavorite?: boolean
  serviceName?: string
  userRole?: UserRole
  permissions?: PackagePermissions
  defaultRole?: DefaultPackageRoleType
  defaultReleaseVersion?: string
  releaseVersionPattern?: string
  restGroupingPrefix?: string
  parents?: ParentPackagesDto
  defaultVersion?: VersionKey
  lastReleaseVersionDetails?: LastReleaseVersionDetailsDto
}>

export type PackagesDto = Readonly<{
  packages: ReadonlyArray<PackageDto>
}>

export type Package = Readonly<{
  key: Key
  alias: string
  name: string
  parentGroup?: Key
  kind: PackageKind
  description?: string
  isFavorite?: boolean
  serviceName?: string
  // todo remove userRole after full transition to permissions
  userRole?: UserRole
  permissions?: PackagePermissions
  restGroupingPrefix?: string
  parents?: ParentPackages
  defaultRole?: DefaultPackageRoleType
  packageVisibility?: boolean
  defaultReleaseVersion?: string
  releaseVersionPattern?: string
  defaultVersion?: VersionKey
  lastReleaseVersionDetails?: LastReleaseVersionDetails
  bwcErrors?: BwcErrors
}>

export type Packages = ReadonlyArray<Package>

export type ParentPackageDto = {
  packageId: Key
  kind: PackageKind
  alias: string
  name: string
  parentId?: Key
}

export type ParentPackagesDto = ReadonlyArray<ParentPackageDto>

export type ParentPackage = {
  key: Key
  alias: string
  name: string
  parentGroup?: Key
  kind: PackageKind
}

export type ParentPackages = ReadonlyArray<ParentPackage>

export type CreatePackageProps = {
  alias: string
  name: string
  parentId?: Key
  kind: PackageKind
  description?: string
  defaultRole?: DefaultPackageRoleType
}

export type InvalidatePackagesProps = {
  key?: Key
  parentId?: Key
  kind: PackageKind
  limit?: number | null
  page?: number | null
  onlyFavorite?: boolean
  onlyShared?: boolean
  textFilter?: string
}

export const PUBLIC_PACKAGE_ROLE = 'viewer'

export const PRIVATE_PACKAGE_ROLE = 'none'
export type DefaultPackageRoleType =
  | typeof PUBLIC_PACKAGE_ROLE
  | typeof PRIVATE_PACKAGE_ROLE

export const EMPTY_PACKAGE: Package = {
  key: '',
  kind: PACKAGE_KIND,
  alias: '',
  name: '',
}

export const PACKAGE_KIND_MAP: Record<PackageKind, string> = {
  [GROUP_KIND]: 'Group',
  [PACKAGE_KIND]: 'Package',
  [WORKSPACE_KIND]: 'Workspace',
  [DASHBOARD_KIND]: 'Dashboard',
}
