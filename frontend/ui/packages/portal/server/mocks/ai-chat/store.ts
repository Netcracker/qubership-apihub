import { randomUUID } from 'node:crypto'
import { type AiChat, type AiChatMessage, type AiChatSendRequest, MAX_PINNED_PER_USER } from './types'

export type ChatState = {
  chat: AiChat
  // messages kept newest-first (matches backend contract for GET /messages).
  messages: AiChatMessage[]
  // clientMessageId -> assistant message; used for idempotent replay when
  // clients resubmit the same request.
  idempotencyMap: Map<string, AiChatMessage>
}

export class AiChatStore {
  private readonly chats = new Map<string, ChatState>()

  reset(): void {
    this.chats.clear()
  }

  seed(chats: ChatState[]): void {
    this.chats.clear()
    for (const state of chats) this.chats.set(state.chat.chatId, state)
  }

  list(search: string | undefined): AiChat[] {
    const needle = (search ?? '').trim().toLowerCase()
    const all = [...this.chats.values()].map((state) => state.chat)
    const filtered = needle
      ? all.filter((chat) => chat.title.toLowerCase().includes(needle))
      : all
    return [...filtered].sort(compareChats)
  }

  has(chatId: string): boolean {
    return this.chats.has(chatId)
  }

  get(chatId: string): AiChat | undefined {
    return this.chats.get(chatId)?.chat
  }

  getState(chatId: string): ChatState | undefined {
    return this.chats.get(chatId)
  }

  create(title: string | undefined): AiChat {
    const now = new Date().toISOString()
    const chat: AiChat = {
      chatId: randomUUID(),
      title: title ?? '',
      createdAt: now,
      lastMessageAt: now,
      messagesCount: 0,
    }
    this.chats.set(chat.chatId, {
      chat: chat,
      messages: [],
      idempotencyMap: new Map(),
    })
    return chat
  }

  // returns the updated chat on success.
  // returns null if chatId is unknown.
  // returns 'pin-limit' if the update would exceed maxPinnedPerUser.
  update(
    chatId: string,
    patch: { title?: string; pinned?: boolean },
  ): AiChat | null | 'pin-limit' {
    const state = this.chats.get(chatId)
    if (!state) return null
    const current = state.chat
    const willPin = patch.pinned === true && !current.pinned
    if (willPin) {
      const pinnedCount = [...this.chats.values()]
        .filter((s) => s.chat.pinned)
        .length
      if (pinnedCount >= MAX_PINNED_PER_USER) return 'pin-limit'
    }
    const next: AiChat = {
      ...current,
      title: patch.title !== undefined ? patch.title : current.title,
    }
    if (patch.pinned === true) {
      next.pinned = true
    } else if (patch.pinned === false) {
      delete next.pinned
    }
    state.chat = next
    return next
  }

  delete(chatId: string): boolean {
    return this.chats.delete(chatId)
  }

  // Paginate message history newest-first.
  // `before` is exclusive (the page starts with messages strictly older than it).
  messagesPage(
    chatId: string,
    params: { limit: number; before?: string },
  ): { messages: AiChatMessage[]; hasMore: boolean } | null {
    const state = this.chats.get(chatId)
    if (!state) return null
    const limit = Math.max(1, Math.min(params.limit, 200))
    const startIdx = params.before
      ? state.messages.findIndex((m) => m.createdAt < params.before!)
      : 0
    if (startIdx === -1) return { messages: [], hasMore: false }
    const slice = state.messages.slice(startIdx, startIdx + limit)
    return {
      messages: slice,
      hasMore: startIdx + limit < state.messages.length,
    }
  }

  appendMessage(chatId: string, msg: AiChatMessage): void {
    const state = this.chats.get(chatId)
    if (!state) return
    // Newest first.
    state.messages.unshift(msg)
    state.chat = {
      ...state.chat,
      lastMessageAt: msg.createdAt,
      messagesCount: state.chat.messagesCount + 1,
    }
    if (msg.clientMessageId && msg.role === 'assistant') {
      state.idempotencyMap.set(msg.clientMessageId, msg)
    }
  }

  rememberAssistantByClientKey(
    chatId: string,
    clientMessageId: string,
    message: AiChatMessage,
  ): void {
    const state = this.chats.get(chatId)
    if (!state) return
    state.idempotencyMap.set(clientMessageId, message)
  }

  findReplay(
    chatId: string,
    body: AiChatSendRequest,
  ): AiChatMessage | undefined {
    if (!body.clientMessageId) return undefined
    return this.chats.get(chatId)?.idempotencyMap.get(body.clientMessageId)
  }

  setTitle(chatId: string, title: string): void {
    const state = this.chats.get(chatId)
    if (!state) return
    state.chat = { ...state.chat, title }
  }
}

// Sort for GET /chats: pinned desc, lastMessageAt desc (newest first).
function compareChats(a: AiChat, b: AiChat): number {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
  if (a.lastMessageAt === b.lastMessageAt) return 0
  return a.lastMessageAt > b.lastMessageAt ? -1 : 1
}

// Process-wide singleton. The mock server is single-tenant per process,
// so sharing one store across requests matches the "logged-in user" fiction.
export const aiChatStore = new AiChatStore()
