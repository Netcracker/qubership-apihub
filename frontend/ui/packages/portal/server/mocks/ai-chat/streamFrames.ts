import type { AiChatMessage, AiChatStreamEvent } from './types'

export type ScriptedFrame = {
  /** Delay after the previous frame in milliseconds (0 for the first frame). */
  delay: number
  event: AiChatStreamEvent
}

export const TOKEN_DELAY_MS = 35
/** Used by `debug:thinking` to mimic long provider/network gaps in the SSE stream. */
export const THINKING_PAUSE_MS = 4000

function tokens(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [text]
}

export function deltaFrames(text: string, delay = TOKEN_DELAY_MS): ScriptedFrame[] {
  const parts = tokens(text)
  return parts.map((delta) => ({
    delay: delay,
    event: { type: 'message.assistant.delta', delta: delta },
  }))
}

export function assistantCompletedFrame(
  content: string,
  args: { messageId: string; nowIso: string; clientMessageId: string | null },
): ScriptedFrame {
  const message: AiChatMessage = {
    messageId: args.messageId,
    clientMessageId: args.clientMessageId,
    role: 'assistant',
    content: content,
    createdAt: args.nowIso,
  }
  return {
    delay: 25,
    event: { type: 'message.assistant.completed', message: message },
  }
}

/** Standard happy path: start -> token deltas -> completed -> done. */
export function buildAssistantStreamFrames(
  content: string,
  args: { messageId: string; nowIso: string; clientMessageId: string | null },
  options?: { deltaDelay?: number; includeDone?: boolean },
): ScriptedFrame[] {
  const frames: ScriptedFrame[] = [
    {
      delay: 40,
      event: { type: 'message.assistant.start', messageId: args.messageId },
    },
    ...deltaFrames(content, options?.deltaDelay),
    assistantCompletedFrame(content, args),
  ]
  if (options?.includeDone !== false) {
    frames.push({ delay: 10, event: { type: 'done' } })
  }
  return frames
}
