import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

// Portal UI contract. Shared shapes also live in `server/mocks/ai-chat/types.ts` (server adds REST-only types).
export type ChatId = Key
export type MessageId = Key
export type ClientMessageId = Key

export const AI_CHAT_ROLE = {
  user: 'user',
  assistant: 'assistant',
} as const

type AiChatRole = (typeof AI_CHAT_ROLE)[keyof typeof AI_CHAT_ROLE]

export type AiChat = {
  chatId: ChatId
  title: string
  pinned?: boolean
  createdAt: string
  lastMessageAt: string
  messagesCount: number
}

type AiChatToolInvocation = {
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

/** SSE `event` / `data.type` values from the AI chat stream contract. */
export const AI_CHAT_STREAM_EVENT = {
  contextCompacted: 'context.compacted',
  assistantStart: 'message.assistant.start',
  assistantDelta: 'message.assistant.delta',
  assistantCompleted: 'message.assistant.completed',
  toolStarted: 'tool.started',
  toolCompleted: 'tool.completed',
  error: 'error',
  done: 'done',
} as const

export type AiChatAssistantStartStreamEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.assistantStart
  messageId: MessageId
}

export type AiChatAssistantDeltaStreamEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.assistantDelta
  delta: string
}

export type AiChatAssistantCompletedStreamEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.assistantCompleted
  message: AiChatMessage
}

type AiChatContextCompactedStreamEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.contextCompacted
  messagesCompactedCount: number
}

type AiChatToolStartedStreamEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.toolStarted
  toolCallId: string
  name: string
}

type AiChatToolCompletedStreamEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.toolCompleted
  toolCallId: string
  name: string
  status: 'ok' | 'error'
  durationMs?: number
}

export type AiChatStreamErrorEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.error
  code: string
  message: string
}

export type AiChatStreamDoneEvent = {
  type: typeof AI_CHAT_STREAM_EVENT.done
}

export type AiChatStreamEvent =
  | AiChatContextCompactedStreamEvent
  | AiChatAssistantStartStreamEvent
  | AiChatToolStartedStreamEvent
  | AiChatToolCompletedStreamEvent
  | AiChatAssistantDeltaStreamEvent
  | AiChatAssistantCompletedStreamEvent
  | AiChatStreamErrorEvent
  | AiChatStreamDoneEvent

export const MAX_PINNED_PER_USER = 3 as const
