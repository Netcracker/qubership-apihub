import { type FC, type KeyboardEvent, memo, useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import { styled, type Theme } from '@mui/material/styles'

import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { PinIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PinIcon'

import type { AiChat, ChatId } from '../../api/types'
import { ChatRowActionsMenu } from './ChatRowActionsMenu'
import { InlineRenameField } from './InlineRenameField'

export type ChatListRowProps = {
  chat: AiChat
  /** Shown until list cache matches (rename save). */
  rowTitleOverride?: string
  isActive: boolean
  isEditing: boolean
  isPinDisabled: boolean
  pinDisabledTooltip?: string
  isDeleteDisabled: boolean
  onOpen: () => void
  onStartRename: () => void
  onRename: (title: string) => void
  onCancelRename: () => void
  onTogglePin: (nextPinned: boolean) => void
  onDelete: () => void
  onReleaseRowTitleOverride: (chatId: ChatId) => void
}

export const ChatListRow: FC<ChatListRowProps> = memo(({
  chat,
  rowTitleOverride,
  isActive,
  isEditing,
  isPinDisabled,
  pinDisabledTooltip,
  isDeleteDisabled,
  onOpen,
  onStartRename,
  onRename,
  onCancelRename,
  onTogglePin,
  onDelete,
  onReleaseRowTitleOverride,
}) => {
  const listTitleSource = rowTitleOverride ?? chat.title
  const displayedTitle = listTitleSource.trim() || 'Untitled chat'
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
      onReleaseRowTitleOverride(chat.chatId)
    }
  }, [chat.chatId, chat.title, onReleaseRowTitleOverride, rowTitleOverride])

  const handleOpen = useCallback(() => {
    if (isEditing) {
      return
    }
    onOpen()
  }, [isEditing, onOpen])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) {
      return
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    event.preventDefault()
    onOpen()
  }, [isEditing, onOpen])

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
      aria-label={isEditing ? undefined : displayedTitle}
    >
      <TitleSlot>
        {isEditing
          ? (
            <InlineRenameField
              initialTitle={listTitleSource}
              onSave={onRename}
              onCancel={onCancelRename}
            />
          )
          : (
            <RowTitle tooltipText={displayedTitle}>
              {displayedTitle}
            </RowTitle>
          )}
      </TitleSlot>
      {!isEditing
        ? (
          <ActionsSlot>
            {chat.pinned ? <PinIcon aria-hidden fontSize="small" /> : null}
            <ChatRowActionsMenu
              pinned={Boolean(chat.pinned)}
              pinDisabled={isPinDisabled}
              pinDisabledTooltip={pinDisabledTooltip}
              deleteDisabled={isDeleteDisabled}
              onRename={onStartRename}
              onTogglePin={onTogglePin}
              onDelete={onDelete}
              onMenuOpenChange={setActionsMenuOpen}
            />
          </ActionsSlot>
        )
        : null}
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
