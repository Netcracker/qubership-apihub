import type { APIRequestContext, APIResponse } from '@playwright/test'

export async function rGetSystemInfo(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get('/api/v1/system/info')
}

export async function rGetSysConfig(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get('/api/v1/system/configuration')
}
