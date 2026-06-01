import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query'

import { invalidateAiChatListQueries } from './aiChatQueryInvalidation'
import { removeAiChatQueries } from './chatCache'
import { aiChatVoid } from './client'
import { aiChatItemPath } from './paths'
import { AI_CHAT_ROOT, aiChatItemKey, aiChatMessagesKey } from './queryKeys'
import type { ChatId } from './types'

export function useDeleteAiChat(): UseMutationResult<void, Error, ChatId> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (chatId: ChatId) => {
      await aiChatVoid(aiChatItemPath(chatId), { method: 'DELETE' })
    },
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: [AI_CHAT_ROOT, 'chats'] })
      await queryClient.cancelQueries({ queryKey: aiChatItemKey(chatId), exact: true })
      await queryClient.cancelQueries({ queryKey: aiChatMessagesKey(chatId), exact: true })
    },
    onError: (_error, chatId) => {
      void queryClient.invalidateQueries({ queryKey: aiChatItemKey(chatId), exact: true })
      void queryClient.invalidateQueries({ queryKey: aiChatMessagesKey(chatId), exact: true })
      void invalidateAiChatListQueries(queryClient)
    },
    onSuccess: (_data, chatId) => {
      removeAiChatQueries(queryClient, chatId)
    },
    onSettled: () => {
      void invalidateAiChatListQueries(queryClient)
    },
  })
}
