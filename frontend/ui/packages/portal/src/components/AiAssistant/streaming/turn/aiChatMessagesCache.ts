import type { InfiniteData } from '@tanstack/react-query'

import {
  AI_CHAT_ROLE,
  type AiChatMessage,
  type AiChatMessagesListResponse,
  type ClientMessageId,
  type MessageId,
} from '../../api/types'

export function emptyMessagesInfiniteData(): InfiniteData<AiChatMessagesListResponse> {
  return {
    pages: [{ messages: [], hasMore: false }],
    pageParams: [undefined],
  }
}

export function prependMessageToInfiniteMessages(
  previous: InfiniteData<AiChatMessagesListResponse> | undefined,
  message: AiChatMessage,
): InfiniteData<AiChatMessagesListResponse> {
  const base: InfiniteData<AiChatMessagesListResponse> = previous ?? emptyMessagesInfiniteData()
  const [firstPage] = base.pages
  if (!firstPage) {
    return {
      pages: [{ messages: [message], hasMore: false }],
      pageParams: base.pageParams?.length ? base.pageParams : [undefined],
    }
  }
  if (firstPage.messages.some((m) => m.messageId === message.messageId)) {
    return base
  }
  const nextFirst = {
    ...firstPage,
    messages: [message, ...firstPage.messages],
  }
  return {
    ...base,
    pages: [nextFirst, ...base.pages.slice(1)],
  }
}

export function buildOptimisticUserMessage(input: {
  optimisticMessageId: MessageId
  clientMessageId: ClientMessageId
  content: string
  createdAt: string
}): AiChatMessage {
  return {
    messageId: input.optimisticMessageId,
    clientMessageId: input.clientMessageId,
    role: AI_CHAT_ROLE.user,
    content: input.content,
    createdAt: input.createdAt,
  }
}

export function buildPartialAssistantMessage(input: {
  messageId: MessageId
  content: string
  createdAt: string
}): AiChatMessage {
  return {
    messageId: input.messageId,
    clientMessageId: null,
    role: AI_CHAT_ROLE.assistant,
    content: input.content,
    createdAt: input.createdAt,
  }
}
