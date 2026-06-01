import { type UseMutationResult } from '@tanstack/react-query'
import { useCallback } from 'react'

import type { ChatId } from '../api/types'
import { useDeleteAiChat } from '../api/useDeleteAiChat'
import { AI_ASSISTANT_HISTORY_SCREEN, useAiAssistantContext } from '../state/AiAssistantContext'

export function useAiAssistantDeleteChat(): UseMutationResult<void, Error, ChatId, unknown> {
  const deleteChat = useDeleteAiChat()
  const { activeChatId, screen, openChatScreen, openHistory, resetActiveChat, clearActiveChat } =
    useAiAssistantContext()

  const mutate = useCallback((chatId: ChatId) => {
    const wasActiveChat = activeChatId === chatId
    const previousScreen = screen

    if (wasActiveChat) {
      clearActiveChat()
    }

    deleteChat.mutate(chatId, {
      onError: () => {
        if (!wasActiveChat) {
          return
        }
        if (previousScreen === AI_ASSISTANT_HISTORY_SCREEN) {
          openHistory()
        } else {
          resetActiveChat()
          openChatScreen(chatId)
        }
      },
    })
  }, [
    activeChatId,
    clearActiveChat,
    deleteChat,
    openChatScreen,
    openHistory,
    resetActiveChat,
    screen,
  ])

  return {
    ...deleteChat,
    mutate,
  }
}
