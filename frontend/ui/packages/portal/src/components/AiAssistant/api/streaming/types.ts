import type { AiChatStreamEvent, ChatId, ClientMessageId } from '../types'

export type ProcessStreamBatchHandler = (
  chatId: ChatId,
  batch: readonly AiChatStreamEvent[],
) => void

export type RunStreamTurnHandler = (
  chatId: ChatId,
  trimmed: string,
  clientMessageId: ClientMessageId,
) => Promise<void>
