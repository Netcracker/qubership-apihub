import { useCallback, useMemo, useRef, useState } from 'react'

import type { ChatId } from '../../api/types'
import { useAiChatTitlePolling } from '../../api/useAiChatTitlePolling'
import type { StreamingActions, StreamingLive, StreamingTurnStatus } from '../../state/panelContext'
import { STREAMING_TURN_ACTION } from './streamingTurnConstants'
import { getActiveTurnChatId, isStreamingBusy, type StreamingTurnState } from './streamingTurnReducer'
import { useStreamingTurnSseBatchProcessor } from './streamingTurnSseBatch'
import { useAssistantThinkingDuringPause } from './useAssistantThinkingDuringPause'
import { useStreamingTurnMessageCache } from './useStreamingTurnMessageCache'
import { useStreamingTurnReducerSync } from './useStreamingTurnReducerSync'
import { useStreamingTurnStreamRun } from './useStreamingTurnStreamRun'
import { useStreamingTurnSubmit } from './useStreamingTurnSubmit'

type StreamingTurnDeps = {
  openChatScreen: (chatId: ChatId | null) => void
  resetActiveChat: () => void
  activeChatId: ChatId | null
}

type UseStreamingTurnResult = {
  actions: StreamingActions
  streamingTurnStatus: StreamingTurnStatus
  live: StreamingLive
}

/**
 * Live turn orchestration for `AiAssistantProvider`: submit/abort, reducer, SSE batches, cache.
 * Splits return value into actions / streamingTurnStatus / live contexts (see streaming README).
 */
export function useStreamingTurn({
  openChatScreen,
  resetActiveChat,
  activeChatId: routeActiveChatId,
}: StreamingTurnDeps): UseStreamingTurnResult {
  const { state, stateRef, dispatchTurn, abortControllerRef } = useStreamingTurnReducerSync()

  const turnBootstrapRef = useRef<StreamingTurnState | null>(null)
  const createdChatThisTurnRef = useRef(false)
  const [chatIdAwaitingAutoTitle, setChatIdAwaitingAutoTitle] = useState<ChatId | null>(null)

  const stopAutoTitlePolling = useCallback((): void => {
    setChatIdAwaitingAutoTitle(null)
  }, [])

  const startAutoTitlePolling = useCallback((chatId: ChatId): void => {
    setChatIdAwaitingAutoTitle(chatId)
  }, [])

  useAiChatTitlePolling(chatIdAwaitingAutoTitle, stopAutoTitlePolling)

  const {
    thinkingDuringAssistantPause,
    lastAssistantMessageActivityAtRef,
    clearThinkingDuringAssistantPause,
  } = useAssistantThinkingDuringPause(state)

  const { prependCachedAssistantMessage, flushAssistantBufferToCache } = useStreamingTurnMessageCache(stateRef)

  const processBatch = useStreamingTurnSseBatchProcessor({
    stateRef,
    turnBootstrapRef,
    createdChatThisTurnRef,
    startAutoTitlePolling,
    lastAssistantMessageActivityAtRef,
    clearThinkingDuringAssistantPause,
    prependCachedAssistantMessage,
    dispatchTurn,
  })

  const runTurn = useStreamingTurnStreamRun({
    stateRef,
    abortControllerRef,
    dispatchTurn,
    flushAssistantBufferToCache,
    processBatch,
    routeActiveChatId,
    resetActiveChat,
  })

  const submit = useStreamingTurnSubmit({
    openChatScreen,
    dispatchTurn,
    turnBootstrapRef,
    createdChatThisTurnRef,
    runTurn,
  })

  const abort = useCallback((): void => {
    abortControllerRef.current?.abort()
  }, [abortControllerRef])

  const reset = useCallback((): void => {
    dispatchTurn({ type: STREAMING_TURN_ACTION.reset })
  }, [dispatchTurn])

  const actions = useMemo<StreamingActions>(() => ({
    submit,
    abort,
    reset,
  }), [submit, abort, reset])

  const isBusy = isStreamingBusy(state)
  const activeTurnChatId = getActiveTurnChatId(state)

  const streamingTurnStatus = useMemo<StreamingTurnStatus>(() => ({
    isBusy,
    activeTurnChatId,
  }), [isBusy, activeTurnChatId])

  const live = useMemo<StreamingLive>(() => ({
    state,
    thinkingDuringAssistantPause,
  }), [state, thinkingDuringAssistantPause])

  return {
    actions,
    streamingTurnStatus,
    live,
  }
}
