import { type FC, memo, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

import { type AiChat, type ChatId, MAX_PINNED_PER_USER } from '../../api/types'
import { useAiChats } from '../../api/useAiChats'
import { useUpdateAiChat } from '../../api/useUpdateAiChat'
import { useAiAssistantDeleteChat } from '../../hooks/useAiAssistantDeleteChat'
import { useAiAssistantHeaderHandlers } from '../../hooks/useAiAssistantHeaderHandlers'
import { useAiAssistantContext } from '../../state/AiAssistantContext'
import { AiAssistantHeader } from '../header/AiAssistantHeader'
import { AI_ASSISTANT_HEADER_MODE } from '../header/aiAssistantHeaderMode'
import { ChatListRow } from './ChatListRow'
import { DeleteChatConfirmation } from './DeleteChatDialog'
import { HistorySearchField } from './HistorySearchField'

const LOAD_NEXT_PAGE_THRESHOLD_PX = 120

const PIN_LIMIT_TOOLTIP = `The maximum of ${MAX_PINNED_PER_USER} pinned chats is reached. Unpin one to pin another.`

export const AiAssistantHistoryScreen: FC = memo(() => {
  const { activeChatId, openChatScreen, streaming } = useAiAssistantContext()
  const headerHandlers = useAiAssistantHeaderHandlers()
  const updateChat = useUpdateAiChat()
  const deleteChat = useAiAssistantDeleteChat()

  const [searchQuery, setSearchQuery] = useState('')
  const [renamingChatId, setRenamingChatId] = useState<ChatId | null>(null)
  const [rowTitleOverrideByChatId, setRowTitleOverrideByChatId] = useState<Partial<Record<ChatId, string>>>({})
  const [chatPendingDelete, setChatPendingDelete] = useState<AiChat | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const chatsQuery = useAiChats(searchQuery)
  /** Same cache as `chatsQuery` when search is empty; otherwise full list for pin limit. */
  const pinsBaselineQuery = useAiChats('')

  const chats = useMemo<AiChat[]>(() => {
    return chatsQuery.data?.pages.flatMap((page) => page.chats) ?? []
  }, [chatsQuery.data?.pages])
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = chatsQuery

  const loadedPinnedCount = useMemo(() => {
    const pages = pinsBaselineQuery.data?.pages
    if (!pages) {
      return 0
    }
    return pages.flatMap((page) => page.chats).filter((chat) => chat.pinned === true).length
  }, [pinsBaselineQuery.data?.pages])

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
    updateChat.mutate(
      { chatId: chatId, patch: { title: title } },
      {
        onError: () => {
          clearRowTitleOverride(chatId)
        },
      },
    )
  }, [clearRowTitleOverride, updateChat])

  const handlePinToggle = useCallback((chatId: ChatId, nextPinned: boolean) => {
    updateChat.mutate({ chatId: chatId, patch: { pinned: nextPinned } })
  }, [updateChat])

  const handleConfirmDelete = useCallback(() => {
    if (!chatPendingDelete) {
      return
    }
    const chatToDelete = chatPendingDelete.chatId
    setChatPendingDelete(null)
    setRenamingChatId((current) => (current === chatToDelete ? null : current))
    deleteChat.mutate(chatToDelete)
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

  let listBody: ReactNode
  if (chats.length === 0) {
    listBody = (
      <ListStatesColumn>
        <RecentlyLabel>Recent</RecentlyLabel>
        {!chatsQuery.isLoading
          ? (
            <CenteredState>
              <Typography color="text.secondary" variant="body2">
                No chats found.
              </Typography>
            </CenteredState>
          )
          : null}
      </ListStatesColumn>
    )
  } else {
    listBody = (
      <RowsColumn>
        <RecentlyLabel>Recent</RecentlyLabel>
        {chats.map((chat) => {
          const isPinned = chat.pinned === true
          const pinnedOthersCount = loadedPinnedCount - (isPinned ? 1 : 0)
          const pinDisabled = !isPinned && pinnedOthersCount >= MAX_PINNED_PER_USER
          const deleteDisabled = streaming.isBusy &&
            streaming.activeTurnChatId !== null &&
            streaming.activeTurnChatId === chat.chatId

          return (
            <ChatListRow
              key={chat.chatId}
              chat={chat}
              rowTitleOverride={rowTitleOverrideByChatId[chat.chatId]}
              isActive={activeChatId === chat.chatId}
              isEditing={renamingChatId === chat.chatId}
              isPinDisabled={pinDisabled}
              pinDisabledTooltip={pinDisabled ? PIN_LIMIT_TOOLTIP : undefined}
              isDeleteDisabled={deleteDisabled}
              onOpen={() => handleOpenChat(chat.chatId)}
              onStartRename={() => setRenamingChatId(chat.chatId)}
              onRename={(title) => handleRenameChat(chat.chatId, title)}
              onCancelRename={() => setRenamingChatId(null)}
              onTogglePin={(nextPinned) => handlePinToggle(chat.chatId, nextPinned)}
              onDelete={() => setChatPendingDelete(chat)}
              onReleaseRowTitleOverride={clearRowTitleOverride}
            />
          )
        })}
      </RowsColumn>
    )
  }

  return (
    <HistoryLayout>
      <AiAssistantHeader
        mode={AI_ASSISTANT_HEADER_MODE.history}
        onBack={handleBack}
        {...headerHandlers}
      />
      <HistorySearchField value={searchQuery} onChange={setSearchQuery} />
      <ListArea
        ref={listRef}
        onScroll={handleListScroll}
        data-testid="AiAssistantHistoryList"
      >
        {listBody}
      </ListArea>
      <DeleteChatConfirmation
        open={chatPendingDelete !== null}
        loading={deleteChat.isPending}
        chatTitle={chatPendingDelete?.title}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </HistoryLayout>
  )
})

AiAssistantHistoryScreen.displayName = 'AiAssistantHistoryScreen'

const HistoryLayout = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})

const LIST_FLEX_COLUMN = { display: 'flex', flexDirection: 'column' } as const

const ListArea = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  ...LIST_FLEX_COLUMN,
  overflowY: 'auto',
  // Match HistorySearchField horizontal inset so list aligns with search
  padding: theme.spacing(0, 3, 2),
}))

const ListStatesColumn = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  ...LIST_FLEX_COLUMN,
}))

const RowsColumn = styled(Box)(({ theme }) => ({
  ...LIST_FLEX_COLUMN,
  gap: theme.spacing(0.5),
}))

const RecentlyLabel = styled(Typography)(({ theme }) => ({
  // Figma: UI/13 Medium, text secondary, pl-12 inside 24px content gutter
  padding: theme.spacing(1, 0, 0.5, 1.5),
  color: theme.palette.text.secondary,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: '20px',
  letterSpacing: '-0.0325px',
}))

const CenteredState = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: theme.spacing(20),
  padding: theme.spacing(2),
}))
