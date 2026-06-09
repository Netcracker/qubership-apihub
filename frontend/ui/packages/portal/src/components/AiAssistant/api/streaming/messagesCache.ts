import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import { aiChatMessagesKey } from '../queryKeys'
import {
  AI_CHAT_ROLE,
  type AiChatMessage,
  type AiChatMessagesListResponse,
  type ChatId,
  type ClientMessageId,
  type MessageId,
} from '../types'

type CachedUserMessageInput = {
  messageId: MessageId
  clientMessageId: ClientMessageId
  content: string
  createdAt: string
}

type CachedAssistantMessageInput = {
  messageId: MessageId
  content: string
  createdAt: string
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

export function buildCachedUserMessage(input: CachedUserMessageInput): AiChatMessage {
  return {
    messageId: input.messageId,
    clientMessageId: input.clientMessageId,
    role: AI_CHAT_ROLE.user,
    content: input.content,
    createdAt: input.createdAt,
  }
}

export function buildCachedAssistantMessage(input: CachedAssistantMessageInput): AiChatMessage {
  return {
    messageId: input.messageId,
    clientMessageId: null,
    role: AI_CHAT_ROLE.assistant,
    content: input.content,
    createdAt: input.createdAt,
  }
}

export function updateAiChatMessagesCache(
  queryClient: QueryClient,
  chatId: ChatId,
  updater: (
    previous: InfiniteData<AiChatMessagesListResponse> | undefined,
  ) => InfiniteData<AiChatMessagesListResponse>,
): void {
  queryClient.setQueryData(aiChatMessagesKey(chatId), updater)
}

function emptyMessagesInfiniteData(): InfiniteData<AiChatMessagesListResponse> {
  return {
    pages: [{ messages: [], hasMore: false }],
    pageParams: [undefined],
  }
}
