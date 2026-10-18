import type { InvalidateQueryFilters, QueryClient } from '@tanstack/react-query'

import { aiChatItemKey, aiChatMessagesKey, isAiChatsInfiniteListQueryKey } from './queryKeys'
import type { ChatId } from './types'

type InvalidateOptions = Pick<InvalidateQueryFilters, 'refetchType'>

const listQueryPredicate = (query: { queryKey: readonly unknown[]; getObserversCount: () => number }): boolean => {
  return isAiChatsInfiniteListQueryKey(query.queryKey)
}

/**
 * Marks History chat-list queries stale (all search keys). Removes list caches with no
 * subscribers first. `refetchType` defaults to `'active'` (refetch when History is mounted);
 * `'none'` only marks stale (e.g. after stream `done` while the chat screen is open).
 */
export function invalidateAiChatListQueries(
  queryClient: QueryClient,
  options: InvalidateOptions = {},
): Promise<void> {
  // Drop unsubscribed list caches (e.g. previous History search strings) so they do not linger stale.
  queryClient.removeQueries({
    predicate: (query) => listQueryPredicate(query) && query.getObserversCount() === 0,
  })
  return queryClient.invalidateQueries({
    predicate: (query) => listQueryPredicate(query),
    refetchType: options.refetchType ?? 'active',
  })
}

/**
 * Marks the messages cache for one chat stale (`aiChatMessagesKey`).
 * `refetchType` defaults to `'active'`; `'none'` keeps the SSE-filled cache until the chat is opened again.
 */
export function invalidateAiChatPerChatQueries(queryClient: QueryClient, chatId: ChatId): void {
  void queryClient.invalidateQueries({ queryKey: aiChatItemKey(chatId), exact: true })
  void queryClient.invalidateQueries({ queryKey: aiChatMessagesKey(chatId), exact: true })
}

export function invalidateAiChatMessagesQuery(
  queryClient: QueryClient,
  chatId: ChatId,
  options: InvalidateOptions = {},
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: aiChatMessagesKey(chatId),
    exact: true,
    refetchType: options.refetchType ?? 'active',
  })
}
