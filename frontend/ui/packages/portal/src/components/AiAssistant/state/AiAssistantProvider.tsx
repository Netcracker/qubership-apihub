import { type FC, memo, type PropsWithChildren, useCallback, useMemo, useState } from 'react'

import {
  AI_ASSISTANT_PANEL,
  useSidePanel,
} from '@netcracker/qubership-apihub-ui-portal/src/routes/root/BasePage/PanelManager/SidePanelManager'
import type { ChatId } from '../api/types'
import { useStreamingTurn } from '../streaming/turn/useStreamingTurn'
import {
  PANEL_SCREEN_CHAT,
  PANEL_SCREEN_HISTORY,
  PanelContext,
  type PanelContextValue,
  type PanelScreen,
  StreamingActionsContext,
  StreamingLiveContext,
  StreamingTurnStatusContext,
} from './panelContext'

export const AiAssistantProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const { open, openPanel, closePanel } = useSidePanel(AI_ASSISTANT_PANEL)
  const [screen, setScreen] = useState<PanelScreen>(PANEL_SCREEN_CHAT)
  const [activeChatId, setActiveChatId] = useState<ChatId | null>(null)

  const openHistory = useCallback((): void => {
    setScreen(PANEL_SCREEN_HISTORY)
    openPanel()
  }, [openPanel])

  const openChatScreen = useCallback((chatId: ChatId | null): void => {
    setActiveChatId(chatId)
    setScreen(PANEL_SCREEN_CHAT)
    openPanel()
  }, [openPanel])

  const resetActiveChat = useCallback((): void => {
    setActiveChatId(null)
    setScreen(PANEL_SCREEN_CHAT)
  }, [])

  const clearActiveChat = useCallback((): void => {
    setActiveChatId(null)
  }, [])

  const { actions, streamingTurnStatus, live } = useStreamingTurn({
    openChatScreen,
    resetActiveChat,
    activeChatId,
  })

  const { abort, reset } = actions

  const startNewChat = useCallback((): void => {
    abort()
    reset()
    resetActiveChat()
  }, [abort, reset, resetActiveChat])

  const panelContextValue = useMemo<PanelContextValue>(() => ({
    open,
    screen,
    activeChatId,
    openPanel,
    closePanel,
    openHistory,
    openChatScreen,
    resetActiveChat,
    clearActiveChat,
    startNewChat,
  }), [
    open,
    screen,
    activeChatId,
    openPanel,
    closePanel,
    openHistory,
    openChatScreen,
    resetActiveChat,
    clearActiveChat,
    startNewChat,
  ])

  return (
    <PanelContext.Provider value={panelContextValue}>
      <StreamingActionsContext.Provider value={actions}>
        <StreamingTurnStatusContext.Provider value={streamingTurnStatus}>
          <StreamingLiveContext.Provider value={live}>
            {children}
          </StreamingLiveContext.Provider>
        </StreamingTurnStatusContext.Provider>
      </StreamingActionsContext.Provider>
    </PanelContext.Provider>
  )
})

AiAssistantProvider.displayName = 'AiAssistantProvider'
