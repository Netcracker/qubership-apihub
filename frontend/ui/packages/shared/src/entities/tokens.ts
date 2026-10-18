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

export const SYSTEM_ADMINISTRATOR_TOKEN_USER_ROLE = 'System administrator'
export const ADMIN_TOKEN_USER_ROLE = 'Admin'
export const OWNER_TOKEN_USER_ROLE = 'Owner'
export const RELEASE_MANAGER_TOKEN_USER_ROLE = 'Release Manager'
export const EDITOR_TOKEN_USER_ROLE = 'Editor'
export const VIEWER_TOKEN_USER_ROLE = 'Viewer'
export const NONE_TOKEN_USER_ROLE = 'None'


export const tokenRoleMapping: Record<string, string> = {
  admin: ADMIN_TOKEN_USER_ROLE,
  owner: OWNER_TOKEN_USER_ROLE,
  'release-manager': RELEASE_MANAGER_TOKEN_USER_ROLE,
  'System administrator': SYSTEM_ADMINISTRATOR_TOKEN_USER_ROLE,
  editor: EDITOR_TOKEN_USER_ROLE,
  viewer: VIEWER_TOKEN_USER_ROLE,
  none: NONE_TOKEN_USER_ROLE,
}

export const reverseTokenRoleMapping: Record<string, string> = {
  [ADMIN_TOKEN_USER_ROLE] : 'admin',
  [OWNER_TOKEN_USER_ROLE] : 'owner',
  [RELEASE_MANAGER_TOKEN_USER_ROLE] : 'release-manager',
  [EDITOR_TOKEN_USER_ROLE] : 'editor',
  [VIEWER_TOKEN_USER_ROLE] : 'viewer',
  [NONE_TOKEN_USER_ROLE] : 'none',
}

export const SYSTEM_TOKENS_PACKAGE_KEY = '*'
