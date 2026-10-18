import { type QueryClient, useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { invalidateAiChatListQueries, invalidateAiChatPerChatQueries } from './aiChatQueryInvalidation'
import { cancelAiChatMutationQueries, removeAiChatQueries } from './chatCache'
import { aiChatVoid } from './client'
import { aiChatItemPath } from './paths'
import type { ChatId } from './types'
import type { DeleteAiChatPanelActions } from './types/deleteAiChatPanelActions'

type DeleteChat = (chatId: ChatId) => void

export type UseDeleteAiChatResult = {
  deleteChat: DeleteChat
  isPending: boolean
}

function deleteAiChatMutationOptions(
  queryClient: QueryClient,
): UseMutationOptions<void, Error, ChatId, unknown> {
  return {
    mutationFn: async (chatId: ChatId) => {
      await aiChatVoid(aiChatItemPath(chatId), { method: 'DELETE' })
    },
    onMutate: async (chatId) => {
      await cancelAiChatMutationQueries(queryClient, chatId, { includeMessages: true })
    },
    onError: (_error, chatId) => {
      invalidateAiChatPerChatQueries(queryClient, chatId)
    },
    onSuccess: (_data, chatId) => {
      removeAiChatQueries(queryClient, chatId)
    },
    onSettled: () => {
      void invalidateAiChatListQueries(queryClient)
    },
  }
}

export function useDeleteAiChat(panelActions: DeleteAiChatPanelActions): UseDeleteAiChatResult {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation(deleteAiChatMutationOptions(queryClient))

  const deleteChat = useCallback((chatId: ChatId) => {
    const context = panelActions.getDeleteContext(chatId)
    panelActions.onBeforeDelete(chatId, context)
    mutate(chatId, {
      onError: () => {
        panelActions.onDeleteFailed(chatId, context)
      },
    })
  }, [mutate, panelActions])

  return {
    deleteChat,
    isPending,
  }
}
