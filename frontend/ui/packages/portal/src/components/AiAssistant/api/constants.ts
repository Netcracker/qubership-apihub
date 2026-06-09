export const AI_CHAT_PAGE_LIMIT = 100

/** Poll GET /chats/:id until server auto-title is ready (see `useAiChatTitlePolling`). */
export const AI_CHAT_TITLE_POLL_INTERVAL_MS = 2_000

/** Stop title polling after this duration even if title is still empty. */
export const AI_CHAT_TITLE_POLL_MAX_DURATION_MS = 60_000

export const AI_CHAT_JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const
