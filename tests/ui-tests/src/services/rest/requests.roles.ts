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
