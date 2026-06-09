import { splitSseFrames } from './sseFramer'

describe('splitSseFrames', () => {
  it('parses a single frame with CRLF delimiter', () => {
    const input = 'event: foo\r\ndata: {"type":"x"}\r\n\r\n'
    const { frames, rest } = splitSseFrames(input)
    expect(rest).toBe('')
    expect(frames).toEqual([{ event: 'foo', data: '{"type":"x"}' }])
  })

  it('joins multi-line data fields with newline', () => {
    const input = 'event: message\ndata: line1\ndata: line2\n\n'
    const { frames } = splitSseFrames(input)
    expect(frames).toEqual([{ event: 'message', data: 'line1\nline2' }])
  })

  it('ignores comment / heartbeat lines and still parses data', () => {
    const input = ': ping\n\ndata: hello\n\n'
    const { frames } = splitSseFrames(input)
    expect(frames).toEqual([{ event: 'message', data: 'hello' }])
  })

  it('handles split across chunks via incremental buffer', () => {
    const part1 = 'data: {"a":1}\n'
    const part2 = '\n'
    const a = splitSseFrames(part1)
    expect(a.frames).toHaveLength(0)
    expect(a.rest).toBe(part1)
    const b = splitSseFrames(a.rest + part2)
    expect(b.frames).toEqual([{ event: 'message', data: '{"a":1}' }])
    expect(b.rest).toBe('')
  })

  it('parses multiple frames in one buffer', () => {
    const input = 'data: one\n\n' + 'data: two\n\n'
    const { frames, rest } = splitSseFrames(input)
    expect(frames).toEqual([
      { event: 'message', data: 'one' },
      { event: 'message', data: 'two' },
    ])
    expect(rest).toBe('')
  })

  it('drops frames with no data lines', () => {
    const input = ': only-comment\n\n'
    const { frames } = splitSseFrames(input)
    expect(frames).toHaveLength(0)
  })

  it('uses event name from event: line and falls back to message', () => {
    const input = 'event: done\ndata: {}\n\n'
    const { frames } = splitSseFrames(input)
    expect(frames[0]?.event).toBe('done')
  })
})
