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
