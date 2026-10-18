import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { type MutableRefObject, useCallback } from 'react'

import { invalidateAiChatMessagesQuery } from '../../api/aiChatQueryInvalidation'
import { dispatchAiChatFetchError } from '../../api/errors'
import {
  isAiChatAssistantCompletedStreamEvent,
  isAiChatStreamDoneEvent,
  isAiChatStreamErrorEvent,
  isAssistantStreamProgressEvent,
} from '../../api/streamEvents'
import { prependMessageToInfiniteMessages, updateAiChatMessagesCache } from '../../api/streaming/messagesCache'
import { toStreamFetchErrorDetail } from '../../api/streaming/streamErrors'
import type { ProcessStreamBatchHandler } from '../../api/streaming/types'
import type { AiChatMessage, AiChatStreamErrorEvent, AiChatStreamEvent, ChatId, MessageId } from '../../api/types'
import { STREAM_ERROR_DEFAULT_MESSAGE, STREAMING_TURN_ACTION, STREAMING_TURN_STATUS } from './streamingTurnConstants'
import {
  isStreamingTurnStatus,
  peekAssistantBufferBeforeErrorInBatch,
  type StreamingTurnAction,
  type StreamingTurnState,
} from './streamingTurnReducer'

type StartAutoTitlePollingHandler = (chatId: ChatId) => void

type StreamingTurnSseBatchProcessorDeps = {
  stateRef: MutableRefObject<StreamingTurnState>
  turnBootstrapRef: MutableRefObject<StreamingTurnState | null>
  createdChatThisTurnRef: MutableRefObject<boolean>
  startAutoTitlePolling: StartAutoTitlePollingHandler
  lastAssistantMessageActivityAtRef: MutableRefObject<number | null>
  clearThinkingDuringAssistantPause: () => void
  prependCachedAssistantMessage: (chatId: ChatId, messageId: MessageId, buffer: string) => void
  dispatchTurn: (action: StreamingTurnAction) => void
}

type ProcessStreamBatchParams = StreamingTurnSseBatchProcessorDeps & {
  queryClient: QueryClient
  chatId: ChatId
  batch: readonly AiChatStreamEvent[]
}

/**
 * Applies one SSE batch: React Query side effects, then reducer (`sseBatch`).
 * Used on every TCP chunk from `streamAiChatTurn` (see README Layer 2).
 */
export function useStreamingTurnSseBatchProcessor(
  deps: StreamingTurnSseBatchProcessorDeps,
): ProcessStreamBatchHandler {
  const queryClient = useQueryClient()
  const {
    stateRef,
    turnBootstrapRef,
    createdChatThisTurnRef,
    startAutoTitlePolling,
    lastAssistantMessageActivityAtRef,
    clearThinkingDuringAssistantPause,
    prependCachedAssistantMessage,
    dispatchTurn,
  } = deps

  return useCallback(
    (chatId: ChatId, batch: readonly AiChatStreamEvent[]): void => {
      processStreamBatch({
        queryClient,
        chatId,
        batch,
        stateRef,
        turnBootstrapRef,
        createdChatThisTurnRef,
        startAutoTitlePolling,
        lastAssistantMessageActivityAtRef,
        clearThinkingDuringAssistantPause,
        prependCachedAssistantMessage,
        dispatchTurn,
      })
    },
    [
      queryClient,
      stateRef,
      turnBootstrapRef,
      createdChatThisTurnRef,
      startAutoTitlePolling,
      lastAssistantMessageActivityAtRef,
      clearThinkingDuringAssistantPause,
      prependCachedAssistantMessage,
      dispatchTurn,
    ],
  )
}

function processStreamBatch(params: ProcessStreamBatchParams): void {
  const {
    queryClient,
    chatId,
    batch,
    stateRef,
    turnBootstrapRef,
    createdChatThisTurnRef,
    startAutoTitlePolling,
    lastAssistantMessageActivityAtRef,
    clearThinkingDuringAssistantPause,
    prependCachedAssistantMessage,
    dispatchTurn,
  } = params

  const running = resolveRunningStateForSseBatch(stateRef, turnBootstrapRef)

  const bufferBeforeError = peekAssistantBufferBeforeErrorInBatch(running, batch)
  if (bufferBeforeError !== null) {
    prependCachedAssistantMessage(
      chatId,
      bufferBeforeError.assistantMessageId,
      bufferBeforeError.buffer,
    )
  }

  for (const event of batch) {
    if (isAssistantStreamProgressEvent(event)) {
      recordAssistantStreamProgress(lastAssistantMessageActivityAtRef, clearThinkingDuringAssistantPause)
    }
    if (isAiChatAssistantCompletedStreamEvent(event)) {
      prependAssistantCompletedMessageToCache(queryClient, chatId, event.message)
    }
    if (isAiChatStreamErrorEvent(event)) {
      applyStreamErrorEvent(event)
    }
    if (isAiChatStreamDoneEvent(event)) {
      applyStreamDoneSideEffects(queryClient, chatId, createdChatThisTurnRef, startAutoTitlePolling)
    }
  }

  dispatchTurn({ type: STREAMING_TURN_ACTION.sseBatch, events: batch })
  turnBootstrapRef.current = null
}

function resolveRunningStateForSseBatch(
  stateRef: MutableRefObject<StreamingTurnState>,
  turnBootstrapRef: MutableRefObject<StreamingTurnState | null>,
): StreamingTurnState {
  const { current } = stateRef
  return !isStreamingTurnStatus(current, STREAMING_TURN_STATUS.idle)
    ? current
    : (turnBootstrapRef.current ?? current)
}

function recordAssistantStreamProgress(
  lastAssistantMessageActivityAtRef: MutableRefObject<number | null>,
  clearThinkingDuringAssistantPause: () => void,
): void {
  lastAssistantMessageActivityAtRef.current = Date.now()
  clearThinkingDuringAssistantPause()
}

function applyStreamErrorEvent(event: AiChatStreamErrorEvent): void {
  dispatchAiChatFetchError(toStreamFetchErrorDetail(
    event.message || STREAM_ERROR_DEFAULT_MESSAGE,
    event.code,
  ))
}

function applyStreamDoneSideEffects(
  queryClient: QueryClient,
  chatId: ChatId,
  createdChatThisTurnRef: MutableRefObject<boolean>,
  startAutoTitlePolling: StartAutoTitlePollingHandler,
): void {
  void invalidateAiChatMessagesQuery(queryClient, chatId, { refetchType: 'none' })
  if (!createdChatThisTurnRef.current) {
    return
  }
  createdChatThisTurnRef.current = false
  startAutoTitlePolling(chatId)
}

function prependAssistantCompletedMessageToCache(
  queryClient: QueryClient,
  chatId: ChatId,
  message: AiChatMessage,
): void {
  updateAiChatMessagesCache(queryClient, chatId, (previous) => prependMessageToInfiniteMessages(previous, message))
}
