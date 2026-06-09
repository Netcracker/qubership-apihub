import { type FC, memo } from 'react'

import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

import { PANEL_SCREEN_HISTORY } from '../../state/panelContext'
import { PanelHeader } from '../header/PanelHeader'
import { ChatListRow } from '../history/ChatListRow'
import { DeleteChatConfirmation } from '../history/DeleteChatDialog'
import { HistorySearchField } from '../history/HistorySearchField'
import { useHistoryScreen } from '../history/useHistoryScreen'

export const HistoryScreen: FC = memo(() => {
  const {
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
  } = useHistoryScreen()

  const isEmpty = chats.length === 0

  return (
    <HistoryLayout>
      <PanelHeader
        mode={PANEL_SCREEN_HISTORY}
        onBack={handleBack}
      />
      <HistorySearchField value={searchQuery} onChange={setSearchQuery} />
      <ListArea
        ref={listRef}
        onScroll={handleListScroll}
        data-testid="AiAssistantHistoryList"
      >
        <HistoryListColumn $isEmpty={isEmpty}>
          <RecentlyLabel>Recent</RecentlyLabel>
          {isEmpty && !chatsQuery.isLoading && (
            <CenteredState>
              <Typography color="text.secondary" variant="body2">
                No chats found.
              </Typography>
            </CenteredState>
          )}
          {!isEmpty && chats.map((chat) => (
            <ChatListRow
              key={chat.chatId}
              chat={chat}
              rowTitleOverride={rowTitleOverrideByChatId[chat.chatId]}
              isActive={activeChatId === chat.chatId}
              isEditing={renamingChatId === chat.chatId}
              loadedPinnedCount={loadedPinnedCount}
              isBusy={isBusy}
              activeTurnChatId={activeTurnChatId}
              onOpenChat={handleOpenChat}
              onStartRename={handleStartRename}
              onRenameChat={handleRenameChat}
              onCancelRename={handleCancelRename}
              onTogglePin={handlePinToggle}
              onRequestDelete={handleRequestDelete}
              onReleaseRowTitleOverride={clearRowTitleOverride}
            />
          ))}
        </HistoryListColumn>
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

HistoryScreen.displayName = 'HistoryScreen'

const HistoryLayout = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})

const LIST_FLEX_COLUMN = { display: 'flex', flexDirection: 'column' } as const

const ListArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  // Match HistorySearchField horizontal inset so list aligns with search
  padding: theme.spacing(0, 3, 2),
  ...LIST_FLEX_COLUMN,
}))

const HistoryListColumn = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isEmpty',
})<{ $isEmpty?: boolean }>(({ theme, $isEmpty }) => ({
  ...LIST_FLEX_COLUMN,
  ...($isEmpty ? { flex: 1 } : { gap: theme.spacing(0.5) }),
}))

const RecentlyLabel = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1, 0, 0.5, 1.5),
  color: theme.palette.text.secondary,
  fontSize: 13,
  fontWeight: 500,
}))

const CenteredState = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: theme.spacing(20),
  padding: theme.spacing(2),
}))
