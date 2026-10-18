import type { APIResponse } from '@playwright/test'
import { request } from '@playwright/test'
import type { Credentials } from '@shared/entities'
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_TIMEOUT } from '@services/rest'
import { asyncTimeout, getRestFailMsg } from '@services/utils'

export interface AuthData {
  token: string
  renewToken: string
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string
  }
}

export const getAuthDataFromApi = async (url: URL, credentials: Credentials): Promise<AuthData> => {
  let response!: APIResponse
  for (let i = 0; i < DEFAULT_RETRY_COUNT; i++) {
    response = await localAuth(url, credentials)
    const jsonData = await response.json()
    if (response.status() === 200) {
      if (!jsonData.token) {
        continue
      }
      return jsonData as AuthData
    }
    await asyncTimeout(DEFAULT_RETRY_TIMEOUT)
  }
  throw new Error(await getRestFailMsg(`Getting Auth Data from API for "${credentials.email}"`, response))
}

async function localAuth(url: URL, credentials: Credentials): Promise<APIResponse> {
  const auth = Buffer.from(`${credentials.email}:${credentials.password}`).toString('base64')
  const requestContext = await request.newContext({
    baseURL: url.origin,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Authorization': `Basic ${auth}`,
    },
    timeout: DEFAULT_REQUEST_TIMEOUT,
  })
  return await requestContext.post('/api/v2/auth/local')
}
