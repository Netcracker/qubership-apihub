import type { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { buildEphemeralFileUrl } from '../../mocks/ai-chat/ephemeralFileUrl'
import { assistantMessageFromScenario, pickScenario } from '../../mocks/ai-chat/scriptedStreams'
import { aiChatStore } from '../../mocks/ai-chat/store'
import {
  type AiChatMessage,
  type AiChatMessagesListResponse,
  type AiChatSendMessageResponse,
  MAX_USER_MESSAGE_LENGTH,
} from '../../mocks/ai-chat/types'
import { sendError } from './errors'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseLimit(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, 200)
}

function parseClientMessageId(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !UUID_RE.test(value)) return 'invalid'
  return value
}

export function listMessages(router: Router): void {
  router.get('/chats/:chatId/messages', (req, res) => {
    const { chatId } = req.params
    if (!aiChatStore.has(chatId)) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    const limit = parseLimit(req.query.limit, 100)
    const before = typeof req.query.before === 'string' ? req.query.before : undefined
    const page = aiChatStore.messagesPage(chatId, { limit, before })
    if (!page) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    const body: AiChatMessagesListResponse = page
    res.status(200).json(body)
  })
}

function firstWords(text: string, count: number): string {
  return text.trim().split(/\s+/).slice(0, count).join(' ')
}

function autoTitleIfNeeded(chatId: string, userContent: string): void {
  const chat = aiChatStore.get(chatId)
  if (!chat || chat.title) return
  aiChatStore.setTitle(chatId, firstWords(userContent, 5))
}

export function sendMessageNonStreaming(router: Router): void {
  router.post('/chats/:chatId/messages', (req, res) => {
    const { chatId } = req.params
    if (!aiChatStore.has(chatId)) {
      sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
      return
    }
    const body = req.body ?? {}
    const content = typeof body.content === 'string' ? body.content : ''
    const clientMessageId = parseClientMessageId(body.clientMessageId)
    if (clientMessageId === 'invalid') {
      sendError(res, 400, 'APIHUB-AI-4001', 'clientMessageId must be a UUID.')
      return
    }
    if (!content.trim()) {
      sendError(res, 400, 'APIHUB-AI-4001', 'Message content must not be empty.')
      return
    }
    const maxLen = MAX_USER_MESSAGE_LENGTH
    if (content.length > maxLen) {
      sendError(res, 400, 'APIHUB-AI-4001', `Message exceeds maximum length of ${maxLen} characters.`)
      return
    }

    const replay = clientMessageId
      ? aiChatStore.findReplay(chatId, { content, clientMessageId })
      : undefined
    if (replay) {
      const userMessage = aiChatStore.getState(chatId)?.messages.find((message) =>
        message.role === 'user' && message.clientMessageId === clientMessageId,
      )
      if (!userMessage) {
        sendError(res, 404, 'APIHUB-AI-3001', 'Chat not found.')
        return
      }
      const response: AiChatSendMessageResponse = {
        userMessage: userMessage,
        assistantMessage: replay,
      }
      res.status(200).json(response)
      return
    }

    const now = new Date()
    const userMessage: AiChatMessage = {
      messageId: randomUUID(),
      clientMessageId: clientMessageId,
      role: 'user',
      content: content,
      createdAt: now.toISOString(),
    }
    aiChatStore.appendMessage(chatId, userMessage)
    autoTitleIfNeeded(chatId, content)

    const assistantCreatedAt = new Date(now.getTime() + 1).toISOString()
    const assistantMessageId = randomUUID()
    const scenario = pickScenario(content)
    const assistantMessage = assistantMessageFromScenario(scenario, {
      messageId: assistantMessageId,
      nowIso: assistantCreatedAt,
      clientMessageId: null,
      buildFileUrl: (fileId) => buildEphemeralFileUrl(fileId),
    })
    aiChatStore.appendMessage(chatId, assistantMessage)
    if (clientMessageId) {
      aiChatStore.rememberAssistantByClientKey(chatId, clientMessageId, assistantMessage)
    }
    const response: AiChatSendMessageResponse = {
      userMessage: userMessage,
      assistantMessage: assistantMessage,
    }
    res.status(200).json(response)
  })
}
