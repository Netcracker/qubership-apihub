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

import type { Role } from '../../types/roles'
import type { Permission } from '../../types/permissions'

export const ROLES_LIST: Role[] = [
  {
    key: 'admin',
    role: 'Admin',
    readOnly: true,
    permissions: [
      'read',
      'create_and_update_package',
      'delete_package',
      'manage_draft_version',
      'manage_release_version',
      'manage_archived_version',
      'manage_deprecated_version',
      'user_access_management',
      'access_token_management',
    ],
  },
  {
    key: 'release-manager',
    role: 'Release Manager',
    permissions: [
      'read',
      'manage_release_version',
    ],
  },
  {
    key: 'owner',
    role: 'Owner',
    permissions: [
      'read',
      'create_and_update_package',
      'delete_package',
      'manage_draft_version',
      'manage_release_version',
      'manage_archived_version',
      'manage_deprecated_version',
    ],
  },
  {
    key: 'editor',
    role: 'Editor',
    permissions: [
      'read',
      'manage_draft_version',
      'manage_release_version',
      'manage_archived_version',
      'manage_deprecated_version',
    ],
  },
  {
    key: 'viewer',
    role: 'Viewer',
    readOnly: true,
    permissions: [
      'read',
    ],
  },
  {
    key: 'none',
    role: 'None',
    readOnly: true,
    permissions: [],
  },
]

export const PERMISSIONS_LIST: Permission[] = [
  {
    permission: 'read',
    name: 'read content of public packages',
  },
  {
    permission: 'create_and_update_package',
    name: 'create, update group/package',
  },
  {
    permission: 'delete_package',
    name: 'delete group/package',
  },
  {
    permission: 'manage_draft_version',
    name: 'manage version in draft status',
  },
  {
    permission: 'manage_release_version',
    name: 'manage version in release status',
  },
  {
    permission: 'manage_archived_version',
    name: 'manage version in archived status',
  },
  {
    permission: 'manage_deprecated_version',
    name: 'manage version in deprecated status',
  },
  {
    permission: 'user_access_management',
    name: 'user access management',
  },
  {
    permission: 'access_token_management',
    name: 'access token management',
  },
]
