import { useCallback } from 'react'

import { useAiAssistantContext } from '../state/AiAssistantContext'

export type AiAssistantHeaderHandlers = {
  newChatDisabled: boolean
  onNewChat: () => void
  onHistory: () => void
  onClose: () => void
}

export function useAiAssistantHeaderHandlers(): AiAssistantHeaderHandlers {
  const { closePanel, openHistory, resetActiveChat, streaming } = useAiAssistantContext()

  const onNewChat = useCallback((): void => {
    streaming.abort()
    streaming.reset()
    resetActiveChat()
  }, [resetActiveChat, streaming])

  return {
    newChatDisabled: false,
    onNewChat: onNewChat,
    onHistory: openHistory,
    onClose: closePanel,
  }
}
