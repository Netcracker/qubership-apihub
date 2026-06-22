import type { AiChat, AiChatsListResponse } from '../../api/types'

/**
 * History screen uses `useAiChats(search)` for the visible list and a separate
 * `useAiChats('')` baseline query for pin-limit checks. While the user searches,
 * the filtered list must not be used to count pinned chats — otherwise pin/unpin
 * would be disabled incorrectly. These helpers flatten infinite-query pages into
 * values the history UI can render and count.
 */
export function selectChatsFromPages(pages: AiChatsListResponse[] | undefined): AiChat[] {
  return pages?.flatMap((page) => page.chats) ?? []
}

export function selectPinnedChatCount(pages: AiChatsListResponse[] | undefined): number {
  if (!pages) {
    return 0
  }
  return selectChatsFromPages(pages).filter((chat) => chat.pinned === true).length
}
