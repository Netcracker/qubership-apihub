import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query'

import { aiChatJson } from './client'
import { AI_CHAT_CHATS_PATH } from './paths'
import { aiChatListKey } from './queryKeys'
import type { AiChatsListResponse } from './types'

const CHATS_PAGE_LIMIT = 100

export function useAiChats(search: string): UseInfiniteQueryResult<AiChatsListResponse, Error> {
  const normalizedSearch = search.trim()

  return useInfiniteQuery<AiChatsListResponse, Error>({
    queryKey: aiChatListKey(normalizedSearch),
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: String(CHATS_PAGE_LIMIT) })
      if (normalizedSearch) {
        params.set('search', normalizedSearch)
      }
      if (typeof pageParam === 'string' && pageParam.length > 0) {
        params.set('before', pageParam)
      }

      return aiChatJson<AiChatsListResponse>(
        `${AI_CHAT_CHATS_PATH}?${params.toString()}`,
        undefined,
        signal,
      )
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.chats.length === 0) {
        return undefined
      }
      return lastPage.chats[lastPage.chats.length - 1]?.lastMessageAt
    },
  })
}
