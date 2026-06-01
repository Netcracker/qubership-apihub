import type { ChatId } from './types'

export const AI_CHAT_CHATS_PATH = '/ai-chat/chats' as const

export function aiChatItemPath(chatId: ChatId): string {
  return `${AI_CHAT_CHATS_PATH}/${encodeURIComponent(chatId)}`
}

export function aiChatMessagesPath(chatId: ChatId): string {
  return `${aiChatItemPath(chatId)}/messages`
}

export function aiChatMessageStreamPath(chatId: ChatId): string {
  return `${aiChatMessagesPath(chatId)}/stream`
}
