import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { invalidateAiChatListQueries } from './aiChatQueryInvalidation'
import { applyLocalChatPatch, cancelAiChatMutationQueries } from './chatCache'
import { aiChatItemKey } from './queryKeys'
import { updateAiChat } from './requests'
import type { AiChat, AiChatUpdateRequest, ChatId } from './types'

type UpdateAiChatVariables = {
  chatId: ChatId
  patch: AiChatUpdateRequest
}

type UpdateAiChatMutationContext = {
  chatId: ChatId
  chatSnapshot: AiChat | undefined
}

type RenameChatOptions = {
  onError?: () => void
}

type UpdateAiChatMutation = UseMutationResult<
  AiChat,
  Error,
  UpdateAiChatVariables,
  UpdateAiChatMutationContext
>

type UseUpdateAiChatResult = UpdateAiChatMutation & {
  renameChat: (chatId: ChatId, title: string, options?: RenameChatOptions) => void
  setChatPinned: (chatId: ChatId, pinned: boolean) => void
}

export function useUpdateAiChat(): UseUpdateAiChatResult {
  const queryClient = useQueryClient()

  const updateChat = useMutation<
    AiChat,
    Error,
    UpdateAiChatVariables,
    UpdateAiChatMutationContext
  >({
    mutationFn: ({ chatId, patch }) => updateAiChat(chatId, patch),
    onMutate: async ({ chatId, patch }) => {
      const itemKey = aiChatItemKey(chatId)
      await cancelAiChatMutationQueries(queryClient, chatId)

      const chatSnapshot = queryClient.getQueryData<AiChat>(itemKey)

      if (chatSnapshot) {
        queryClient.setQueryData(itemKey, applyLocalChatPatch(chatSnapshot, patch))
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

  const renameChat = useCallback((chatId: ChatId, title: string, options?: RenameChatOptions) => {
    updateChat.mutate(
      { chatId: chatId, patch: { title: title } },
      { onError: options?.onError },
    )
  }, [updateChat])

  const setChatPinned = useCallback((chatId: ChatId, pinned: boolean) => {
    updateChat.mutate({ chatId: chatId, patch: { pinned: pinned } })
  }, [updateChat])

  return {
    ...updateChat,
    renameChat,
    setChatPinned,
  }
}
