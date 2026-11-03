import { AI_CHAT_STREAM_EVENT } from '../../types'
import { parseSseFrame } from './sseFrameParser'

describe('parseSseFrame', () => {
  it('returns null for JSON null', () => {
    expect(parseSseFrame({ event: 'message', data: 'null' })).toBeNull()
  })

  it('returns null for JSON array', () => {
    expect(parseSseFrame({ event: 'message', data: '[]' })).toBeNull()
  })

  it('parses valid object payload and merges type from data', () => {
    const event = parseSseFrame({
      event: 'message',
      data: JSON.stringify({
        type: AI_CHAT_STREAM_EVENT.assistantDelta,
        delta: 'x',
      }),
    })

    expect(event).toEqual({
      type: AI_CHAT_STREAM_EVENT.assistantDelta,
      delta: 'x',
    })
  })

  it('falls back to frame event when type is missing in payload', () => {
    expect(parseSseFrame({ event: AI_CHAT_STREAM_EVENT.done, data: '{}' })).toEqual({
      type: AI_CHAT_STREAM_EVENT.done,
    })
  })
})
