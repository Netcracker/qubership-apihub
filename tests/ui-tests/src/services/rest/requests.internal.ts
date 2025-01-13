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
import type { RestUser } from './rest.types'

export async function rClearTestData(rc: APIRequestContext, params: { testId: string }): Promise<APIResponse> {
  return await rc.delete(`/api/internal/clear/${params.testId}`)
}

export async function rCreateUser(rc: APIRequestContext, params: RestUser): Promise<APIResponse> {
  return await rc.post('/api/internal/users', {
    data: params,
  })
}

export async function rAddSysytemRole(rc: APIRequestContext, user: { id: string }): Promise<APIResponse> {
  return await rc.post(`/api/internal/users/${user.id}/systemRole`, {
    data: {
      role: 'System administrator',
    },
  })
}
