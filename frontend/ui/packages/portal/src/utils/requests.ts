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
