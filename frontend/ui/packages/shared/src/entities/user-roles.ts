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

import type { Permission } from '../types/permissions'

export const ADMIN_USER_ROLE_ID = 'admin'
export const EDITOR_USER_ROLE_ID = 'editor'
export const VIEWER_USER_ROLE_ID = 'viewer'

export type UserRole =
  | typeof ADMIN_USER_ROLE_ID
  | typeof EDITOR_USER_ROLE_ID
  | typeof VIEWER_USER_ROLE_ID

export type CreateRoleProps = {
  role: string
  permissions: Permission[]
}
