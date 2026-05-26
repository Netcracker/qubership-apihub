import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import { type FC, memo } from 'react'

import { useAiChatMessages } from '../../api/useAiChatMessages'
import { useAiAssistantHeaderHandlers } from '../../hooks/useAiAssistantHeaderHandlers'
import { useAiAssistantContext } from '../../state/AiAssistantContext'
import { AiAssistantHeader } from '../header/AiAssistantHeader'
import { AI_ASSISTANT_HEADER_MODE } from '../header/aiAssistantHeaderMode'
import { AiAssistantComposer } from './AiAssistantComposer'
import { AiAssistantPlaceholder } from './AiAssistantPlaceholder'
import { ChatMessageList } from './ChatMessageList'
import { useChatScreenMessages } from './hooks/useChatScreenMessages'
export const AiAssistantChatScreen: FC = memo(() => {
  const { open, activeChatId, streaming } = useAiAssistantContext()
  const headerHandlers = useAiAssistantHeaderHandlers()
  const messagesQuery = useAiChatMessages(activeChatId)

  const {
    displayMessages,
    showWelcome,
    showThread,
    thinkingVisible,
    jumpPhase,
    streamingAssistantMessageId,
  } = useChatScreenMessages({
    activeChatId: activeChatId,
    messagePages: messagesQuery.data?.pages,
    messagesLoaded: messagesQuery.isSuccess,
    streaming: streaming,
  })

  return (
    <ChatLayout>
      <AiAssistantHeader mode={AI_ASSISTANT_HEADER_MODE.chat} {...headerHandlers} />
      <Body>
        {showWelcome
          ? <AiAssistantPlaceholder />
          : showThread && activeChatId
          ? (
            <>
              <ChatMessageList
                chatId={activeChatId}
                messages={displayMessages}
                hasNextPage={Boolean(messagesQuery.hasNextPage)}
                isFetchingNextPage={messagesQuery.isFetchingNextPage}
                fetchNextPage={messagesQuery.fetchNextPage}
                jumpButtonStreamPhase={jumpPhase}
                streamingAssistantMessageId={streamingAssistantMessageId}
                thinkingVisible={thinkingVisible}
              />
            </>
          )
          : null}
      </Body>
      <AiAssistantComposer panelOpen={open} chatKey={activeChatId ?? 'none'} />
    </ChatLayout>
  )
})

AiAssistantChatScreen.displayName = 'AiAssistantChatScreen'

const ChatLayout = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})

const Body = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})
