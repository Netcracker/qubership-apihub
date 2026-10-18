import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import { AI_CHAT_ROOT, aiChatItemKey, aiChatMessagesKey, isAiChatsInfiniteListQueryKey } from './queryKeys'
import type { AiChat, AiChatsListResponse, ChatId } from './types'

export async function cancelAiChatMutationQueries(
  queryClient: QueryClient,
  chatId: ChatId,
  options?: { includeMessages?: boolean },
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: [AI_CHAT_ROOT, 'chats'] })
  await queryClient.cancelQueries({ queryKey: aiChatItemKey(chatId), exact: true })
  if (options?.includeMessages) {
    await queryClient.cancelQueries({ queryKey: aiChatMessagesKey(chatId), exact: true })
  }
}

export function removeAiChatQueries(queryClient: QueryClient, chatId: ChatId): void {
  queryClient.removeQueries({ queryKey: aiChatItemKey(chatId), exact: true })
  queryClient.removeQueries({ queryKey: aiChatMessagesKey(chatId), exact: true })
}

export function syncAiChatCaches(queryClient: QueryClient, chat: AiChat): void {
  queryClient.setQueryData(aiChatItemKey(chat.chatId), chat)
  patchAiChatInListCaches(queryClient, chat)
}

export function applyLocalChatPatch(chat: AiChat, patch: { title?: string; pinned?: boolean }): AiChat {
  const next: AiChat = patch.title !== undefined
    ? { ...chat, title: patch.title }
    : { ...chat }

  if (patch.pinned === true) {
    next.pinned = true
    return next
  }
  if (patch.pinned === false) {
    delete next.pinned
    return next
  }
  return next
}

function patchAiChatInListCaches(queryClient: QueryClient, chat: AiChat): void {
  queryClient.setQueriesData<InfiniteData<AiChatsListResponse>>(
    { predicate: (query) => isAiChatsInfiniteListQueryKey(query.queryKey) },
    (previous) => {
      if (!previous) {
        return previous
      }
      return {
        ...previous,
        pages: previous.pages.map((page) => ({
          ...page,
          chats: replaceChatInList(page.chats, chat),
        })),
      }
    },
  )
}

function replaceChatInList(chats: AiChat[], updatedChat: AiChat): AiChat[] {
  const index = chats.findIndex((existingChat) => existingChat.chatId === updatedChat.chatId)
  if (index === -1) {
    return chats
  }
  const updatedChats = chats.slice()
  updatedChats[index] = updatedChat
  return updatedChats
}
