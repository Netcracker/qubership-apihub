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

import type { To } from 'react-router-dom'
import type { PackageSettingsPageRoute } from '../../../../routes'
import type { Package, PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { UserDto } from '@netcracker/qubership-apihub-ui-shared/types/user'

export const ADD_CHANGE_ROLE_ACTION = 'add'
export const REMOVE_CHANGE_ROLE_ACTION = 'remove'

export type ChangeRoleAction =
  | typeof ADD_CHANGE_ROLE_ACTION
  | typeof REMOVE_CHANGE_ROLE_ACTION

export const PACKAGE_KINDS_NAMES_MAP: Record<PackageKind, string> = {
  [WORKSPACE_KIND]: 'Workspace',
  [GROUP_KIND]: 'Group',
  [DASHBOARD_KIND]: 'Dashboard',
  [PACKAGE_KIND]: 'Package',
}

export type PackageSettingsNavItemProps = Readonly<{
  label: string
  description: string
  value: PackageSettingsPageRoute
  url: To
}>

export type PackageSettingsTabProps = Readonly<{
  packageObject: Package
  isPackageLoading?: boolean
}>

export type PackageMembers = ReadonlyArray<PackageMember>

export type PackageMember = Readonly<{
  user: UserDto
  roles: ReadonlyArray<RoleDto>
}>

export type PackageInheritance = Readonly<{
  packageId: string
  kind: string
  name: string
}>

export type AddPackageMemberProps = Readonly<{
  emails: string[]
  roleKeys: string[]
}>

export type PackageMembersDto = Readonly<{
  members: PackageMemberDto[]
}>

export type PackageMemberDto = Readonly<{
  user: UserDto
  roles: ReadonlyArray<RoleDto>
}>

type RoleDto = Readonly<{
  roleId: string
  role: string
  inheritance?: PackageInheritance
}>

export type AddPackageMemberPropsDto = Readonly<{
  emails: string[]
  roleIds: string[]
}>

export type ChangePackageMemberDto = Readonly<{
  roleId: Readonly<string>
  action: ChangeRoleAction
}>

export function toPackageMembers(packageMembers: PackageMembersDto): PackageMembers {
  return packageMembers.members.map(({ user, roles }) => {
    return {
      user: user,
      roles: roles,
    }
  })
}
