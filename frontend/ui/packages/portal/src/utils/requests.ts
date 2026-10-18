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
import { API_V2, requestBlob, requestJson, requestText, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export function portalRequestJson<T extends object | null>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestJsonExtraOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  return requestJson(
    input,
    init,
    {
      basePath: API_V2,
      ...options,
    },
    signal,
  )
}

export function portalRequestVoid(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestVoidExtraOptions = {},
): Promise<void> {
  return requestVoid(input, init, {
    basePath: API_V2,
    ...options,
  })
}

export function portalRequestText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestTextExtraOptions = {},
): Promise<string> {
  return requestText(
    input,
    init,
    {
      basePath: API_V2,
      ...options,
    },
  )
}

export function portalRequestBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestBlobExtraOptions = {},
): Promise<Response> {
  return requestBlob(
    input,
    init,
    {
      basePath: API_V2,
      ...options,
    },
  )
}
