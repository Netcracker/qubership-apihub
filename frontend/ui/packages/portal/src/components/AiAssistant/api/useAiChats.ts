import { type QueryFunction, useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query'

import { buildAiChatPaginationQuery } from './aiChatPaginationQuery'
import { aiChatJson } from './client'
import { AI_CHAT_CHATS_PATH } from './paths'
import { aiChatListKey } from './queryKeys'
import type { AiChatsListResponse } from './types'

export function useAiChats(search: string): UseInfiniteQueryResult<AiChatsListResponse, Error> {
  const normalizedSearch = search.trim()

  return useInfiniteQuery<
    AiChatsListResponse,
    Error,
    AiChatsListResponse,
    ReturnType<typeof aiChatListKey>
  >({
    queryKey: aiChatListKey(normalizedSearch),
    queryFn: (async ({ pageParam, signal }) => {
      const query = buildAiChatPaginationQuery({
        before: pageParam,
        ...(normalizedSearch ? { search: normalizedSearch } : {}),
      })

      return aiChatJson<AiChatsListResponse>(
        `${AI_CHAT_CHATS_PATH}?${query}`,
        undefined,
        signal,
      )
    }) satisfies QueryFunction<
      AiChatsListResponse,
      ReturnType<typeof aiChatListKey>,
      string | undefined
    >,
    getNextPageParam: (lastPage): string | undefined => {
      if (!lastPage.hasMore || lastPage.chats.length === 0) {
        return undefined
      }
      return lastPage.chats[lastPage.chats.length - 1]?.lastMessageAt
    },
  })
}
