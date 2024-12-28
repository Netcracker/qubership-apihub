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

export type ResponseError = Readonly<{
  code: string
  message: string
  params?: {[key: string]: string}
  status: string
}>

export function getResponseError(error: ResponseError | null): string | null {
  if (!error) {
    return null
  }

  let errorMessage = error?.message ?? JSON.stringify(error)
  error?.params && Object.entries(error?.params).forEach(([key, value]) => {
    errorMessage = errorMessage.replace(`$${key}`, value)
  })
  return errorMessage
}

export function handleServerError(error: unknown): void {
  const errorResponseData = (error as any)?.response?.data
  console.error(
    'Got an error from either server or builder',
    getResponseError(errorResponseData) ?? error,
  )

  errorResponseData?.debug && console.log('Found debug message: ', errorResponseData.debug)
}
