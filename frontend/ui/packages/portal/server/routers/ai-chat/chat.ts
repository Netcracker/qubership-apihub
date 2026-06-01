import type { Router } from 'express'
import { MAX_PINNED_PER_USER } from '../../mocks/ai-chat/types'
import { aiChatStore } from '../../mocks/ai-chat/store'
import { sendError } from './errors'

export function getChat(router: Router): void {
  router.get('/chats/:chatId', (req, res) => {
    const chat = aiChatStore.get(req.params.chatId)
    if (!chat) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    res.status(200).json(chat)
  })
}

export function patchChat(router: Router): void {
  router.patch('/chats/:chatId', (req, res) => {
    if (!aiChatStore.has(req.params.chatId)) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    const body = req.body ?? {}
    const patch: { title?: string; pinned?: boolean } = {}
    if (typeof body.title === 'string') patch.title = body.title
    if (typeof body.pinned === 'boolean') patch.pinned = body.pinned

    const result = aiChatStore.update(req.params.chatId, patch)
    if (result === 'pin-limit') {
      sendError(
        res,
        400,
        'APIHUB-AI-4003',
        `Pin limit exceeded. Unpin one of your pinned chats first (limit: ${MAX_PINNED_PER_USER}).`,
      )
      return
    }
    if (result === null) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    res.status(200).json(result)
  })
}

export function deleteChat(router: Router): void {
  router.delete('/chats/:chatId', (req, res) => {
    const existed = aiChatStore.delete(req.params.chatId)
    if (!existed) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    res.status(204).send()
  })
}
