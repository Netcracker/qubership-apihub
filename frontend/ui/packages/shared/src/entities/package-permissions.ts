export const READ_PERMISSION = 'read'
export const CREATE_AND_UPDATE_PACKAGE_PERMISSION = 'create_and_update_package'
export const DELETE_PACKAGE_PERMISSION = 'delete_package'
export const MANAGE_DRAFT_VERSION_PERMISSION = 'manage_draft_version'
export const MANAGE_RELEASE_VERSION_PERMISSION = 'manage_release_version'
export const MANAGE_DEPRECATED_VERSION_PERMISSION = 'manage_deprecated_version'
export const USER_ACCESS_MANAGEMENT_PERMISSION = 'user_access_management'
export const ACCESS_TOKEN_MANAGEMENT_PERMISSION = 'access_token_management'
export const DOCUMENT_SHAREABILITY_MANAGEMENT_PERMISSION = 'document_shareability_management'

export const NO_PERMISSION_TO_EDIT_PACKAGE = 'You do not have permission to edit the package'

export type PackagePermission =
  | typeof READ_PERMISSION
  | typeof CREATE_AND_UPDATE_PACKAGE_PERMISSION
  | typeof DELETE_PACKAGE_PERMISSION
  | typeof MANAGE_DRAFT_VERSION_PERMISSION
  | typeof MANAGE_RELEASE_VERSION_PERMISSION
  | typeof MANAGE_DEPRECATED_VERSION_PERMISSION
  | typeof USER_ACCESS_MANAGEMENT_PERMISSION
  | typeof ACCESS_TOKEN_MANAGEMENT_PERMISSION
  | typeof DOCUMENT_SHAREABILITY_MANAGEMENT_PERMISSION

export type PackagePermissions = ReadonlyArray<PackagePermission>

export const MANAGE_STATUS_VERSION_PERMISSIONS: PackagePermissions = [
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  MANAGE_DEPRECATED_VERSION_PERMISSION,
]

export const CREATE_VERSION_PERMISSIONS: PackagePermissions = [
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
]
