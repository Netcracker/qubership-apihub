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

import type { Writeable } from '../../types'
import type { RolesDto } from '../auth/types'

export const ROLES_LIST: Writeable<RolesDto> = {
  roles: [
    {
      roleId: 'admin',
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
      roleId: 'release-manager',
      role: 'Release Manager',
      permissions: [
        'read',
        'manage_release_version',
      ],
    },
    {
      roleId: 'owner',
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
      roleId: 'editor',
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
      roleId: 'viewer',
      role: 'Viewer',
      readOnly: true,
      permissions: [
        'read',
      ],
    },
    {
      roleId: 'none',
      role: 'None',
      readOnly: true,
      permissions: [],
    },
  ],
}
