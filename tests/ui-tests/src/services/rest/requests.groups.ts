import type { APIRequestContext, APIResponse } from '@playwright/test'

export async function getRootGroupsList(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get('/api/v1/groups')
}
