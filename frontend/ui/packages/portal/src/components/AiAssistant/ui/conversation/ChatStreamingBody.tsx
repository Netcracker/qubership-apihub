import type { FetchNextPageOptions } from '@tanstack/react-query'
import { type FC, memo } from 'react'

import type { AiChatMessage, ChatId } from '../../api/types'
import { useStreamingLive } from '../../state/panelContext'
import { ChatMessageList } from './ChatMessageList'
import { useChatScreenMessages } from './useChatScreenMessages'

type MessagePage = {
  messages: AiChatMessage[]
}

type ChatStreamingBodyProps = {
  activeChatId: ChatId
  messagePages: MessagePage[] | undefined
  messagesLoaded: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<unknown>
}

export const ChatStreamingBody: FC<ChatStreamingBodyProps> = memo(({
  activeChatId,
  messagePages,
  messagesLoaded,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}) => {
  const streamingLive = useStreamingLive()

  const {
    displayMessages,
    showThread,
    thinkingVisible,
    jumpPhase,
    streamingAssistantMessageId,
  } = useChatScreenMessages({
    activeChatId,
    messagePages,
    messagesLoaded,
    streamingLive,
  })

  if (!showThread) {
    return null
  }

  return (
    <ChatMessageList
      chatId={activeChatId}
      messages={displayMessages}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      jumpButtonStreamPhase={jumpPhase}
      streamingAssistantMessageId={streamingAssistantMessageId}
      thinkingVisible={thinkingVisible}
    />
  )
})

ChatStreamingBody.displayName = 'ChatStreamingBody'
