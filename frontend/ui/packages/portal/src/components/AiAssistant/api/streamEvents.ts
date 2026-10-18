import {
  AI_CHAT_STREAM_EVENT,
  type AiChatAssistantCompletedStreamEvent,
  type AiChatAssistantDeltaStreamEvent,
  type AiChatAssistantStartStreamEvent,
  type AiChatStreamDoneEvent,
  type AiChatStreamErrorEvent,
  type AiChatStreamEvent,
} from './types'

type AiChatAssistantStreamProgressEvent =
  | AiChatAssistantStartStreamEvent
  | AiChatAssistantDeltaStreamEvent

export function isAssistantStreamProgressEvent(
  event: AiChatStreamEvent,
): event is AiChatAssistantStreamProgressEvent {
  return event.type === AI_CHAT_STREAM_EVENT.assistantStart ||
    event.type === AI_CHAT_STREAM_EVENT.assistantDelta
}

export function isAiChatAssistantCompletedStreamEvent(
  event: AiChatStreamEvent,
): event is AiChatAssistantCompletedStreamEvent {
  return event.type === AI_CHAT_STREAM_EVENT.assistantCompleted
}

export function isAiChatStreamErrorEvent(event: AiChatStreamEvent): event is AiChatStreamErrorEvent {
  return event.type === AI_CHAT_STREAM_EVENT.error
}

export function isAiChatStreamDoneEvent(
  event: AiChatStreamEvent,
): event is AiChatStreamDoneEvent {
  return event.type === AI_CHAT_STREAM_EVENT.done
}
