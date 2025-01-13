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

import type { APIResponse } from '@playwright/test'

export const getResponseDebugMsg = async (response: APIResponse, callName?: string): Promise<string> => {
  const reqUrl = response.url()
  const respCode = response.status()
  const respBody = await response.text()
  const reqUrlTitle = callName ? `${callName} request URL` : 'Request URL'
  const respCodeTitle = callName ? `${callName} response code` : 'Response code'
  const respBodyTitle = callName ? `${callName} response body` : 'Response body'
  return `${reqUrlTitle}: ${reqUrl}\n${respCodeTitle}: ${respCode}\n${respBodyTitle}: ${respBody}`
}
