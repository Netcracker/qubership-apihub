import { Router } from 'express'
import { buildFixtureChats } from '../../mocks/ai-chat/fixtures'
import { aiChatStore } from '../../mocks/ai-chat/store'
import { deleteChat, getChat, patchChat } from './chat'
import { createChat, listChats } from './chats'
import { listMessages, sendMessageNonStreaming } from './messages'
import { streamMessage } from './stream'

export type AiChatRouter = Router

export function AiChatRouter(): AiChatRouter {
  // Seed once per router instance so every dev restart ships with the same
  // fixtures. Tests can reset the store explicitly.
  aiChatStore.seed(buildFixtureChats())

  const router = Router()

  listChats(router)
  createChat(router)
  getChat(router)
  patchChat(router)
  deleteChat(router)
  // Stream route must be registered BEFORE the non-streaming variant because
  // Express matches patterns in order and `/:chatId/messages` would otherwise
  // catch `/:chatId/messages/stream` paths.
  streamMessage(router)
  listMessages(router)
  sendMessageNonStreaming(router)

  return router
}
