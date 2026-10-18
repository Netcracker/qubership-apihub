import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { syncAiChatCaches } from './chatCache'
import { AI_CHAT_TITLE_POLL_INTERVAL_MS, AI_CHAT_TITLE_POLL_MAX_DURATION_MS } from './constants'
import { aiChatItemKey } from './queryKeys'
import { fetchAiChat } from './requests'
import type { AiChat, ChatId } from './types'

/**
 * Polls GET /chats/:id after the first turn of a new chat until the server sets auto-title,
 * then patches item + History list caches. Same `refetchInterval` pattern as `useExportStatus`.
 */
export function useAiChatTitlePolling(
  chatId: ChatId | null,
  onSettled: () => void,
): void {
  const queryClient = useQueryClient()
  const pollStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!chatId) {
      pollStartedAtRef.current = null
      return
    }
    pollStartedAtRef.current = Date.now()
    const timeoutId = window.setTimeout(onSettled, AI_CHAT_TITLE_POLL_MAX_DURATION_MS)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [chatId, onSettled])

  const { data } = useQuery({
    queryKey: aiChatItemKey(chatId),
    queryFn: ({ signal }) => fetchAiChatForPoll(chatId, signal),
    enabled: chatId !== null,
    staleTime: 0,
    refetchInterval: (previousData) => resolveAiChatTitlePollInterval(previousData, pollStartedAtRef.current),
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (!chatId || !data || !hasAiChatTitle(data.title)) {
      return
    }
    syncAiChatCaches(queryClient, data)
    onSettled()
  }, [chatId, data, onSettled, queryClient])
}

function fetchAiChatForPoll(chatId: ChatId | null, signal?: AbortSignal): Promise<AiChat> {
  if (chatId === null) {
    throw new Error('Title poll query requires chatId')
  }
  return fetchAiChat(chatId, signal)
}

function hasAiChatTitle(title: string): boolean {
  return title.trim().length > 0
}

function isAiChatTitlePollExpired(pollStartedAt: number | null): boolean {
  if (pollStartedAt === null) {
    return false
  }
  return Date.now() - pollStartedAt > AI_CHAT_TITLE_POLL_MAX_DURATION_MS
}

function resolveAiChatTitlePollInterval(
  chat: AiChat | undefined,
  pollStartedAt: number | null,
): number | false {
  if (hasAiChatTitle(chat?.title ?? '')) {
    return false
  }
  if (isAiChatTitlePollExpired(pollStartedAt)) {
    return false
  }
  return AI_CHAT_TITLE_POLL_INTERVAL_MS
}
