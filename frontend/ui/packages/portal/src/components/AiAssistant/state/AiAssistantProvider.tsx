import { type FC, memo, type PropsWithChildren, useCallback, useMemo, useState } from 'react'
import { useEvent } from 'react-use'

import {
  HIDE_AI_ASSISTANT_PANEL,
  SHOW_AI_ASSISTANT_PANEL,
} from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import type { ChatId } from '../api/types'
import { useStreamingTurn } from '../streaming/turn/useStreamingTurn'
import {
  AI_ASSISTANT_CHAT_SCREEN,
  AiAssistantContext,
  type AiAssistantContextValue,
  type AiAssistantScreen,
} from './AiAssistantContext'

export const AiAssistantProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [open, setOpen] = useState<boolean>(false)
  const [screen, setScreen] = useState<AiAssistantScreen>(AI_ASSISTANT_CHAT_SCREEN)
  const [activeChatId, setActiveChatId] = useState<ChatId | null>(null)

  const openPanel = useCallback((): void => {
    setOpen(true)
  }, [])

  const closePanel = useCallback((): void => {
    setOpen(false)
  }, [])

  const openHistory = useCallback((): void => {
    setScreen('history')
    setOpen(true)
  }, [])

  const openChatScreen = useCallback((chatId: ChatId | null): void => {
    setActiveChatId(chatId)
    setScreen('chat')
    setOpen(true)
  }, [])

  const resetActiveChat = useCallback((): void => {
    setActiveChatId(null)
    setScreen('chat')
  }, [])

  const clearActiveChat = useCallback((): void => {
    setActiveChatId(null)
  }, [])

  const streaming = useStreamingTurn({
    openChatScreen,
    resetActiveChat,
    activeChatId,
  })

  useEvent(SHOW_AI_ASSISTANT_PANEL, openPanel)
  useEvent(HIDE_AI_ASSISTANT_PANEL, closePanel)

  const contextValue = useMemo<AiAssistantContextValue>(() => ({
    open,
    screen,
    activeChatId,
    openPanel,
    closePanel,
    openHistory,
    openChatScreen,
    resetActiveChat,
    clearActiveChat,
    streaming,
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
    streaming,
  ])

  return (
    <AiAssistantContext.Provider value={contextValue}>
      {children}
    </AiAssistantContext.Provider>
  )
})
