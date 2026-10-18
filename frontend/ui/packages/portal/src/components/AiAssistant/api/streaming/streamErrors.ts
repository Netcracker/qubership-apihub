import { type FetchErrorDetails } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { AI_CHAT_FETCH_ERROR_TITLE } from '../errors'
import { ABORT_ERROR_NAME } from './constants'

/** True when the user pressed Stop and `fetch` was aborted (not a server error). */
export function isStreamAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === ABORT_ERROR_NAME
}

/** Shape for `dispatchAiChatFetchError` from SSE `error` frames and non-HTTP stream failures. */
export function toStreamFetchErrorDetail(message: string, code = ''): FetchErrorDetails {
  return { title: AI_CHAT_FETCH_ERROR_TITLE, message: message, code: code, status: null }
}
