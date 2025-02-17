import type { APIRequestContext, APIResponse } from '@playwright/test'

export async function rGetUsersList(rc: APIRequestContext, params: { textFilter?: string }): Promise<APIResponse> {
  const _textFilter = params.textFilter ? encodeURIComponent(params.textFilter) : ''
  return await rc.get(`/api/v2/users?filter=${_textFilter}`)
}
