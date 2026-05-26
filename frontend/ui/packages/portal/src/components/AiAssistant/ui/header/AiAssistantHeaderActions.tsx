import { type FC, memo } from 'react'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'

import { ClockBackwardIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ClockBackwardIcon'
import { CloseIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloseIcon'
import { NewChatIcon } from '@netcracker/qubership-apihub-ui-shared/icons/NewChatIcon'

export type AiAssistantHeaderActionsProps = {
  newChatDisabled: boolean
  onNewChat: () => void
  onHistory: () => void
  onClose: () => void
}

export const AiAssistantHeaderActions: FC<AiAssistantHeaderActionsProps> = memo(({
  newChatDisabled,
  onNewChat,
  onHistory,
  onClose,
}) => {
  return (
    <HeaderActions>
      <IconButton
        aria-label="New chat"
        data-testid="NewChatButton"
        disabled={newChatDisabled}
        onClick={onNewChat}
        color="inherit"
      >
        <NewChatIcon fontSize="small" />
      </IconButton>
      <IconButton
        aria-label="Chat history"
        data-testid="HistoryButton"
        onClick={onHistory}
        color="inherit"
      >
        <ClockBackwardIcon fontSize="small" />
      </IconButton>
      <IconButton
        aria-label="Close AI Assistant"
        data-testid="CloseButton"
        onClick={onClose}
        color="inherit"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </HeaderActions>
  )
})

AiAssistantHeaderActions.displayName = 'AiAssistantHeaderActions'

const HeaderActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flexShrink: 0,
}))

HeaderActions.displayName = 'HeaderActions'
