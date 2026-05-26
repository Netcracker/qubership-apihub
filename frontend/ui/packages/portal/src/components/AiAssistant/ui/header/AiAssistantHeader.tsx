import { type FC, memo } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

import { BackArrowIcon } from '@netcracker/qubership-apihub-ui-shared/icons/BackArrowIcon'
import { RobotFilledIcon } from '@netcracker/qubership-apihub-ui-shared/icons/RobotFilledIcon'

import type { AiAssistantHeaderHandlers } from '../../hooks/useAiAssistantHeaderHandlers'
import { AiAssistantHeaderActions } from './AiAssistantHeaderActions'
import { AI_ASSISTANT_HEADER_MODE, AI_ASSISTANT_HEADER_TITLE } from './aiAssistantHeaderMode'

export type AiAssistantHeaderProps =
  | (AiAssistantHeaderHandlers & { mode: typeof AI_ASSISTANT_HEADER_MODE.chat })
  | (AiAssistantHeaderHandlers & {
    mode: typeof AI_ASSISTANT_HEADER_MODE.history
    onBack: () => void
  })

export const AiAssistantHeader: FC<AiAssistantHeaderProps> = memo((props) => {
  const {
    mode,
    newChatDisabled,
    onNewChat,
    onHistory,
    onClose,
  } = props

  return (
    <HeaderRoot>
      <HeaderToolbar>
        <HeaderLeading>
          {mode === AI_ASSISTANT_HEADER_MODE.history
            ? (
              <IconButton
                aria-label="Back to chat"
                data-testid="HistoryBackButton"
                onClick={props.onBack}
                color="inherit"
              >
                <BackArrowIcon fontSize="small" />
              </IconButton>
            )
            : (
              <HeaderAvatar>
                <RobotFilledIcon />
              </HeaderAvatar>
            )}
          <HeaderHeading variant="h5">
            {AI_ASSISTANT_HEADER_TITLE[mode]}
          </HeaderHeading>
        </HeaderLeading>
        <AiAssistantHeaderActions
          newChatDisabled={newChatDisabled}
          onNewChat={onNewChat}
          onHistory={onHistory}
          onClose={onClose}
        />
      </HeaderToolbar>
      <Divider orientation="horizontal" variant="fullWidth" flexItem />
    </HeaderRoot>
  )
})

AiAssistantHeader.displayName = 'AiAssistantHeader'

const HeaderRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: theme.spacing(11),
}))

HeaderRoot.displayName = 'HeaderRoot'

const HeaderToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: theme.spacing(3),
  minHeight: theme.spacing(11),
}))

HeaderToolbar.displayName = 'HeaderToolbar'

const HeaderLeading = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: 1,
}))

HeaderLeading.displayName = 'HeaderLeading'

const HeaderAvatar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  borderRadius: '12px',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}))

HeaderAvatar.displayName = 'HeaderAvatar'

const HeaderHeading = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
}))

HeaderHeading.displayName = 'HeaderHeading'
