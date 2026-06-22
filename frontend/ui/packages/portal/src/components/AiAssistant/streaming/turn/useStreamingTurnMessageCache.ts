import { useQueryClient } from '@tanstack/react-query'
import { type MutableRefObject, useCallback } from 'react'

import {
  buildCachedAssistantMessage,
  prependMessageToInfiniteMessages,
  updateAiChatMessagesCache,
} from '../../api/streaming/messagesCache'
import type { ChatId, MessageId } from '../../api/types'
import { STREAMING_TURN_STATUS } from './streamingTurnConstants'
import { isStreamingTurnStatus, type StreamingTurnState } from './streamingTurnReducer'

type StreamingTurnMessageCacheResult = {
  prependCachedAssistantMessage: (chatId: ChatId, messageId: MessageId, buffer: string) => void
  flushAssistantBufferToCache: (chatId: ChatId) => void
}

/**
 * Writes partial or final assistant text into the messages infinite query
 * (abort, SSE error, or incomplete stream) without waiting for refetch.
 */
export function useStreamingTurnMessageCache(
  stateRef: MutableRefObject<StreamingTurnState>,
): StreamingTurnMessageCacheResult {
  const queryClient = useQueryClient()

  const prependCachedAssistantMessage = useCallback(
    (chatId: ChatId, messageId: MessageId, buffer: string): void => {
      if (!buffer) {
        return
      }
      updateAiChatMessagesCache(queryClient, chatId, (previous) =>
        prependMessageToInfiniteMessages(
          previous,
          buildCachedAssistantMessage({
            messageId: messageId,
            content: buffer,
            createdAt: new Date().toISOString(),
          }),
        ))
    },
    [queryClient],
  )

  const flushAssistantBufferToCache = useCallback((chatId: ChatId): void => {
    const s = stateRef.current
    if (!isStreamingTurnStatus(s, STREAMING_TURN_STATUS.started) || s.chatId !== chatId) {
      return
    }
    prependCachedAssistantMessage(chatId, s.assistantMessageId, s.buffer)
  }, [prependCachedAssistantMessage, stateRef])

  return { prependCachedAssistantMessage, flushAssistantBufferToCache }
}
