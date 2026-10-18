import { useMemo } from 'react'

import type { ChatId } from '../../api/types'
import type { DeleteAiChatPanelActions } from '../../api/types/deleteAiChatPanelActions'
import { PANEL_SCREEN_HISTORY, usePanel } from '../../state/panelContext'

export function useDeleteAiChatPanelActions(): DeleteAiChatPanelActions {
  const { activeChatId, screen, openChatScreen, openHistory, resetActiveChat, clearActiveChat } = usePanel()

  return useMemo<DeleteAiChatPanelActions>(() => ({
    getDeleteContext: (chatId: ChatId) => ({
      wasActiveChat: activeChatId === chatId,
      previousScreen: screen,
    }),
    onBeforeDelete: (_chatId, context) => {
      if (context.wasActiveChat) {
        clearActiveChat()
      }
    },
    onDeleteFailed: (chatId, context) => {
      if (!context.wasActiveChat) {
        return
      }
      if (context.previousScreen === PANEL_SCREEN_HISTORY) {
        openHistory()
      } else {
        resetActiveChat()
        openChatScreen(chatId)
      }
    },
  }), [
    activeChatId,
    clearActiveChat,
    openChatScreen,
    openHistory,
    resetActiveChat,
    screen,
  ])
}
