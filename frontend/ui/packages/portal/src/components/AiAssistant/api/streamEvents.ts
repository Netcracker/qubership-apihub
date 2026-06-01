/** SSE `event` / `data.type` values from the AI chat stream contract. */
export const AI_CHAT_STREAM_EVENT = {
  contextCompacted: 'context.compacted',
  assistantStart: 'message.assistant.start',
  assistantDelta: 'message.assistant.delta',
  assistantCompleted: 'message.assistant.completed',
  toolStarted: 'tool.started',
  toolCompleted: 'tool.completed',
  error: 'error',
  done: 'done',
} as const

export function isAssistantStreamProgressEvent(event: { type: string }): boolean {
  return (
    event.type === AI_CHAT_STREAM_EVENT.assistantStart ||
    event.type === AI_CHAT_STREAM_EVENT.assistantDelta
  )
}
