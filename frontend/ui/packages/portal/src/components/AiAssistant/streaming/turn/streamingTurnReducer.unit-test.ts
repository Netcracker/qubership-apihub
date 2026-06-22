import { AI_CHAT_STREAM_EVENT } from '../../api/types'
import { STREAMING_TURN_ACTION, STREAMING_TURN_STATUS } from './streamingTurnConstants'
import {
  applyStreamingSseEvent,
  peekAssistantBufferBeforeErrorInBatch,
  STREAMING_TURN_IDLE_STATE,
  streamingTurnReducer,
  type StreamingTurnState,
} from './streamingTurnReducer'

const pending: Extract<StreamingTurnState, { status: typeof STREAMING_TURN_STATUS.pending }> = {
  status: STREAMING_TURN_STATUS.pending,
  chatId: 'c1',
}

describe('streamingTurnReducer', () => {
  it('applies turn.requested', () => {
    const next = streamingTurnReducer(STREAMING_TURN_IDLE_STATE, {
      type: STREAMING_TURN_ACTION.turnRequested,
      chatId: 'c1',
    })
    expect(next).toEqual(pending)
  })

  it('folds sseBatch deltas without dropping intermediate buffer', () => {
    let s: StreamingTurnState = pending
    s = applyStreamingSseEvent(s, {
      type: AI_CHAT_STREAM_EVENT.assistantStart,
      messageId: 'asst-1',
    })
    const batch = [
      { type: AI_CHAT_STREAM_EVENT.assistantDelta, delta: 'a' } as const,
      { type: AI_CHAT_STREAM_EVENT.assistantDelta, delta: 'b' } as const,
      { type: AI_CHAT_STREAM_EVENT.assistantDelta, delta: 'c' } as const,
    ]
    const folded = streamingTurnReducer(s, { type: STREAMING_TURN_ACTION.sseBatch, events: batch })
    expect(folded.status).toBe(STREAMING_TURN_STATUS.started)
    if (folded.status === STREAMING_TURN_STATUS.started) {
      expect(folded.buffer).toBe('abc')
    }
  })

  it('peekAssistantBufferBeforeErrorInBatch captures buffer before error clears state', () => {
    let s: StreamingTurnState = pending
    s = applyStreamingSseEvent(s, { type: AI_CHAT_STREAM_EVENT.assistantStart, messageId: 'asst-1' })
    s = applyStreamingSseEvent(s, { type: AI_CHAT_STREAM_EVENT.assistantDelta, delta: 'partial' })
    const peek = peekAssistantBufferBeforeErrorInBatch(s, [
      { type: AI_CHAT_STREAM_EVENT.assistantDelta, delta: '!' },
      { type: AI_CHAT_STREAM_EVENT.error, code: 'APIHUB-AI-5001', message: 'fail' },
    ])
    expect(peek?.buffer).toBe('partial!')
  })

  it('ignores tool frames', () => {
    let s: StreamingTurnState = pending
    s = applyStreamingSseEvent(s, { type: AI_CHAT_STREAM_EVENT.assistantStart, messageId: 'asst-1' })
    const next = applyStreamingSseEvent(s, {
      type: AI_CHAT_STREAM_EVENT.toolStarted,
      toolCallId: 't1',
      name: 'x',
    })
    expect(next).toEqual(s)
  })
})
