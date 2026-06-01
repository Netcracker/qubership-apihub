export type SseFrame = {
  event: string
  data: string
}

const DOUBLE_NEWLINE = /\r?\n\r?\n/

/**
 * Splits a buffer into complete SSE frames (delimited by blank line).
 * Ignores comment/heartbeat lines (`:` prefix). Joins multi-line `data:` fields with newline.
 */
export function splitSseFrames(input: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = []
  let rest = input
  while (rest.length > 0) {
    const match = DOUBLE_NEWLINE.exec(rest)
    if (match === null) {
      break
    }
    const block = rest.slice(0, match.index)
    rest = rest.slice(match.index + match[0].length)
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) {
        continue
      }
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
        continue
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''))
        continue
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event: eventName, data: dataLines.join('\n') })
    }
  }
  return { frames, rest }
}
