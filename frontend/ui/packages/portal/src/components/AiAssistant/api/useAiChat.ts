import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { aiChatJson } from './client'
import { aiChatItemPath } from './paths'
import { aiChatDisabledItemKey, aiChatItemKey } from './queryKeys'
import type { AiChat, ChatId } from './types'

export function useAiChat(chatId: ChatId | null): UseQueryResult<AiChat, Error> {
  return useQuery({
    queryKey: chatId ? aiChatItemKey(chatId) : aiChatDisabledItemKey,
    queryFn: ({ signal }) => aiChatJson<AiChat>(aiChatItemPath(chatId!), undefined, signal),
    enabled: chatId !== null,
  })
}
