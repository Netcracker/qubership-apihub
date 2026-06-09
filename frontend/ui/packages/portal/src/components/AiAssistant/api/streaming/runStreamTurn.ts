import type { QueryClient } from '@tanstack/react-query'
import type { MutableRefObject } from 'react'

import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import { removeAiChatQueries } from '../chatCache'
import { dispatchAiChatFetchError, dispatchAiChatWarning } from '../errors'
import type { ChatId, ClientMessageId } from '../types'
import { STREAM_INCOMPLETE_MESSAGE, STREAM_REQUEST_FAILED_MESSAGE } from './constants'
import { isStreamAbortError, toStreamFetchErrorDetail } from './streamErrors'
import { streamAiChatTurn } from './transport/sse'
import type { ProcessStreamBatchHandler } from './types'

export type StreamTurnLifecycleCallbacks = {
  processBatch: ProcessStreamBatchHandler
  isTurnStillBusy: () => boolean
  onAbort: (chatId: ChatId) => void
  onReset: (chatId: ChatId) => void
  flushAssistantBuffer: (chatId: ChatId) => void
  onActiveChatNotFound: (chatId: ChatId) => void
}

export type RunStreamTurnParams = {
  queryClient: QueryClient
  chatId: ChatId
  trimmed: string
  clientMessageId: ClientMessageId
  abortControllerRef: MutableRefObject<AbortController | null>
  callbacks: StreamTurnLifecycleCallbacks
}

/**
 * Consumes `streamAiChatTurn` for one send: batches, post-stream incomplete guard, abort/404/errors.
 */
export async function runStreamTurn(params: RunStreamTurnParams): Promise<void> {
  const {
    queryClient,
    chatId,
    trimmed,
    clientMessageId,
    abortControllerRef,
    callbacks,
  } = params
  const ac = new AbortController()
  abortControllerRef.current = ac
  try {
    for await (
      const batch of streamAiChatTurn(
        chatId,
        { content: trimmed, clientMessageId: clientMessageId },
        ac.signal,
      )
    ) {
      callbacks.processBatch(chatId, batch)
    }
    if (callbacks.isTurnStillBusy()) {
      callbacks.flushAssistantBuffer(chatId)
      dispatchAiChatWarning({ message: STREAM_INCOMPLETE_MESSAGE })
      callbacks.onReset(chatId)
    }
  } catch (e) {
    if (isStreamAbortError(e)) {
      callbacks.flushAssistantBuffer(chatId)
      callbacks.onAbort(chatId)
      return
    }
    callbacks.flushAssistantBuffer(chatId)
    callbacks.onReset(chatId)
    if (e instanceof HttpError && e.status === 404) {
      removeAiChatQueries(queryClient, chatId)
      callbacks.onActiveChatNotFound(chatId)
      return
    }
    if (!(e instanceof HttpError)) {
      dispatchAiChatFetchError(toStreamFetchErrorDetail(
        e instanceof Error ? e.message : STREAM_REQUEST_FAILED_MESSAGE,
      ))
    }
  } finally {
    releaseAbortControllerIfCurrent(abortControllerRef, ac)
  }
}

function releaseAbortControllerIfCurrent(
  abortControllerRef: MutableRefObject<AbortController | null>,
  controller: AbortController,
): void {
  if (abortControllerRef.current === controller) {
    abortControllerRef.current = null
  }
}
