import { AI_CHAT_STREAM_EVENT, type AiChatStreamEvent, type ChatId, type MessageId } from '../../api/types'
import { STREAMING_TURN_ACTION, STREAMING_TURN_STATUS, type StreamingTurnStatus } from './streamingTurnConstants'

type AssistantStreamBuffer = {
  chatId: ChatId
  assistantMessageId: MessageId
  buffer: string
}

export type StreamingTurnState =
  | { status: typeof STREAMING_TURN_STATUS.idle }
  | {
    status: typeof STREAMING_TURN_STATUS.pending
    chatId: ChatId
  }
  | {
    status: typeof STREAMING_TURN_STATUS.started
    chatId: ChatId
    assistantMessageId: MessageId
    buffer: string
  }

export type StreamingTurnAction =
  | {
    type: typeof STREAMING_TURN_ACTION.turnRequested
    chatId: ChatId
  }
  | { type: typeof STREAMING_TURN_ACTION.sseBatch; events: readonly AiChatStreamEvent[] }
  | { type: typeof STREAMING_TURN_ACTION.aborted }
  | { type: typeof STREAMING_TURN_ACTION.reset }

export const STREAMING_TURN_IDLE_STATE: StreamingTurnState = { status: STREAMING_TURN_STATUS.idle }

export function streamingTurnReducer(
  state: StreamingTurnState,
  action: StreamingTurnAction,
): StreamingTurnState {
  switch (action.type) {
    case STREAMING_TURN_ACTION.reset:
    case STREAMING_TURN_ACTION.aborted:
      return STREAMING_TURN_IDLE_STATE
    case STREAMING_TURN_ACTION.turnRequested:
      return {
        status: STREAMING_TURN_STATUS.pending,
        chatId: action.chatId,
      }
    case STREAMING_TURN_ACTION.sseBatch:
      return action.events.reduce<StreamingTurnState>((s, ev) => applyStreamingSseEvent(s, ev), state)
    default:
      return state
  }
}

export function applyStreamingSseEvent(
  state: StreamingTurnState,
  event: AiChatStreamEvent,
): StreamingTurnState {
  switch (event.type) {
    case AI_CHAT_STREAM_EVENT.assistantStart:
      if (state.status !== STREAMING_TURN_STATUS.pending) {
        return state
      }
      if (!('messageId' in event) || typeof event.messageId !== 'string') {
        return state
      }
      return {
        status: STREAMING_TURN_STATUS.started,
        chatId: state.chatId,
        assistantMessageId: event.messageId as MessageId,
        buffer: '',
      }
    case AI_CHAT_STREAM_EVENT.assistantDelta:
      if (state.status !== STREAMING_TURN_STATUS.started) {
        return state
      }
      return {
        ...state,
        buffer: state.buffer + (typeof event.delta === 'string' ? event.delta : ''),
      }
    case AI_CHAT_STREAM_EVENT.assistantCompleted:
    case AI_CHAT_STREAM_EVENT.done:
    case AI_CHAT_STREAM_EVENT.error:
      if (state.status === STREAMING_TURN_STATUS.idle) {
        return state
      }
      return STREAMING_TURN_IDLE_STATE
    default:
      return state
  }
}

/** When a batch contains `error`, returns stream buffer to cache before reducer clears state. */
export function peekAssistantBufferBeforeErrorInBatch(
  state: StreamingTurnState,
  events: readonly AiChatStreamEvent[],
): AssistantStreamBuffer | null {
  let s = state
  for (const ev of events) {
    if (ev.type === AI_CHAT_STREAM_EVENT.error) {
      if (s.status === STREAMING_TURN_STATUS.started && s.buffer.length > 0) {
        return { chatId: s.chatId, assistantMessageId: s.assistantMessageId, buffer: s.buffer }
      }
      return null
    }
    s = applyStreamingSseEvent(s, ev)
  }
  return null
}

export function isStreamingBusy(state: StreamingTurnState): boolean {
  return state.status === STREAMING_TURN_STATUS.pending || state.status === STREAMING_TURN_STATUS.started
}

export function getActiveTurnChatId(state: StreamingTurnState): ChatId | null {
  if (state.status === STREAMING_TURN_STATUS.idle) {
    return null
  }
  return state.chatId
}

export function isStreamingTurnStatus<S extends StreamingTurnStatus>(
  state: StreamingTurnState,
  status: S,
): state is Extract<StreamingTurnState, { status: S }> {
  return state.status === status
}
