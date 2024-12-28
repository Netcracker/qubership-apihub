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

import type { Key } from '../entities/keys'
import type { PackagePermissions } from '../entities/package-permissions'

export type Roles = ReadonlyArray<Role>

export type RolesDto = Readonly<{
  roles: RoleDto[]
}>

export type Role = Readonly<{
  key: Key
  role: string
  readOnly?: true
  permissions: PackagePermissions
}>

export type RoleDto = Readonly<{
  roleId: string
  role: string
  readOnly?: true
  permissions: PackagePermissions
}>

export type CreateRoleDto = Readonly<{
  role: string
  permissions: PackagePermissions
}>

export type UpdateRoleDto = Readonly<{
  permissions: PackagePermissions
}>

export type RolesOrder = ReadonlyArray<Key>

export type RolesOrderDto = Readonly<{
  roles: ReadonlyArray<Key>
}>
