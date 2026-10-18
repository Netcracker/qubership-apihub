import { AI_CHAT_PAGE_LIMIT } from './constants'

type AiChatPaginationQueryOptions = {
  before?: string
  search?: string
}

export function buildAiChatPaginationQuery(options: AiChatPaginationQueryOptions = {}): string {
  const params = new URLSearchParams({ limit: String(AI_CHAT_PAGE_LIMIT) })
  if (options.search) {
    params.set('search', options.search)
  }
  if (options.before !== undefined) {
    params.set('before', options.before)
  }
  return params.toString()
}
