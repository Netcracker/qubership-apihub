import { type UseInfiniteQueryResult } from '@tanstack/react-query'
import { type Dispatch, type RefObject, type SetStateAction, useCallback, useMemo, useRef, useState } from 'react'

import { type AiChat, type AiChatsListResponse, type ChatId } from '../../api/types'
import { useAiChats } from '../../api/useAiChats'
import { useDeleteAiChat, type UseDeleteAiChatResult } from '../../api/useDeleteAiChat'
import { useUpdateAiChat } from '../../api/useUpdateAiChat'
import { usePanel, useStreamingTurnStatus } from '../../state/panelContext'
import { selectChatsFromPages, selectPinnedChatCount } from './aiChatHistorySelectors'
import { useDeleteAiChatPanelActions } from './useDeleteAiChatPanelActions'

const LOAD_NEXT_PAGE_THRESHOLD_PX = 120

type HistoryScreenState = {
  activeChatId: ChatId | null
  activeTurnChatId: ChatId | null
  chatPendingDelete: AiChat | null
  chats: AiChat[]
  chatsQuery: UseInfiniteQueryResult<AiChatsListResponse, Error>
  clearRowTitleOverride: (chatId: ChatId) => void
  deleteChat: UseDeleteAiChatResult
  handleBack: () => void
  handleCancelDelete: () => void
  handleCancelRename: () => void
  handleConfirmDelete: () => void
  handleListScroll: () => void
  handleOpenChat: (chatId: ChatId) => void
  handlePinToggle: (chatId: ChatId, nextPinned: boolean) => void
  handleRenameChat: (chatId: ChatId, title: string) => void
  handleRequestDelete: (chat: AiChat) => void
  handleStartRename: (chatId: ChatId) => void
  isBusy: boolean
  listRef: RefObject<HTMLDivElement | null>
  loadedPinnedCount: number
  renamingChatId: ChatId | null
  rowTitleOverrideByChatId: Partial<Record<ChatId, string>>
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
}

export function useHistoryScreen(): HistoryScreenState {
  const { activeChatId, openChatScreen } = usePanel()
  const { isBusy, activeTurnChatId } = useStreamingTurnStatus()
  const { renameChat, setChatPinned } = useUpdateAiChat()
  const deleteChatPanelActions = useDeleteAiChatPanelActions()
  const deleteChat = useDeleteAiChat(deleteChatPanelActions)

  const [searchQuery, setSearchQuery] = useState('')
  const [renamingChatId, setRenamingChatId] = useState<ChatId | null>(null)
  const [rowTitleOverrideByChatId, setRowTitleOverrideByChatId] = useState<Partial<Record<ChatId, string>>>({})
  const [chatPendingDelete, setChatPendingDelete] = useState<AiChat | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const chatsQuery = useAiChats(searchQuery)
  /** Same cache as `chatsQuery` when search is empty; otherwise full list for pin limit. */
  const pinsBaselineQuery = useAiChats('')

  const chats = useMemo(
    () => selectChatsFromPages(chatsQuery.data?.pages),
    [chatsQuery.data?.pages],
  )
  const loadedPinnedCount = useMemo(
    () => selectPinnedChatCount(pinsBaselineQuery.data?.pages),
    [pinsBaselineQuery.data?.pages],
  )
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = chatsQuery

  const handleBack = useCallback(() => {
    openChatScreen(activeChatId)
  }, [activeChatId, openChatScreen])

  const handleOpenChat = useCallback((chatId: ChatId) => {
    setRenamingChatId(null)
    openChatScreen(chatId)
  }, [openChatScreen])

  const clearRowTitleOverride = useCallback((chatId: ChatId) => {
    setRowTitleOverrideByChatId((prev) => {
      if (prev[chatId] === undefined) {
        return prev
      }
      const next = { ...prev }
      delete next[chatId]
      return next
    })
  }, [])

  const handleRenameChat = useCallback((chatId: ChatId, title: string) => {
    setRenamingChatId(null)
    setRowTitleOverrideByChatId((prev) => ({ ...prev, [chatId]: title }))
    renameChat(chatId, title, {
      onError: () => {
        clearRowTitleOverride(chatId)
      },
    })
  }, [clearRowTitleOverride, renameChat])

  const handleStartRename = useCallback((chatId: ChatId) => {
    setRenamingChatId(chatId)
  }, [])

  const handleCancelRename = useCallback(() => {
    setRenamingChatId(null)
  }, [])

  const handlePinToggle = useCallback((chatId: ChatId, nextPinned: boolean) => {
    setChatPinned(chatId, nextPinned)
  }, [setChatPinned])

  const handleRequestDelete = useCallback((chat: AiChat) => {
    setChatPendingDelete(chat)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!chatPendingDelete) {
      return
    }
    const chatToDelete = chatPendingDelete.chatId
    setChatPendingDelete(null)
    setRenamingChatId((current) => (current === chatToDelete ? null : current))
    deleteChat.deleteChat(chatToDelete)
  }, [chatPendingDelete, deleteChat])

  const handleCancelDelete = useCallback(() => {
    setChatPendingDelete(null)
  }, [])

  const handleListScroll = useCallback(() => {
    const element = listRef.current
    if (!element || !hasNextPage || isFetchingNextPage) {
      return
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    if (distanceFromBottom > LOAD_NEXT_PAGE_THRESHOLD_PX) {
      return
    }
    void fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return {
    activeChatId,
    activeTurnChatId,
    chatPendingDelete,
    chats,
    chatsQuery,
    clearRowTitleOverride,
    deleteChat,
    handleBack,
    handleCancelDelete,
    handleCancelRename,
    handleConfirmDelete,
    handleListScroll,
    handleOpenChat,
    handlePinToggle,
    handleRenameChat,
    handleRequestDelete,
    handleStartRename,
    isBusy,
    listRef,
    loadedPinnedCount,
    renamingChatId,
    rowTitleOverrideByChatId,
    searchQuery,
    setSearchQuery,
  }
}
