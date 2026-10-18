import { useQueryClient } from '@tanstack/react-query'
import { type MutableRefObject, useCallback } from 'react'

import { runStreamTurn } from '../../api/streaming/runStreamTurn'
import type { ProcessStreamBatchHandler, RunStreamTurnHandler } from '../../api/streaming/types'
import type { ChatId, ClientMessageId } from '../../api/types'
import { STREAMING_TURN_ACTION } from './streamingTurnConstants'
import { isStreamingBusy, type StreamingTurnAction, type StreamingTurnState } from './streamingTurnReducer'

type StreamingTurnStreamRunDeps = {
  stateRef: MutableRefObject<StreamingTurnState>
  abortControllerRef: MutableRefObject<AbortController | null>
  dispatchTurn: (action: StreamingTurnAction) => void
  flushAssistantBufferToCache: (chatId: ChatId) => void
  processBatch: ProcessStreamBatchHandler
  routeActiveChatId: ChatId | null
  resetActiveChat: () => void
}

export function useStreamingTurnStreamRun(deps: StreamingTurnStreamRunDeps): RunStreamTurnHandler {
  const queryClient = useQueryClient()
  const {
    stateRef,
    abortControllerRef,
    dispatchTurn,
    flushAssistantBufferToCache,
    processBatch,
    routeActiveChatId,
    resetActiveChat,
  } = deps

  return useCallback(
    async (chatId: ChatId, trimmed: string, clientMessageId: ClientMessageId): Promise<void> => {
      await runStreamTurn({
        queryClient: queryClient,
        chatId: chatId,
        trimmed: trimmed,
        clientMessageId: clientMessageId,
        abortControllerRef: abortControllerRef,
        callbacks: {
          processBatch: processBatch,
          isTurnStillBusy: () => isStreamingBusy(stateRef.current),
          onAbort: () => dispatchTurn({ type: STREAMING_TURN_ACTION.aborted }),
          onReset: () => dispatchTurn({ type: STREAMING_TURN_ACTION.reset }),
          flushAssistantBuffer: flushAssistantBufferToCache,
          onActiveChatNotFound: (activeChatId) => {
            if (routeActiveChatId === activeChatId) {
              resetActiveChat()
            }
          },
        },
      })
    },
    [
      abortControllerRef,
      dispatchTurn,
      flushAssistantBufferToCache,
      processBatch,
      queryClient,
      resetActiveChat,
      routeActiveChatId,
      stateRef,
    ],
  )
}
