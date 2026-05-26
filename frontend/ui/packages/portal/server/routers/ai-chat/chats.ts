import type { Router } from 'express'
import { aiChatStore } from '../../mocks/ai-chat/store'
import type { AiChatsListResponse } from '../../mocks/ai-chat/types'

function parseLimit(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, 200)
}

export function listChats(router: Router): void {
  router.get('/chats', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const limit = parseLimit(req.query.limit, 100)
    const before = typeof req.query.before === 'string' ? req.query.before : undefined

    const all = aiChatStore.list(search)
    // Non-pinned chats are paginated with keyset by `lastMessageAt`.
    // Pinned chats are always served first regardless of the cursor.
    const pinned = all.filter((c) => c.pinned === true)
    const unpinned = all.filter((c) => c.pinned !== true)
    const unpinnedPage = before
      ? unpinned.filter((c) => c.lastMessageAt < before)
      : unpinned
    const combined = before ? unpinnedPage : [...pinned, ...unpinnedPage]
    const page = combined.slice(0, limit)
    const hasMore = combined.length > limit

    const body: AiChatsListResponse = { chats: page, hasMore: hasMore }
    res.status(200).json(body)
  })
}

export function createChat(router: Router): void {
  router.post('/chats', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title : undefined
    const chat = aiChatStore.create(title)
    res.status(201).json(chat)
  })
}
