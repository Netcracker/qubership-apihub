import { type MutableRefObject, useCallback, useEffect, useReducer, useRef } from 'react'

import {
  STREAMING_TURN_IDLE_STATE,
  type StreamingTurnAction,
  streamingTurnReducer,
  type StreamingTurnState,
} from './streamingTurnReducer'

type StreamingTurnReducerSyncResult = {
  state: StreamingTurnState
  stateRef: MutableRefObject<StreamingTurnState>
  dispatchTurn: (action: StreamingTurnAction) => void
  abortControllerRef: MutableRefObject<AbortController | null>
}

/**
 * Turn reducer plus a ref updated in the same pass as `dispatchTurn`.
 * The ref lets post-stream guards read fresh state before React re-renders (see README).
 */
export function useStreamingTurnReducerSync(): StreamingTurnReducerSyncResult {
  const [state, dispatch] = useReducer(streamingTurnReducer, STREAMING_TURN_IDLE_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const abortControllerRef = useRef<AbortController | null>(null)

  /** Keep ref in sync with reducer before React re-renders (post-stream busy check reads ref). */
  const dispatchTurn = useCallback((action: StreamingTurnAction): void => {
    stateRef.current = streamingTurnReducer(stateRef.current, action)
    dispatch(action)
  }, [])

  useEffect(() => {
    const controllers = abortControllerRef
    return () => {
      controllers.current?.abort()
    }
  }, [])

  return { state, stateRef, dispatchTurn, abortControllerRef }
}
