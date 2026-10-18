import type { FetchNextPageOptions } from '@tanstack/react-query'
import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { AiChatMessage, ChatId, MessageId } from '../../api/types'

const NEAR_BOTTOM_THRESHOLD_PX = 40
const LOAD_OLDER_SCROLL_TOP_PX = 72

type UseMessageListScrollParams = {
  chatId: ChatId
  messages: AiChatMessage[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<unknown>
  streamingAssistantMessageId: MessageId | null
  thinkingVisible: boolean
}

type MessageListScrollAnchor = {
  scrollHeight: number
  scrollTop: number
}

type UseMessageListScrollResult = {
  scrollRef: RefObject<HTMLDivElement | null>
  handleScroll: () => void
  scrollToBottom: () => void
  showJumpButton: boolean
}

export function useMessageListScroll({
  chatId,
  messages,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  streamingAssistantMessageId,
  thinkingVisible,
}: UseMessageListScrollParams): UseMessageListScrollResult {
  const scrollRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<MessageListScrollAnchor | null>(null)
  const [nearBottom, setNearBottom] = useState(true)
  const didInitialScrollRef = useRef(false)

  useLayoutEffect(() => {
    didInitialScrollRef.current = false
  }, [chatId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || messages.length === 0) {
      return
    }
    if (!didInitialScrollRef.current) {
      el.scrollTop = el.scrollHeight
      didInitialScrollRef.current = true
      setNearBottom(true)
    }
  }, [chatId, messages])

  useLayoutEffect(() => {
    const el = scrollRef.current
    const anchor = anchorRef.current
    if (!el || !anchor || isFetchingNextPage) {
      return
    }
    anchorRef.current = null
    const delta = el.scrollHeight - anchor.scrollHeight
    el.scrollTop = anchor.scrollTop + delta
  }, [isFetchingNextPage, messages.length])

  // Stick to bottom while the user has not scrolled up. `messages` alone is not enough:
  // stream end (streaming → full markdown) and thinking toggle change height without new rows.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !nearBottom || messages.length === 0) {
      return
    }
    el.scrollTop = el.scrollHeight
  }, [messages, nearBottom, streamingAssistantMessageId, thinkingVisible])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setNearBottom(distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX)

    if (
      didInitialScrollRef.current &&
      el.scrollTop < LOAD_OLDER_SCROLL_TOP_PX &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      anchorRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop }
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  const showJumpButton = useMemo(() => !nearBottom && messages.length > 0, [nearBottom, messages.length])

  return {
    scrollRef,
    handleScroll,
    scrollToBottom,
    showJumpButton,
  }
}
