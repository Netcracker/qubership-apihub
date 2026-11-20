import { AI_CHAT_STREAM_EVENT } from '../../api/types'
import { STREAMING_TURN_ACTION, STREAMING_TURN_STATUS } from './streamingTurnConstants'
import { isStreamingBusy, streamingTurnReducer, type StreamingTurnState } from './streamingTurnReducer'

const started: Extract<StreamingTurnState, { status: typeof STREAMING_TURN_STATUS.started }> = {
  status: STREAMING_TURN_STATUS.started,
  chatId: 'c1',
  assistantMessageId: 'asst-1',
  buffer: 'partial answer',
}

describe('post-stream busy guard', () => {
  it('reducer is idle after terminal batch but an unupdated ref still looks busy', () => {
    const terminalBatch = {
      type: STREAMING_TURN_ACTION.sseBatch,
      events: [{ type: AI_CHAT_STREAM_EVENT.done }],
    } as const
    expect(isStreamingBusy(streamingTurnReducer(started, terminalBatch))).toBe(false)

    const staleRef = { current: started }
    streamingTurnReducer(staleRef.current, terminalBatch)
    expect(isStreamingBusy(staleRef.current)).toBe(true)
  })

  it('dispatchTurn pattern: assign reducer result to ref before React dispatch', () => {
    let refState: StreamingTurnState = started
    refState = streamingTurnReducer(refState, {
      type: STREAMING_TURN_ACTION.sseBatch,
      events: [{ type: AI_CHAT_STREAM_EVENT.done }],
    })
    expect(isStreamingBusy(refState)).toBe(false)
  })
})
