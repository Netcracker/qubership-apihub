import { type AiChatStreamRequestBody, postAiChatMessageStream } from '../../requests'
import type { AiChatStreamEvent, ChatId } from '../../types'
import { parseSseFrame } from './sseFrameParser'
import { splitSseFrames } from './sseFramer'

type ParsedSseBufferResult = {
  events: AiChatStreamEvent[]
  rest: string
}

/**
 * Async generator (`async function*` + `yield`) for POST `/messages/stream`.
 *
 * A natural fit for SSE: the HTTP body arrives over time and
 * the consumer (`for await` in `useStreamingTurn`) pulls the next batch when ready instead
 * of buffering the whole response. Inner `yield*` delegates batched events via `yieldEventBatchIfAny`.
 *
 * Each `reader.read()` append is parsed when a full SSE frame is available (`\n\n`).
 * Yields once per TCP chunk with every event from that chunk (not one yield per event),
 * so the turn layer can apply deltas in a single reducer pass.
 *
 * **Tail:** when the connection closes, the last bytes may not end with `\n\n`, so the
 * final incomplete frame stays in `buffer`. We append `\n\n` once, parse any remainder,
 * yield it, then finish — otherwise the last event(s) would be lost.
 */
export async function* streamAiChatTurn(
  chatId: ChatId,
  body: AiChatStreamRequestBody,
  signal: AbortSignal,
): AsyncGenerator<readonly AiChatStreamEvent[], void> {
  const response = await postAiChatMessageStream(chatId, body, signal)
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  try {
    let readResult = await reader.read()
    while (!readResult.done) {
      buffer += readResult.value
      const parsed = takeParsedEvents(buffer)
      buffer = parsed.rest
      yield* yieldEventBatchIfAny(parsed.events)
      readResult = await reader.read()
    }
    const tail = takeParsedEvents(buffer, true)
    yield* yieldEventBatchIfAny(tail.events)
  } finally {
    reader.releaseLock()
  }
}

function drainSseBuffer(buffer: string): ParsedSseBufferResult {
  const { frames, rest } = splitSseFrames(buffer)
  const events: AiChatStreamEvent[] = []
  for (const frame of frames) {
    const event = parseSseFrame(frame)
    if (event !== null) {
      events.push(event)
    }
  }
  return { events, rest }
}

function takeParsedEvents(
  buffer: string,
  appendTrailingDelimiter = false,
): ParsedSseBufferResult {
  const input = appendTrailingDelimiter && buffer.length > 0 ? `${buffer}\n\n` : buffer
  const drained = drainSseBuffer(input)
  return {
    events: drained.events,
    rest: appendTrailingDelimiter ? '' : drained.rest,
  }
}

function* yieldEventBatchIfAny(
  events: readonly AiChatStreamEvent[],
): Generator<readonly AiChatStreamEvent[], void> {
  if (events.length > 0) {
    yield events
  }
}
