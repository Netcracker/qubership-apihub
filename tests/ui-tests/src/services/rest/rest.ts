/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { request } from '@playwright/test'
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_TIMEOUT } from './rest.consts'
import { asyncTimeout, stringifyError } from '@services/utils'

export async function createRest(url: string, token?: string, timeout?: number): Promise<Rest> {
  const _url = new URL(url).origin
  const reqContext = await request.newContext({
    baseURL: _url,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    timeout: timeout || DEFAULT_REQUEST_TIMEOUT,
  })
  return new Rest(reqContext)
}

export class Rest {

  private readonly requestContext: APIRequestContext

  constructor(requestContext: APIRequestContext) {
    this.requestContext = requestContext
  }

  async send(
    request: (...params: any) => Promise<APIResponse>,
    expectedStatuses: number[],
    params?: any,
    options?: {
      retryTimeout: number
      retryCount: number
    }): Promise<APIResponse> {

    const retryTimeout = options?.retryTimeout || DEFAULT_RETRY_TIMEOUT
    const retryCount = options?.retryCount || DEFAULT_RETRY_COUNT
    let response!: APIResponse
    let errMsg!: string
    for (let i = 0; i < retryCount; i++) {
      try {
        response = await request(this.requestContext, params)
        if (expectedStatuses.includes(response.status())) {
          return response
        }
      } catch (e) {
        errMsg = stringifyError(e)
      }
      await asyncTimeout(retryTimeout)
    }

    if (response) {
      return response
    }
    throw new Error(errMsg)
  }
}
