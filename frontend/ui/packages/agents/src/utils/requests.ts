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

import type {
  RequestBlobExtraOptions,
  RequestJsonExtraOptions,
  RequestTextExtraOptions,
  RequestVoidExtraOptions,
} from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  API_V1,
  API_V2,
  requestBlob,
  requestJson,
  requestText,
  requestVoid,
} from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'

export function ncCustomAgentsRequestJson<T extends object | null>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestJsonExtraOptions = {},
): Promise<T> {
  return requestJson(input, init, {
    basePath: `${APIHUB_NC_BASE_PATH}${API_V2}`,
    ...options,
  })
}

export function ncCustomAgentsRequestVoid(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestVoidExtraOptions = {},
): Promise<void> {
  return requestVoid(input, init, {
    basePath: `${APIHUB_NC_BASE_PATH}${API_V2}`,
    ...options,
  })
}

export function ncCustomAgentsRequestText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestTextExtraOptions = {},
): Promise<string> {
  return requestText(input, init, {
    basePath: `${APIHUB_NC_BASE_PATH}${API_V2}`,
    ...options,
  })
}

export function ncCustomAgentsRequestBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestBlobExtraOptions = {},
): Promise<Response> {
  return requestBlob(input, init, {
    basePath: `${APIHUB_NC_BASE_PATH}${API_V1}`,
    ...options,
  })
}
