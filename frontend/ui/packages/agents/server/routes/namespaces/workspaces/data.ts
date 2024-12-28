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

export const WORKSPACES_DTO = {
  packages: [
    {
      packageId: '111',
      alias: '111',
      parentId: '',
      kind: 'workspace',
      name: '111',
      description: '',
      isFavorite: false,
      parents: [],
      defaultRole: 'viewer',
      permissions: [
        'read',
        'create_and_update_package',
        'delete_package',
        'manage_draft_version',
        'manage_release_version',
        'manage_archived_version',
        'user_access_management',
        'access_token_management',
      ],
    },
  ],
}
