import type { APIRequestContext, APIResponse } from '@playwright/test'

export async function rGetSystemInfo(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get('/api/v1/system/info')
}

export async function rGetSysConfig(rc: APIRequestContext): Promise<APIResponse> {
  return await rc.get('/api/v1/system/configuration')
}

export async function rGetExtensionVersion(rc: APIRequestContext, pathPrefix: string): Promise<APIResponse> {
  return await rc.get(`/${pathPrefix}/api/v1/system/version`)
}
