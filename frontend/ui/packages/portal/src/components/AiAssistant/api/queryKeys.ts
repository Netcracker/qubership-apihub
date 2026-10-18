import type { ChatId } from './types'

export const AI_CHAT_ROOT = 'ai-chat' as const

export const aiChatListKey = (search?: string) => [AI_CHAT_ROOT, 'chats', { search: search ?? '' }] as const
export const aiChatItemKey = (chatId: ChatId | null) => [AI_CHAT_ROOT, 'chats', chatId] as const
export const aiChatMessagesKey = (chatId: ChatId | null) => [AI_CHAT_ROOT, 'messages', chatId] as const

/** Infinite list queries only; excludes per-chat item keys under the same prefix. */
export function isAiChatsInfiniteListQueryKey(queryKey: readonly unknown[]): boolean {
  if (queryKey.length !== 3 || queryKey[0] !== AI_CHAT_ROOT || queryKey[1] !== 'chats') {
    return false
  }
  const [, , tail] = queryKey
  return typeof tail === 'object' && tail !== null && 'search' in tail
}
