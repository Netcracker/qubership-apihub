import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { aiChatJson } from './client'
import { toAiChatHttpError } from './errors'
import { AI_CHAT_CHATS_PATH, aiChatItemPath, aiChatMessageStreamPath } from './paths'
import type { AiChat, AiChatCreateRequest, AiChatUpdateRequest, ChatId, ClientMessageId } from './types'

export type AiChatStreamRequestBody = {
  content: string
  clientMessageId: ClientMessageId
}

export function createAiChat(request: AiChatCreateRequest = {}, signal?: AbortSignal): Promise<AiChat> {
  return aiChatJson<AiChat>(AI_CHAT_CHATS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, signal)
}

export function updateAiChat(chatId: ChatId, patch: AiChatUpdateRequest): Promise<AiChat> {
  if (patch.title === undefined && patch.pinned === undefined) {
    throw new Error('AiChat update patch must contain at least one field.')
  }
  return aiChatJson<AiChat>(aiChatItemPath(chatId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

/** Opens the SSE stream; caller reads `response.body` in transport. */
export async function postAiChatMessageStream(
  chatId: ChatId,
  body: AiChatStreamRequestBody,
  signal: AbortSignal,
): Promise<Response> {
  const response = await fetch(`${API_V1}${aiChatMessageStreamPath(chatId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    credentials: 'include',
    body: JSON.stringify(body),
    signal: signal,
  })
  if (!response.ok) {
    throw await toAiChatHttpError(response)
  }
  if (!response.body) {
    throw new Error('Streaming response has no body')
  }
  return response
}
