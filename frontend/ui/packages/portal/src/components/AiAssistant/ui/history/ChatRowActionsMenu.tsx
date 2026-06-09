import { type FC, memo, type MouseEvent, useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import type { PopoverOrigin } from '@mui/material/Popover'
import { styled } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'

import { ActionsIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ActionsIcon'

type ChatRowActionsMenuProps = {
  pinned: boolean
  pinDisabled: boolean
  pinDisabledTooltip?: string
  deleteDisabled: boolean
  onRename: () => void
  onTogglePin: (nextPinned: boolean) => void
  onDelete: () => void
  onMenuOpenChange?: (open: boolean) => void
}

const MENU_ANCHOR_ORIGIN: PopoverOrigin = {
  vertical: 'bottom',
  horizontal: 'right',
}

const MENU_TRANSFORM_ORIGIN: PopoverOrigin = {
  vertical: 'top',
  horizontal: 'right',
}

export const ChatRowActionsMenu: FC<ChatRowActionsMenuProps> = memo(({
  pinned,
  pinDisabled,
  pinDisabledTooltip,
  deleteDisabled,
  onRename,
  onTogglePin,
  onDelete,
  onMenuOpenChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  const closeMenu = useCallback(() => {
    setAnchorEl(null)
    onMenuOpenChange?.(false)
  }, [onMenuOpenChange])

  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event)
    setAnchorEl(event.currentTarget)
    onMenuOpenChange?.(true)
  }, [onMenuOpenChange, stopPropagation])

  const handleRename = useCallback((event: MouseEvent<HTMLElement>) => {
    stopPropagation(event)
    closeMenu()
    onRename()
  }, [closeMenu, onRename, stopPropagation])

  const handlePinClick = useCallback((event: MouseEvent<HTMLElement>) => {
    stopPropagation(event)
    if (pinDisabled) {
      return
    }
    closeMenu()
    onTogglePin(!pinned)
  }, [closeMenu, onTogglePin, pinned, pinDisabled, stopPropagation])

  const handleDelete = useCallback((event: MouseEvent<HTMLElement>) => {
    stopPropagation(event)
    closeMenu()
    onDelete()
  }, [closeMenu, onDelete, stopPropagation])

  const pinLimitBlocked = pinDisabled && !!pinDisabledTooltip

  return (
    <>
      <ActionsMenuIconButton
        size="small"
        color="inherit"
        aria-label="Chat actions"
        aria-expanded={open}
        aria-haspopup="true"
        data-testid="AiAssistantHistoryChatActionsButton"
        onClick={handleOpen}
        onMouseDown={stopPropagation}
      >
        <ActionsIcon fontSize="small" />
      </ActionsMenuIconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onClick={stopPropagation}
        anchorOrigin={MENU_ANCHOR_ORIGIN}
        transformOrigin={MENU_TRANSFORM_ORIGIN}
      >
        <MenuItem onClick={handleRename}>
          Rename
        </MenuItem>
        <PinMenuItem
          $pinLimitBlocked={pinLimitBlocked}
          disabled={pinDisabled && !pinLimitBlocked}
          onClick={handlePinClick}
          aria-disabled={pinDisabled}
        >
          <Tooltip
            title={pinLimitBlocked ? pinDisabledTooltip : undefined}
            placement="left"
            disableHoverListener={!pinLimitBlocked}
          >
            <PinMenuItemLabel>
              {pinned ? 'Unpin' : 'Pin'}
            </PinMenuItemLabel>
          </Tooltip>
        </PinMenuItem>
        <MenuItem
          disabled={deleteDisabled}
          onClick={handleDelete}
        >
          Delete
        </MenuItem>
      </Menu>
    </>
  )
})

ChatRowActionsMenu.displayName = 'ChatRowActionsMenu'

const PinMenuItemLabel = styled(Box)({
  display: 'block',
  width: '100%',
})

const PinMenuItem = styled(MenuItem, {
  shouldForwardProp: (prop) => prop !== '$pinLimitBlocked',
})<{ $pinLimitBlocked?: boolean }>(({ theme, $pinLimitBlocked }) => ({
  ...($pinLimitBlocked
    ? {
      opacity: theme.palette.action.disabledOpacity,
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'transparent',
      },
      '&.Mui-focusVisible': {
        backgroundColor: 'transparent',
      },
      '&:active': {
        backgroundColor: 'transparent',
      },
      '&.Mui-selected': {
        backgroundColor: 'transparent',
      },
    }
    : {}),
}))

const ActionsMenuIconButton = styled(IconButton)(({ theme }) => ({
  height: 20,
  '&:hover, &[aria-expanded="true"]': {
    backgroundColor: theme.palette.action.hover,
  },
}))
