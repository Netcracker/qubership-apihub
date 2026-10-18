import { buildOverviewFixtureMarkdown } from './markdownSamples'
import type { ChatState } from './store'
import type { AiChat, AiChatMessage } from './types'

// Deterministic UUIDs so tests and manual curl calls can reference the
// same chat across restarts.
export const FIXTURE_CUSTOMERS_CHAT_ID = 'fc000001-0000-4000-8000-000000000001'
export const FIXTURE_OVERVIEW_CHAT_ID = 'fc000001-0000-4000-8000-000000000002'
export const FIXTURE_RECENT_CHAT_ID = 'fc000001-0000-4000-8000-000000000003'
// 120 user + 120 assistant
export const FIXTURE_PAGINATION_120_CHAT_ID = 'fc000001-0000-4000-8000-0000000000b0'

const DAY_MS = 24 * 60 * 60 * 1000

// A fixed reference moment anchors all relative timestamps so tests are
// reproducible regardless of wall clock.
const REFERENCE_EPOCH = Date.parse('2026-04-20T10:00:00.000Z')

function iso(offsetMs: number): string {
  return new Date(REFERENCE_EPOCH + offsetMs).toISOString()
}

function makeMessage(
  partial: Partial<AiChatMessage> & Pick<AiChatMessage, 'role' | 'content' | 'createdAt'>,
): AiChatMessage {
  return {
    messageId: partial.messageId ?? `msg-${partial.createdAt}-${partial.role}`,
    clientMessageId: partial.clientMessageId ?? null,
    role: partial.role,
    content: partial.content,
    createdAt: partial.createdAt,
  }
}

// 120 user + 120 assistant: chronological U1,R1,... U120,R120; #1 is oldest pair.
function buildPagination120Messages(chatId: string): AiChatMessage[] {
  const chronological: AiChatMessage[] = []
  const base = -20 * DAY_MS
  for (let n = 1; n <= 120; n++) {
    const offsetPair = (n - 1) * 60_000
    chronological.push(
      makeMessage({
        messageId: `${chatId}-u-${n}`,
        role: 'user',
        content: `Request #${n}`,
        createdAt: iso(base + offsetPair),
      }),
    )
    chronological.push(
      makeMessage({
        messageId: `${chatId}-a-${n}`,
        role: 'assistant',
        content: `Response #${n}`,
        createdAt: iso(base + offsetPair + 30_000),
      }),
    )
  }
  return chronological.reverse()
}

function makeChatState(input: {
  chatId: string
  title: string
  pinned?: boolean
  createdAt: string
  lastMessageAt: string
  messages: AiChatMessage[]
}): ChatState {
  const { chatId, title, pinned, createdAt, lastMessageAt, messages } = input
  const messagesCount = messages.length
  const chat: AiChat = { chatId, title, createdAt, lastMessageAt, messagesCount }
  if (pinned === true) {
    chat.pinned = true
  }
  const idempotencyMap = new Map()
  return { chat, messages, idempotencyMap }
}

export function buildFixtureChats(): ChatState[] {
  const pagination120Messages = buildPagination120Messages(FIXTURE_PAGINATION_120_CHAT_ID)
  const pagination120 = makeChatState({
    chatId: FIXTURE_PAGINATION_120_CHAT_ID,
    title: 'Pagination QA (Request/Response 1-120)',
    createdAt: iso(-20 * DAY_MS),
    lastMessageAt: pagination120Messages[0].createdAt,
    messages: pagination120Messages,
  })

  const customers = makeChatState({
    chatId: FIXTURE_CUSTOMERS_CHAT_ID,
    title: 'Customer operations exploration',
    createdAt: iso(-3 * DAY_MS),
    lastMessageAt: iso(-1 * DAY_MS),
    messages: [
      makeMessage({
        messageId: 'customers-m2',
        role: 'assistant',
        content: 'Here are three relevant operations in the **Customers** package.',
        createdAt: iso(-1 * DAY_MS),
      }),
      makeMessage({
        messageId: 'customers-m1',
        role: 'user',
        content: 'Find API operations related to customers.',
        createdAt: iso(-1 * DAY_MS - 30_000),
      }),
    ],
  })

  const overviewContent = buildOverviewFixtureMarkdown()
  const overview = makeChatState({
    chatId: FIXTURE_OVERVIEW_CHAT_ID,
    title: 'Overview',
    pinned: true,
    createdAt: iso(-5 * DAY_MS),
    lastMessageAt: iso(-4 * DAY_MS),
    messages: [
      makeMessage({
        messageId: 'overview-a1',
        role: 'assistant',
        content: overviewContent,
        createdAt: iso(-4 * DAY_MS),
      }),
      makeMessage({
        messageId: 'overview-u1',
        role: 'user',
        content: 'Show the full markdown rendering gallery.',
        createdAt: iso(-4 * DAY_MS - 30_000),
      }),
    ],
  })

  const recent = makeChatState({
    chatId: FIXTURE_RECENT_CHAT_ID,
    title: 'Recent activity: orders endpoint review',
    createdAt: iso(-2 * 60 * 60 * 1000),
    lastMessageAt: iso(-30 * 60 * 1000),
    messages: [
      makeMessage({
        messageId: 'recent-m2',
        role: 'assistant',
        content: 'The `POST /api/v1/orders` operation is defined in package `Orders@2024.4`.',
        createdAt: iso(-30 * 60 * 1000),
      }),
      makeMessage({
        messageId: 'recent-m1',
        role: 'user',
        content: 'Show me the specification for POST /api/v1/orders.',
        createdAt: iso(-30 * 60 * 1000 - 30_000),
      }),
    ],
  })

  return [pagination120, overview, customers, recent]
}
