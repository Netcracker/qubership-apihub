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

import type { APIRequestContext, APIResponse } from '@playwright/test'

export async function rAddSysadmin(rc: APIRequestContext, params: { userId: string }): Promise<APIResponse> {
  return await rc.post('/api/v2/admins', {
    data: {
      userId: params.userId,
    },
  })
}

export async function rDeleteSysadmin(rc: APIRequestContext, params: { userId: string }): Promise<APIResponse> {
  return await rc.delete(`/api/v2/admins/${params.userId}`)
}

export async function rGetSysadminsList(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get('/api/v2/admins')
}

export async function rAddMembersToPackage(rc: APIRequestContext, params: {
  packageId: string
  emails: string[]
  roleIds: string[]
}): Promise<APIResponse> {
  return await rc.post(`/api/v2/packages/${params.packageId}/members`, {
    data: {
      emails: params.emails,
      roleIds: params.roleIds,
    },
  })
}
