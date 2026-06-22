import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import { type FC, memo } from 'react'

import { useAiChatMessages } from '../../api/useAiChatMessages'
import { PANEL_SCREEN_CHAT, usePanel } from '../../state/panelContext'
import { Composer } from '../composer/Composer'
import { ChatStreamingBody } from '../conversation/ChatStreamingBody'
import { ChatWelcome } from '../conversation/ChatWelcome'
import { isChatScreenWelcome } from '../conversation/useChatScreenMessages'
import { PanelHeader } from '../header/PanelHeader'

export const ChatScreen: FC = memo(() => {
  const { open, activeChatId } = usePanel()
  const messagesQuery = useAiChatMessages(activeChatId)

  const showWelcome = isChatScreenWelcome(
    activeChatId,
    messagesQuery.data?.pages,
    messagesQuery.isSuccess,
  )

  return (
    <ChatLayout>
      <PanelHeader mode={PANEL_SCREEN_CHAT} />
      <Body>
        {showWelcome
          ? <ChatWelcome />
          : activeChatId && (
            <ChatStreamingBody
              activeChatId={activeChatId}
              messagePages={messagesQuery.data?.pages}
              messagesLoaded={messagesQuery.isSuccess}
              hasNextPage={!!messagesQuery.hasNextPage}
              isFetchingNextPage={messagesQuery.isFetchingNextPage}
              fetchNextPage={messagesQuery.fetchNextPage}
            />
          )}
      </Body>
      <Composer panelOpen={open} chatKey={activeChatId ?? 'none'} />
    </ChatLayout>
  )
})

ChatScreen.displayName = 'ChatScreen'

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
