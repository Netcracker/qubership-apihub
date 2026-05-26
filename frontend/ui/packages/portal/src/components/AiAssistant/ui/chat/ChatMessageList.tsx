import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import type { FetchNextPageOptions } from '@tanstack/react-query'
import { type FC, memo } from 'react'

import { JumpToLatestArrowIcon } from '@netcracker/qubership-apihub-ui-shared/icons/JumpToLatestArrowIcon'
import { JumpToLatestStreamingIcon } from '@netcracker/qubership-apihub-ui-shared/icons/JumpToLatestStreamingIcon'

import type { AiChatMessage, ChatId, MessageId } from '../../api/types'
import { ChatAssistantMessage } from './ChatAssistantMessage'
import { CHAT_MESSAGE_LIST_JUMP_PHASE, type ChatMessageListJumpPhase } from './chatScreenConstants'
import { ChatUserMessage } from './ChatUserMessage'
import { useMessageListScroll } from './hooks/useMessageListScroll'
import { ThinkingIndicator } from './ThinkingIndicator'

export type ChatMessageListProps = {
  chatId: ChatId
  messages: AiChatMessage[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<unknown>
  jumpButtonStreamPhase: ChatMessageListJumpPhase
  streamingAssistantMessageId: MessageId | null
  thinkingVisible: boolean
}

export const ChatMessageList: FC<ChatMessageListProps> = memo(
  ({
    chatId,
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    jumpButtonStreamPhase,
    streamingAssistantMessageId,
    thinkingVisible,
  }) => {
    const { scrollRef, handleScroll, scrollToBottom, showJumpButton } = useMessageListScroll({
      chatId,
      messages,
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
      streamingAssistantMessageId,
      thinkingVisible,
    })

    const jumpIcon = jumpButtonStreamPhase === CHAT_MESSAGE_LIST_JUMP_PHASE.active
      ? <JumpToLatestStreamingIcon fontSize="small" />
      : <JumpToLatestArrowIcon fontSize="small" />

    return (
      <ListRoot>
        <ListScrollArea ref={scrollRef} onScroll={handleScroll} data-testid="AiAssistantMessageList">
          <MessagesColumn>
            {messages.map((message) => (
              <ChatMessageRow
                key={message.messageId}
                message={message}
                isStreamingAssistant={streamingAssistantMessageId !== null &&
                  message.messageId === streamingAssistantMessageId}
              />
            ))}
            <ThinkingIndicator visible={thinkingVisible} />
          </MessagesColumn>
        </ListScrollArea>
        {showJumpButton
          ? (
            <JumpFabWrap>
              <JumpToLatestButton
                aria-label="Jump to latest messages"
                data-testid="AiAssistantJumpToLatestButton"
                onClick={scrollToBottom}
                color="inherit"
                size="small"
              >
                {jumpIcon}
              </JumpToLatestButton>
            </JumpFabWrap>
          )
          : null}
      </ListRoot>
    )
  },
)

ChatMessageList.displayName = 'ChatMessageList'

const ListRoot = styled(Box)({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
})

const ListScrollArea = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(3),
}))

const MessagesColumn = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  paddingBottom: theme.spacing(1),
}))

const JumpFabWrap = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: '50%',
  bottom: theme.spacing(2),
  transform: 'translateX(-50%)',
  zIndex: 1,
}))

const JumpToLatestButton = styled(IconButton)(({ theme }) => {
  const border = `1px solid ${theme.palette.divider}`
  const backgroundColor = theme.palette.background.paper
  const diameter = theme.spacing(5)
  const boxShadow = '0px 0px 30px 0px rgba(0, 0, 0, 0.05), inset 0px 4px 4px 0px rgba(255, 255, 255, 0.25)'

  return {
    boxSizing: 'border-box',
    width: diameter,
    height: diameter,
    padding: 0,
    borderRadius: '50%',
    backgroundColor: backgroundColor,
    border: border,
    boxShadow: boxShadow,
    '&:hover': {
      backgroundColor: backgroundColor,
      border: border,
      boxShadow: boxShadow,
    },
  }
})

type ChatMessageRowProps = {
  message: AiChatMessage
  isStreamingAssistant: boolean
}

const ChatMessageRow: FC<ChatMessageRowProps> = memo(({ message, isStreamingAssistant }) => {
  if (message.role === 'user') {
    return <ChatUserMessage content={message.content} />
  }
  return <ChatAssistantMessage content={message.content} isStreaming={isStreamingAssistant} />
})

ChatMessageRow.displayName = 'ChatMessageRow'
