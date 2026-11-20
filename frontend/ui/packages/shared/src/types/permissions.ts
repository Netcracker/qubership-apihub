import type { PackagePermission } from '../entities/package-permissions'

export type Permission = Readonly<{
  permission: PackagePermission
  name: string
}>

export type Permissions = ReadonlyArray<Permission>

export type PermissionDto = Readonly<{
  permission: PackagePermission
  name: string
}>

export type PermissionsDto = Readonly<{
  permissions: PermissionDto[]
}>
