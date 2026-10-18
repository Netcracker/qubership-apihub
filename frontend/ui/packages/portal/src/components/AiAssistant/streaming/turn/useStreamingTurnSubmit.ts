import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { type MutableRefObject, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { invalidateAiChatListQueries } from '../../api/aiChatQueryInvalidation'
import { aiChatItemKey } from '../../api/queryKeys'
import { createAiChat } from '../../api/requests'
import {
  buildCachedUserMessage,
  prependMessageToInfiniteMessages,
  updateAiChatMessagesCache,
} from '../../api/streaming/messagesCache'
import type { RunStreamTurnHandler } from '../../api/streaming/types'
import type { ChatId, ClientMessageId, MessageId } from '../../api/types'
import type { SubmitTurnHandler } from '../../state/panelContext'
import { CACHED_USER_MESSAGE_ID_PREFIX, STREAMING_TURN_ACTION, STREAMING_TURN_STATUS } from './streamingTurnConstants'
import { type StreamingTurnAction, type StreamingTurnState } from './streamingTurnReducer'

type StreamingTurnSubmitDeps = {
  openChatScreen: (chatId: ChatId | null) => void
  dispatchTurn: (action: StreamingTurnAction) => void
  turnBootstrapRef: MutableRefObject<StreamingTurnState | null>
  createdChatThisTurnRef: MutableRefObject<boolean>
  runTurn: RunStreamTurnHandler
}

type ResolveChatIdForTurnDeps = {
  queryClient: QueryClient
  openChatScreen: (chatId: ChatId | null) => void
  createdChatThisTurnRef: MutableRefObject<boolean>
}

type OptimisticUserMessageParams = {
  cachedUserMessageId: MessageId
  clientMessageId: ClientMessageId
  content: string
  createdAt: string
}

/**
 * Send handler: create chat if needed, optimistic user row, `turnRequested`, then stream run.
 */
export function useStreamingTurnSubmit(deps: StreamingTurnSubmitDeps): SubmitTurnHandler {
  const queryClient = useQueryClient()
  const turnLockRef = useRef(false)
  const {
    openChatScreen,
    dispatchTurn,
    turnBootstrapRef,
    createdChatThisTurnRef,
    runTurn,
  } = deps

  return useCallback(
    async (activeChatId: ChatId | null, content: string): Promise<void> => {
      const trimmed = content.trim()
      if (!trimmed || turnLockRef.current) {
        return
      }
      turnLockRef.current = true
      try {
        createdChatThisTurnRef.current = false
        const { chatId } = await resolveChatIdForTurn(activeChatId, {
          queryClient,
          openChatScreen,
          createdChatThisTurnRef,
        })

        const clientMessageId = uuidv4() as ClientMessageId
        const cachedUserMessageId = `${CACHED_USER_MESSAGE_ID_PREFIX}${uuidv4()}` as MessageId
        const nowIso = new Date().toISOString()

        prependOptimisticUserMessage(queryClient, chatId, {
          cachedUserMessageId: cachedUserMessageId,
          clientMessageId: clientMessageId,
          content: trimmed,
          createdAt: nowIso,
        })

        turnBootstrapRef.current = {
          status: STREAMING_TURN_STATUS.pending,
          chatId: chatId,
        }

        dispatchTurn({
          type: STREAMING_TURN_ACTION.turnRequested,
          chatId: chatId,
        })

        await runTurn(chatId, trimmed, clientMessageId)
      } finally {
        createdChatThisTurnRef.current = false
        turnLockRef.current = false
      }
    },
    [
      createdChatThisTurnRef,
      dispatchTurn,
      openChatScreen,
      queryClient,
      runTurn,
      turnBootstrapRef,
    ],
  )
}

async function resolveChatIdForTurn(
  activeChatId: ChatId | null,
  deps: ResolveChatIdForTurnDeps,
): Promise<{ chatId: ChatId }> {
  let chatId = activeChatId
  if (chatId) {
    return { chatId }
  }
  const fromWelcome = activeChatId === null
  deps.createdChatThisTurnRef.current = true
  const newChat = await createAiChat()
  const { chatId: createdChatId } = newChat
  chatId = createdChatId
  deps.queryClient.setQueryData(aiChatItemKey(chatId), newChat)
  void invalidateAiChatListQueries(deps.queryClient, { refetchType: 'none' })
  if (fromWelcome) {
    deps.openChatScreen(chatId)
  }
  return { chatId }
}

function prependOptimisticUserMessage(
  queryClient: QueryClient,
  chatId: ChatId,
  params: OptimisticUserMessageParams,
): void {
  updateAiChatMessagesCache(queryClient, chatId, (previous) =>
    prependMessageToInfiniteMessages(
      previous,
      buildCachedUserMessage({
        messageId: params.cachedUserMessageId,
        clientMessageId: params.clientMessageId,
        content: params.content,
        createdAt: params.createdAt,
      }),
    ))
}
