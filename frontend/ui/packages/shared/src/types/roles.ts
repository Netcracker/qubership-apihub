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
