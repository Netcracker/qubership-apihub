import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import type { AI_CHAT_STREAM_EVENT } from './streamEvents'

// Portal UI contract. Shared shapes also live in `server/mocks/ai-chat/types.ts` (server adds REST-only types).
export type ChatId = Key
export type MessageId = Key
export type ClientMessageId = Key

export const AI_CHAT_ROLE = {
  user: 'user',
  assistant: 'assistant',
} as const

export type AiChatRole = (typeof AI_CHAT_ROLE)[keyof typeof AI_CHAT_ROLE]

export type AiChat = {
  chatId: ChatId
  title: string
  pinned?: boolean
  createdAt: string
  lastMessageAt: string
  messagesCount: number
}

export type AiChatToolInvocation = {
  name: string
  status: 'ok' | 'error'
  durationMs?: number
}

export type AiChatMessage = {
  messageId: MessageId
  clientMessageId: ClientMessageId | null
  role: AiChatRole
  content: string
  createdAt: string
  toolInvocations?: AiChatToolInvocation[]
}

export type AiChatsListResponse = {
  chats: AiChat[]
  hasMore: boolean
}

export type AiChatMessagesListResponse = {
  messages: AiChatMessage[]
  hasMore: boolean
}

export type AiChatCreateRequest = {
  title?: string
}

export type AiChatUpdateRequest = {
  title?: string
  pinned?: boolean
}

export type AiChatStreamEvent =
  | { type: typeof AI_CHAT_STREAM_EVENT.contextCompacted; messagesCompactedCount: number }
  | { type: typeof AI_CHAT_STREAM_EVENT.assistantStart; messageId: MessageId }
  | { type: typeof AI_CHAT_STREAM_EVENT.toolStarted; toolCallId: string; name: string }
  | {
    type: typeof AI_CHAT_STREAM_EVENT.toolCompleted
    toolCallId: string
    name: string
    status: 'ok' | 'error'
    durationMs?: number
  }
  | { type: typeof AI_CHAT_STREAM_EVENT.assistantDelta; delta: string }
  | { type: typeof AI_CHAT_STREAM_EVENT.assistantCompleted; message: AiChatMessage }
  | { type: typeof AI_CHAT_STREAM_EVENT.error; code: string; message: string }
  | { type: typeof AI_CHAT_STREAM_EVENT.done }
  | { type: string; [k: string]: unknown }

export const MAX_PINNED_PER_USER = 3 as const
