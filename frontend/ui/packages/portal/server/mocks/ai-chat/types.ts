// Mirror of `src/components/AiAssistant/api/types.ts` (OpenAPI-aligned).
// Kept under server/ so Jest and the mock compile without the portal TS path aliases.
// When the contract changes, update both files together.

export type AiChatRole = 'user' | 'assistant'

export type AiChat = {
  chatId: string
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
  messageId: string
  clientMessageId: string | null
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

export type AiChatSendRequest = {
  content: string
  clientMessageId?: string
}

export type AiChatSendMessageResponse = {
  userMessage: AiChatMessage
  assistantMessage: AiChatMessage
}

export type AiChatStreamEvent =
  | { type: 'context.compacted'; messagesCompactedCount: number }
  | { type: 'message.assistant.start'; messageId: string }
  | { type: 'tool.started'; toolCallId: string; name: string }
  | {
    type: 'tool.completed'
    toolCallId: string
    name: string
    status: 'ok' | 'error'
    durationMs?: number
  }
  | { type: 'message.assistant.delta'; delta: string }
  | { type: 'message.assistant.completed'; message: AiChatMessage }
  | { type: 'error'; code: string; message: string }
  | { type: 'done' }

export type AiChatErrorCode =
  | 'APIHUB-EF-3001'
  | 'APIHUB-EF-3002'
  | 'APIHUB-EF-3003'
  | 'APIHUB-EF-4101'
  | 'APIHUB-AI-3001'
  | 'APIHUB-AI-4001'
  | 'APIHUB-AI-4003'
  | 'APIHUB-AI-5000'
  | 'APIHUB-AI-5001'

export type AiChatErrorResponse = {
  status: number
  code: AiChatErrorCode
  message: string
}

export const MAX_PINNED_PER_USER = 3 as const
export const MAX_USER_MESSAGE_LENGTH = 32_000 as const
