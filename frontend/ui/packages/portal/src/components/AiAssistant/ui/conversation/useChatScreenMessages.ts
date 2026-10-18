import { useMemo } from 'react'

import { buildCachedAssistantMessage } from '../../api/streaming/messagesCache'
import { AI_CHAT_ROLE, type AiChatMessage, type ChatId, type MessageId } from '../../api/types'
import type { StreamingLive } from '../../state/panelContext'
import { STREAMING_TURN_STATUS } from '../../streaming/turn/streamingTurnConstants'
import { getActiveTurnChatId, isStreamingBusy, isStreamingTurnStatus } from '../../streaming/turn/streamingTurnReducer'
import { CHAT_MESSAGE_LIST_JUMP_PHASE, type ChatMessageListJumpPhase } from './chatScreenConstants'

type MessagePage = {
  messages: AiChatMessage[]
}

type UseChatScreenMessagesParams = {
  activeChatId: ChatId
  messagePages: MessagePage[] | undefined
  messagesLoaded: boolean
  streamingLive: StreamingLive
}

type StreamingAssistantBuffer = {
  messageId: MessageId
  buffer: string
}

type ChatScreenMessagesView = {
  displayMessages: AiChatMessage[]
  showThread: boolean
  thinkingVisible: boolean
  jumpPhase: ChatMessageListJumpPhase
  streamingAssistantMessageId: MessageId | null
}

export function useChatScreenMessages({
  activeChatId,
  messagePages,
  messagesLoaded,
  streamingLive,
}: UseChatScreenMessagesParams): ChatScreenMessagesView {
  const activeTurnChatId = getActiveTurnChatId(streamingLive.state)
  const messagesOldestFirst = useMemo((): AiChatMessage[] => {
    if (!messagePages?.length) {
      return []
    }
    // API pages and in-page messages are both newest-first; one reverse yields oldest-first.
    const newestFirst = messagePages.flatMap((page) => page.messages)
    return [...newestFirst].reverse()
  }, [messagePages])

  const streamingAssistantBuffer = useMemo((): StreamingAssistantBuffer | null => {
    if (!isStreamingTurnStatus(streamingLive.state, STREAMING_TURN_STATUS.started)) {
      return null
    }
    if (activeTurnChatId !== activeChatId) {
      return null
    }
    return {
      messageId: streamingLive.state.assistantMessageId,
      buffer: streamingLive.state.buffer,
    }
  }, [activeChatId, activeTurnChatId, streamingLive.state])

  const displayMessages = useMemo((): AiChatMessage[] => {
    if (!streamingAssistantBuffer) {
      return messagesOldestFirst
    }

    const assistantMessageInThread = messagesOldestFirst.some(
      (message) =>
        message.messageId === streamingAssistantBuffer.messageId &&
        message.role === AI_CHAT_ROLE.assistant,
    )
    if (assistantMessageInThread) {
      return messagesOldestFirst
    }

    const streamingAssistantMessage = buildCachedAssistantMessage({
      messageId: streamingAssistantBuffer.messageId,
      content: streamingAssistantBuffer.buffer,
      createdAt: new Date().toISOString(),
    })
    return [...messagesOldestFirst, streamingAssistantMessage]
  }, [messagesOldestFirst, streamingAssistantBuffer])

  const showThread = messagesLoaded && displayMessages.length > 0

  const thinkingVisible = activeTurnChatId === activeChatId &&
    (
      isStreamingTurnStatus(streamingLive.state, STREAMING_TURN_STATUS.pending) ||
      isStreamingTurnStatus(streamingLive.state, STREAMING_TURN_STATUS.started) &&
        streamingLive.thinkingDuringAssistantPause
    )

  const jumpPhase = isStreamingBusy(streamingLive.state)
    ? CHAT_MESSAGE_LIST_JUMP_PHASE.active
    : CHAT_MESSAGE_LIST_JUMP_PHASE.idle
  const streamingAssistantMessageId = streamingAssistantBuffer?.messageId ?? null

  return {
    displayMessages,
    showThread,
    thinkingVisible,
    jumpPhase,
    streamingAssistantMessageId,
  }
}

export function isChatScreenWelcome(
  activeChatId: ChatId | null,
  messagePages: MessagePage[] | undefined,
  messagesLoaded: boolean,
): boolean {
  if (activeChatId === null) {
    return true
  }
  if (!messagesLoaded) {
    return false
  }
  if (!messagePages?.length) {
    return true
  }
  return messagePages.flatMap((page) => page.messages).length === 0
}
