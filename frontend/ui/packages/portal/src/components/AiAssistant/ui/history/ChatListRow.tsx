import { type FC, type KeyboardEvent, memo, useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import { styled, type Theme } from '@mui/material/styles'

import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { PinIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PinIcon'

import { type AiChat, type ChatId, MAX_PINNED_PER_USER } from '../../api/types'
import { ChatRowActionsMenu } from './ChatRowActionsMenu'
import { InlineRenameField } from './InlineRenameField'

const PIN_LIMIT_TOOLTIP = `The maximum of ${MAX_PINNED_PER_USER} pinned chats is reached. Unpin one to pin another.`

type ChatListRowProps = {
  chat: AiChat
  /** Shown until list cache matches (rename save). */
  rowTitleOverride?: string
  isActive: boolean
  isEditing: boolean
  loadedPinnedCount: number
  isBusy: boolean
  activeTurnChatId: ChatId | null
  onOpenChat: (chatId: ChatId) => void
  onStartRename: (chatId: ChatId) => void
  onRenameChat: (chatId: ChatId, title: string) => void
  onCancelRename: () => void
  onTogglePin: (chatId: ChatId, nextPinned: boolean) => void
  onRequestDelete: (chat: AiChat) => void
  onReleaseRowTitleOverride: (chatId: ChatId) => void
}

export const ChatListRow: FC<ChatListRowProps> = memo(({
  chat,
  rowTitleOverride,
  isActive,
  isEditing,
  loadedPinnedCount,
  isBusy,
  activeTurnChatId,
  onOpenChat,
  onStartRename,
  onRenameChat,
  onCancelRename,
  onTogglePin,
  onRequestDelete,
  onReleaseRowTitleOverride,
}) => {
  const { chatId } = chat
  const listTitleSource = rowTitleOverride ?? chat.title
  const displayedTitle = listTitleSource.trim() || 'Untitled chat'
  const pinDisabled = !chat.pinned && loadedPinnedCount >= MAX_PINNED_PER_USER
  const deleteDisabled = isBusy && activeTurnChatId === chatId
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)

  useEffect(() => {
    if (isEditing) {
      setActionsMenuOpen(false)
    }
  }, [isEditing])

  useEffect(() => {
    if (rowTitleOverride === undefined) {
      return
    }
    if (chat.title.trim() === rowTitleOverride.trim()) {
      onReleaseRowTitleOverride(chatId)
    }
  }, [chat.title, chatId, onReleaseRowTitleOverride, rowTitleOverride])

  const handleOpen = useCallback(() => {
    if (isEditing) {
      return
    }
    onOpenChat(chatId)
  }, [chatId, isEditing, onOpenChat])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) {
      return
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    event.preventDefault()
    onOpenChat(chatId)
  }, [chatId, isEditing, onOpenChat])

  const handleRename = useCallback((title: string) => {
    onRenameChat(chatId, title)
  }, [chatId, onRenameChat])

  const handleTogglePin = useCallback((nextPinned: boolean) => {
    onTogglePin(chatId, nextPinned)
  }, [chatId, onTogglePin])

  return (
    <RowRoot
      role={isEditing ? undefined : 'button'}
      tabIndex={isEditing ? -1 : 0}
      active={isActive}
      editing={isEditing}
      actionsMenuOpen={actionsMenuOpen}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      data-testid="AiAssistantHistoryChatRow"
    >
      <TitleSlot>
        {isEditing
          ? (
            <InlineRenameField
              initialTitle={listTitleSource}
              onSave={handleRename}
              onCancel={onCancelRename}
            />
          )
          : (
            <RowTitle tooltipText={displayedTitle}>
              {displayedTitle}
            </RowTitle>
          )}
      </TitleSlot>
      {!isEditing && (
        <ActionsSlot>
          {chat.pinned && <PinIcon aria-hidden fontSize="small" />}
          <ChatRowActionsMenu
            pinned={!!chat.pinned}
            pinDisabled={pinDisabled}
            pinDisabledTooltip={pinDisabled ? PIN_LIMIT_TOOLTIP : undefined}
            deleteDisabled={deleteDisabled}
            onRename={() => onStartRename(chatId)}
            onTogglePin={handleTogglePin}
            onDelete={() => onRequestDelete(chat)}
            onMenuOpenChange={setActionsMenuOpen}
          />
        </ActionsSlot>
      )}
    </RowRoot>
  )
})

ChatListRow.displayName = 'ChatListRow'

const RowRoot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'editing' && prop !== 'actionsMenuOpen',
})<{ active: boolean; editing: boolean; actionsMenuOpen: boolean }>(({
  theme,
  active,
  editing,
  actionsMenuOpen,
}) => {
  const backgroundColor = rowSurfaceBackground(theme, { active, editing, actionsMenuOpen })
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1.5),
    border: `1px solid ${editing ? theme.palette.primary.main : 'transparent'}`,
    backgroundColor: backgroundColor,
    cursor: editing ? 'default' : 'pointer',
    ...(!editing
      ? {
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '&:active': {
          backgroundColor: theme.palette.action.selected,
        },
      }
      : {}),
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 1,
    },
  }
})

const TitleSlot = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
})

const RowTitle = styled(TextWithOverflowTooltip)(({ theme }) => ({
  display: 'block',
  width: '100%',
  color: theme.palette.text.primary,
  fontSize: 13,
  lineHeight: '20px',
  fontWeight: 500,
}))

RowTitle.displayName = 'RowTitle'

const ActionsSlot = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
})

function rowSurfaceBackground(
  theme: Theme,
  state: { active: boolean; editing: boolean; actionsMenuOpen: boolean },
): string {
  const { palette } = theme
  if (state.editing) {
    return palette.background.paper
  }
  if (state.actionsMenuOpen) {
    return state.active ? palette.action.selected : palette.action.hover
  }
  if (state.active) {
    return palette.action.selected
  }
  return palette.background.paper
}
