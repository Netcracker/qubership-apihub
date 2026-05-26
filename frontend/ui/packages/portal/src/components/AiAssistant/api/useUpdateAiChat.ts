import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query'

import { invalidateAiChatListQueries } from './aiChatQueryInvalidation'
import { applyLocalChatPatch } from './chatCache'
import { AI_CHAT_ROOT, aiChatItemKey } from './queryKeys'
import { updateAiChat } from './requests'
import type { AiChat, AiChatUpdateRequest, ChatId } from './types'

export type UpdateAiChatVariables = {
  chatId: ChatId
  patch: AiChatUpdateRequest
}

type UpdateAiChatMutationContext = {
  chatId: ChatId
  chatSnapshot: AiChat | undefined
}

export function useUpdateAiChat(): UseMutationResult<
  AiChat,
  Error,
  UpdateAiChatVariables,
  UpdateAiChatMutationContext
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ chatId, patch }) => updateAiChat(chatId, patch),
    onMutate: async ({ chatId, patch }) => {
      await queryClient.cancelQueries({ queryKey: [AI_CHAT_ROOT, 'chats'] })
      await queryClient.cancelQueries({ queryKey: aiChatItemKey(chatId), exact: true })

      const chatSnapshot = queryClient.getQueryData<AiChat>(aiChatItemKey(chatId))

      if (chatSnapshot) {
        queryClient.setQueryData(aiChatItemKey(chatId), applyLocalChatPatch(chatSnapshot, patch))
      }

      return {
        chatId,
        chatSnapshot,
      }
    },
    onError: (_error, variables, context) => {
      if (!context) {
        return
      }

      if (context.chatSnapshot) {
        queryClient.setQueryData(aiChatItemKey(context.chatId), context.chatSnapshot)
      } else {
        queryClient.removeQueries({ queryKey: aiChatItemKey(variables.chatId), exact: true })
      }
    },
    onSuccess: (chat) => {
      queryClient.setQueryData(aiChatItemKey(chat.chatId), chat)
    },
    onSettled: () => {
      void invalidateAiChatListQueries(queryClient)
    },
  })
}
