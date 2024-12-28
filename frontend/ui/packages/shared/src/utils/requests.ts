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

import { AUTHORIZATION_LOCAL_STORAGE_KEY } from './constants'
import { getAuthorization } from './storages'
import { redirectToSaml } from './redirects'
import type { ErrorMessage } from './packages-builder'
import type { Key } from './types'
import { HttpError } from './responses'

export const API_V1 = '/api/v1'
export const API_V2 = '/api/v2'
export const API_V3 = '/api/v3'
export const API_V4 = '/api/v4'

export const API_BASE_PATH_PATTERN = '/api/:apiVersion'

export const STATUS_REFETCH_INTERVAL = 3 * 1000 // three seconds
export const DEFAULT_REFETCH_INTERVAL = 5 * (60 * 1000) // five minutes

export type CustomErrorHandler = (response: Response) => void
export type CustomRedirectHandler = (response: Response) => FetchRedirectDetails | null

export type RequestJsonExtraOptions = {
  basePath?: string
  customErrorHandler?: CustomErrorHandler
  customRedirectHandler?: CustomRedirectHandler
  ignoreNotFound?: boolean
}

export async function requestJson<T extends object | null>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestJsonExtraOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  const { basePath = '', customErrorHandler, customRedirectHandler, ignoreNotFound = false } = options

  const authorization = (init?.headers as Record<string, string>)?.authorization ?? getAuthorization()

  const response = await fetch(`${basePath}${input}`, {
    headers: {
      authorization: authorization,
    },
    ...init,
    signal: signal,
  })
  if (!response.ok) {
    handleAuthentication(response)

    await handleFetchError(response, ignoreNotFound, customErrorHandler)
    return null as T
  }

  await handleFetchRedirect(response, customRedirectHandler)

  return await response.json() as T
}

export type RequestTextExtraOptions = {
  basePath?: string
  customErrorHandler?: CustomErrorHandler
  customRedirectHandler?: CustomRedirectHandler
}

export async function requestText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestTextExtraOptions = {},
): Promise<string> {
  const { basePath = '', customErrorHandler, customRedirectHandler } = options
  const authorization = (init?.headers as Record<string, string>)?.authorization ?? getAuthorization()

  const response = await fetch(`${basePath ?? ''}${input}`, {
    headers: {
      authorization: authorization,
    },
    ...init,
  })
  if (!response.ok) {
    handleAuthentication(response)

    await handleFetchError(response, false, customErrorHandler)
    return ''
  }

  await handleFetchRedirect(response, customRedirectHandler)
  return await response.text()
}

export type RequestBlobExtraOptions = {
  basePath?: string
  customErrorHandler?: CustomErrorHandler
  customRedirectHandler?: CustomRedirectHandler
}

export async function requestBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestBlobExtraOptions = {},
): Promise<Response> {
  const { basePath = '', customErrorHandler, customRedirectHandler } = options
  const authorization = (init?.headers as Record<string, string>)?.authorization ?? getAuthorization()

  const response = await fetch(`${basePath ?? ''}${input}`, {
    headers: {
      authorization: authorization,
    },
    ...init,
  })

  if (!response.ok) {
    handleAuthentication(response)

    if (customErrorHandler) {
      customErrorHandler(response)
    } else {
      await handleError(response)
    }
  }

  await handleFetchRedirect(response, customRedirectHandler)
  return response
}

export type RequestVoidExtraOptions = {
  basePath?: string
  ignoreNotFound?: boolean
  customErrorHandler?: CustomErrorHandler
  customRedirectHandler?: CustomRedirectHandler
}

export async function requestVoid(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestVoidExtraOptions = {},
): Promise<void> {
  const { basePath = '', ignoreNotFound = false, customErrorHandler, customRedirectHandler } = options

  const authorization = (init?.headers as Record<string, string>)?.authorization ?? getAuthorization()

  const response = await fetch(`${basePath}${input}`, {
    headers: {
      authorization: authorization,
    },
    ...init,
  })
  if (!response.ok) {
    handleAuthentication(response)

    await handleFetchError(response, ignoreNotFound, customErrorHandler)
  }

  await handleFetchRedirect(response, customRedirectHandler)
  return
}

function handleAuthentication(response: Response): void {
  if (response.status === 401 && !location.pathname.startsWith('/login')) {
    localStorage.removeItem(AUTHORIZATION_LOCAL_STORAGE_KEY)
    redirectToSaml()
  }
}

async function handleFetchError(response: Response, ignoreNotFound: boolean, customErrorHandler?: CustomErrorHandler): Promise<void> {
  if (ignoreNotFound && response.status === 404) {
    return Promise.reject()
  }

  if (customErrorHandler) {
    customErrorHandler(response)
  } else {
    await handleCustomError(response)
  }
}

async function handleFetchRedirect(response: Response, customRedirectHandler?: CustomRedirectHandler): Promise<void> {
  if (response.redirected && customRedirectHandler) {
    const redirectDetails = customRedirectHandler(response)
    if (redirectDetails) {
      await handleCustomRedirect(redirectDetails)
    } else {
      await handleCustomError(response)
    }
  }
}

async function handleCustomError(response: Response): Promise<void> {
  const [message, code, status] = await getResponseError(response)
  const detail = { title: `Error ${response.status}`, message: message, code: code, status: status }
  dispatchEvent(new CustomEvent<FetchErrorDetails>(FETCH_ERROR_EVENT, {
    detail: detail,
    bubbles: true,
    composed: true,
    cancelable: false,
  }))
  throw new HttpError(message, code, status)
}

async function handleCustomRedirect(details: FetchRedirectDetails): Promise<void> {
  dispatchEvent(new CustomEvent<FetchRedirectDetails>(FETCH_REDIRECT_EVENT, {
    detail: details,
    bubbles: true,
    composed: true,
    cancelable: false,
  }))
  window.stop()
}

export type ErrorCode = string
export type ErrorStatus = number | null

export type ResponseError = Readonly<{
  code: ErrorCode
  message: ErrorMessage
  params?: { [key: string]: string }
  status: ErrorStatus
}>

export async function getResponseError(response: Response): Promise<[ErrorMessage, ErrorCode, ErrorStatus]> {
  const errorObject = await response.json() as ResponseError | null
  const errorMessage = errorObject?.message ?? 'Something went wrong'
  const errorCode = errorObject?.code ?? ''
  const errorStatus = errorObject?.status ?? null
  if (!errorObject?.params) {
    return [errorMessage, errorCode, errorStatus]
  }
  return [
    Object.entries(errorObject.params).reduce((message, [key, value]) => {
      return message.replace(`$${key}`, value)
    }, errorMessage),
    errorCode,
    errorStatus,
  ]
}

export class NotFoundError extends Error { }

async function handleError(response: Response): Promise<void> {
  const [message] = await getResponseError(response)
  if (response.status === 404) {
    throw new NotFoundError(message)
  }
  throw new Error(message)
}

export const FETCH_ERROR_EVENT = 'fetch-error'
export const FETCH_REDIRECT_EVENT = 'fetch-redirect'

export type FetchErrorDetails = {
  title: string
  message: ErrorMessage
  code: ErrorCode
  status: ErrorStatus
}

export const FETCH_REDIRECT_TYPE_PACKAGE = 'package-redirect'
export type FetchRedirectType = typeof FETCH_REDIRECT_TYPE_PACKAGE

export type FetchRedirectDetails = {
  redirectType: FetchRedirectType
  id: Key
}

export const ERROR_CODE_OPERATION_NOT_FOUND = '2301'
export const ERROR_CODE_IDP_URL_NOT_FOUND = '2902'
