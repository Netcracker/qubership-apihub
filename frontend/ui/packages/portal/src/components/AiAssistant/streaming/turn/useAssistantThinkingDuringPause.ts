import { type MutableRefObject, useEffect, useRef, useState } from 'react'

import {
  ASSISTANT_MESSAGE_IDLE_FOR_THINKING_MS,
  STREAM_THINKING_POLL_MS,
  STREAMING_TURN_STATUS,
} from './streamingTurnConstants'
import { isStreamingTurnStatus, type StreamingTurnState } from './streamingTurnReducer'

type AssistantThinkingDuringPauseResult = {
  thinkingDuringAssistantPause: boolean
  lastAssistantMessageActivityAtRef: MutableRefObject<number | null>
  clearThinkingDuringAssistantPause: () => void
}

/**
 * Thinking during `started` when no assistant token for ~1s.
 */
export function useAssistantThinkingDuringPause(
  state: StreamingTurnState,
): AssistantThinkingDuringPauseResult {
  const lastAssistantMessageActivityAtRef = useRef<number | null>(null)
  const [thinkingDuringAssistantPause, setThinkingDuringAssistantPause] = useState(false)

  const clearThinkingDuringAssistantPause = (): void => {
    setThinkingDuringAssistantPause(false)
  }

  useEffect(() => {
    if (isStreamingTurnStatus(state, STREAMING_TURN_STATUS.idle)) {
      lastAssistantMessageActivityAtRef.current = null
      setThinkingDuringAssistantPause(false)
    }
  }, [state])

  const streamPollKey = isStreamingTurnStatus(state, STREAMING_TURN_STATUS.started) ? state.chatId : null

  // Poll: tool-only SSE keeps `started` without deltas; a per-delta timeout does not cover that.
  useEffect(() => {
    if (!isStreamingTurnStatus(state, STREAMING_TURN_STATUS.started)) {
      return
    }
    const evaluateThinkingDuringAssistantPause = (): void => {
      const lastAt = lastAssistantMessageActivityAtRef.current
      if (lastAt === null) {
        clearThinkingDuringAssistantPause()
        return
      }
      const shouldShowThinking = Date.now() - lastAt >= ASSISTANT_MESSAGE_IDLE_FOR_THINKING_MS
      setThinkingDuringAssistantPause(shouldShowThinking)
    }
    evaluateThinkingDuringAssistantPause()
    const id = window.setInterval(evaluateThinkingDuringAssistantPause, STREAM_THINKING_POLL_MS)
    return () => window.clearInterval(id)
  }, [state, streamPollKey])

  return {
    thinkingDuringAssistantPause,
    lastAssistantMessageActivityAtRef,
    clearThinkingDuringAssistantPause,
  }
}
