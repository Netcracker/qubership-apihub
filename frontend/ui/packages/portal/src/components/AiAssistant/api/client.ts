import { API_V1, requestJson, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import { toAiChatHttpError } from './errors'

export function aiChatJson<T extends object | null>(
  input: RequestInfo | URL,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson<T>(input, init, {
    basePath: API_V1,
    customErrorHandler: aiChatCustomErrorHandler,
  }, signal)
}

export function aiChatVoid(input: RequestInfo | URL, init?: RequestInit): Promise<void> {
  return requestVoid(input, init, {
    basePath: API_V1,
    customErrorHandler: aiChatCustomErrorHandler,
  })
}

/**
 * `requestJson` / `requestVoid` only accept a sync `customErrorHandler`; `toAiChatHttpError` is async
 * (reads the error JSON and may dispatch an AI-chat snackbar via `forceSnackbar`).
 *
 * We start that work with `void` and throw immediately so the request promise rejects (React Query
 * must not get `null` as a fake success). The thrown `HttpError` is a stub — users see the real
 * message from `toAiChatHttpError`; stream POST uses `throw await toAiChatHttpError` instead.
 */
function aiChatCustomErrorHandler(response: Response): void {
  void toAiChatHttpError(response)
  throw new HttpError('AI chat request failed', '', null)
}
