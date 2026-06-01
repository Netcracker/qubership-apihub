import { API_V1, requestJson, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import { toAiChatHttpError } from './errors'

function aiChatCustomErrorHandler(response: Response): void {
  void toAiChatHttpError(response)
  throw new HttpError('AI chat request failed', '', null)
}

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
