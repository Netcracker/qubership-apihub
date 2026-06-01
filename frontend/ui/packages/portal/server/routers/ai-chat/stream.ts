import type { Request, Response, Router } from 'express'
import { randomUUID } from 'node:crypto'
import { buildEphemeralFileUrl } from '../../mocks/ai-chat/ephemeralFileUrl'
import { pickScenario } from '../../mocks/ai-chat/scriptedStreams'
import { aiChatStore } from '../../mocks/ai-chat/store'
import { type AiChatMessage, type AiChatStreamEvent, MAX_USER_MESSAGE_LENGTH } from '../../mocks/ai-chat/types'
import { sendError } from './errors'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseClientMessageId(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !UUID_RE.test(value)) return 'invalid'
  return value
}

function writeFrame(res: Response, event: AiChatStreamEvent): void {
  // All SSE events in this mock carry JSON data payloads. Unknown event types
  // from the real backend (tool.*, context.compacted) must still be valid JSON
  // so the UI parser can drop them cleanly.
  res.write(`event: ${event.type}\n`)
  // data field: the full event (including `type`) becomes the JSON payload so
  // frontend parsers that inspect the data payload also see the discriminator.
  res.write(`data: ${JSON.stringify(event)}\n\n`)
  // With compression middleware, flush pushes chunks to the client immediately.
  ;(res as Response & { flush?: () => void }).flush?.()
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'))
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(new Error('aborted'))
    }
    signal.addEventListener('abort', onAbort)
  })
}

function primeSseHeaders(req: Request, res: Response): void {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  // flushHeaders sends the 200 + headers to the client before the first frame
  // so progressive rendering starts immediately.
  res.flushHeaders?.()
  // Disable Nagle on Windows so single short frames don't batch into 200 ms
  // network writes during streaming.
  req.socket?.setNoDelay?.(true)
}

// Emits one pre-recorded scenario as SSE frames.
// Returns the final assistant message state so the caller can persist it.
async function streamScenario(
  req: Request,
  res: Response,
  userContent: string,
  clientMessageId: string | null,
): Promise<{ assistantMessage: AiChatMessage | null; errored: boolean }> {
  const scenario = pickScenario(userContent)
  const messageId = randomUUID()
  const nowIso = new Date().toISOString()
  const frames = scenario.build({
    messageId: messageId,
    nowIso: nowIso,
    clientMessageId: clientMessageId,
    buildFileUrl: (fileId) => buildEphemeralFileUrl(fileId),
  })

  primeSseHeaders(req, res)

  const ac = new AbortController()
  // Use res.on('close') - not req.on('close') - to detect client disconnect.
  // req 'close' fires on Node 16+ the moment the request BODY stream ends
  // (which happens as soon as bodyParser finishes reading POST JSON), which
  // would abort the stream before any frame is written.
  const onClose = (): void => {
    if (!res.writableEnded) ac.abort()
  }
  res.on('close', onClose)

  let assistantMessage: AiChatMessage | null = null
  let errored = false

  try {
    for (const frame of frames) {
      if (ac.signal.aborted) break
      if (frame.delay > 0) {
        try {
          await wait(frame.delay, ac.signal)
        } catch {
          break
        }
      }
      writeFrame(res, frame.event)
      if (frame.event.type === 'message.assistant.completed') {
        assistantMessage = frame.event.message
      } else if (frame.event.type === 'error') {
        errored = true
      }
    }
  } finally {
    res.off('close', onClose)
    if (!res.writableEnded) res.end()
  }

  return { assistantMessage, errored }
}

export function streamMessage(router: Router): void {
  router.post('/chats/:chatId/messages/stream', async (req, res, next) => {
    try {
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

      const normalized = content.toLowerCase()
      if (normalized.includes('debug:http-500')) {
        sendError(
          res,
          500,
          'APIHUB-AI-5000',
          'Generic internal server error while processing the chat.',
        )
        return
      }

      // Idempotent replay: the contract says repeating the same clientMessageId
      // for the same chat must return the previously produced assistant
      // response without re-billing. For SSE we replay the recorded frames
      // synchronously with no delays.
      if (clientMessageId) {
        const replay = aiChatStore.findReplay(chatId, { content, clientMessageId })
        if (replay) {
          primeSseHeaders(req, res)
          writeFrame(res, { type: 'message.assistant.start', messageId: replay.messageId })
          writeFrame(res, { type: 'message.assistant.delta', delta: replay.content })
          writeFrame(res, { type: 'message.assistant.completed', message: replay })
          writeFrame(res, { type: 'done' })
          res.end()
          return
        }
      }

      // Persist the user message first so history reads stay consistent even
      // if the client disconnects mid-stream.
      const nowIso = new Date().toISOString()
      const userMessage: AiChatMessage = {
        messageId: randomUUID(),
        clientMessageId: clientMessageId,
        role: 'user',
        content: content,
        createdAt: nowIso,
      }
      aiChatStore.appendMessage(chatId, userMessage)

      // Auto-title the chat on first user message (~matches backend behavior).
      const chat = aiChatStore.get(chatId)
      if (chat && !chat.title) {
        aiChatStore.setTitle(chatId, content.trim().split(/\s+/).slice(0, 5).join(' '))
      }

      const { assistantMessage, errored } = await streamScenario(req, res, content, clientMessageId)
      if (assistantMessage && !errored) {
        aiChatStore.appendMessage(chatId, assistantMessage)
        if (clientMessageId) {
          aiChatStore.rememberAssistantByClientKey(chatId, clientMessageId, assistantMessage)
        }
      }
    } catch (e) {
      next(e)
    }
  })
}
