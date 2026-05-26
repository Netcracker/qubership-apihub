import { useMemo } from 'react'

import { AI_CHAT_ROLE, type AiChatMessage, type ChatId, type MessageId } from '../../../api/types'
import type { AiAssistantStreamingApi } from '../../../state/AiAssistantContext'
import { STREAMING_TURN_STATUS } from '../../../streaming/turn/streamingTurnConstants'
import { isStreamingTurnStatus } from '../../../streaming/turn/streamingTurnReducer'
import { CHAT_MESSAGE_LIST_JUMP_PHASE, type ChatMessageListJumpPhase } from '../chatScreenConstants'

type MessagePage = {
  messages: AiChatMessage[]
}

type UseChatScreenMessagesParams = {
  activeChatId: ChatId | null
  messagePages: MessagePage[] | undefined
  messagesLoaded: boolean
  streaming: AiAssistantStreamingApi
}

type ChatScreenMessagesView = {
  displayMessages: AiChatMessage[]
  showWelcome: boolean
  showThread: boolean
  thinkingVisible: boolean
  jumpPhase: ChatMessageListJumpPhase
  streamingAssistantMessageId: MessageId | null
}

export function useChatScreenMessages({
  activeChatId,
  messagePages,
  messagesLoaded,
  streaming,
}: UseChatScreenMessagesParams): ChatScreenMessagesView {
  const messagesOldestFirst = useMemo((): AiChatMessage[] => {
    if (!messagePages?.length) {
      return []
    }
    const newestFirst = messagePages.flatMap((page) => page.messages)
    return [...newestFirst].reverse()
  }, [messagePages])

  const streamingAssistantLive = useMemo((): { messageId: MessageId; content: string } | null => {
    if (!isStreamingTurnStatus(streaming.state, STREAMING_TURN_STATUS.started)) {
      return null
    }
    const turnChatId = streaming.activeTurnChatId
    if (turnChatId === null || turnChatId !== activeChatId) {
      return null
    }
    return {
      messageId: streaming.state.assistantMessageId,
      content: streaming.state.buffer,
    }
  }, [activeChatId, streaming.activeTurnChatId, streaming.state])

  const displayMessages = useMemo((): AiChatMessage[] => {
    const base = messagesOldestFirst
    if (!streamingAssistantLive) {
      return base
    }
    const hasFinalAssistant = base.some(
      (m) => m.messageId === streamingAssistantLive.messageId && m.role === AI_CHAT_ROLE.assistant,
    )
    if (hasFinalAssistant) {
      return base
    }
    const synthetic: AiChatMessage = {
      messageId: streamingAssistantLive.messageId,
      clientMessageId: null,
      role: AI_CHAT_ROLE.assistant,
      content: streamingAssistantLive.content,
      createdAt: new Date().toISOString(),
    }
    return [...base, synthetic]
  }, [messagesOldestFirst, streamingAssistantLive])

  const showWelcome = activeChatId === null ||
    (messagesLoaded && displayMessages.length === 0)

  const showThread = activeChatId !== null && displayMessages.length > 0

  const thinkingVisible = streaming.activeTurnChatId !== null &&
    streaming.activeTurnChatId === activeChatId &&
    (isStreamingTurnStatus(streaming.state, STREAMING_TURN_STATUS.pending) ||
      (isStreamingTurnStatus(streaming.state, STREAMING_TURN_STATUS.started) &&
        streaming.thinkingDuringAssistantPause))

  const jumpPhase = streaming.isBusy
    ? CHAT_MESSAGE_LIST_JUMP_PHASE.active
    : CHAT_MESSAGE_LIST_JUMP_PHASE.idle
  const streamingAssistantMessageId = streamingAssistantLive?.messageId ?? null

  return {
    displayMessages,
    showWelcome,
    showThread,
    thinkingVisible,
    jumpPhase,
    streamingAssistantMessageId,
  }
}
