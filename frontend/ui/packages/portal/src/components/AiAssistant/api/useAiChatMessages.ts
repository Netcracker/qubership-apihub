import { type QueryFunction, useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query'

import { buildAiChatPaginationQuery } from './aiChatPaginationQuery'
import { aiChatJson } from './client'
import { aiChatMessagesPath } from './paths'
import { aiChatMessagesKey } from './queryKeys'
import type { AiChatMessagesListResponse, ChatId } from './types'

export function useAiChatMessages(chatId: ChatId | null): UseInfiniteQueryResult<AiChatMessagesListResponse, Error> {
  return useInfiniteQuery<
    AiChatMessagesListResponse,
    Error,
    AiChatMessagesListResponse,
    ReturnType<typeof aiChatMessagesKey>
  >({
    queryKey: aiChatMessagesKey(chatId),
    enabled: chatId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: (async ({ pageParam, signal }) => {
      const query = buildAiChatPaginationQuery({ before: pageParam })
      return aiChatJson<AiChatMessagesListResponse>(
        `${aiChatMessagesPath(chatId!)}?${query}`,
        undefined,
        signal,
      )
    }) satisfies QueryFunction<
      AiChatMessagesListResponse,
      ReturnType<typeof aiChatMessagesKey>,
      string | undefined
    >,
    getNextPageParam: (lastPage): string | undefined => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) {
        return undefined
      }
      const oldestInPage = lastPage.messages[lastPage.messages.length - 1]
      return oldestInPage?.createdAt
    },
  })
}
