import type { PackagePermission, PackagePermissions } from '../packages/types'

export type UserDto = Readonly<{
  id: string
  name: string
  email?: string
  avatarUrl: string
}>

export type UsersDto = Readonly<{
  users: UserDto[]
}>

export type RoleDto = Readonly<{
  roleId: string
  role: string
  readOnly?: true
  permissions: PackagePermissions
}>

export type RolesDto = Readonly<{
  roles: RoleDto[]
}>

export type PermissionDto = Readonly<{
  permission: PackagePermission
  name: string
}>

export type PermissionsDto = Readonly<{
  permissions: PermissionDto[]
}>
