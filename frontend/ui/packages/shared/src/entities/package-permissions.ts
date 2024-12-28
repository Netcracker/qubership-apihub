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

export const MANAGE_STATUS_VERSION_PERMISSIONS: PackagePermissions = [
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  MANAGE_ARCHIVED_VERSION_PERMISSION,
  MANAGE_DEPRECATED_VERSION_PERMISSION,
]

export const CREATE_VERSION_PERMISSIONS: PackagePermissions = [
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  MANAGE_ARCHIVED_VERSION_PERMISSION,
]
