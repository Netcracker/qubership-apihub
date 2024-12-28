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
import type { PermissionsDto } from '../auth/types'

export const PERMISSIONS_LIST: Writeable<PermissionsDto> = {
  permissions: [
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
  ],
}
