import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { type FC, memo } from 'react'

import { BackArrowIcon } from '@netcracker/qubership-apihub-ui-shared/icons/BackArrowIcon'
import { RobotFilledIcon } from '@netcracker/qubership-apihub-ui-shared/icons/RobotFilledIcon'

import type { PANEL_SCREEN_CHAT } from '../../state/panelContext'
import { PANEL_SCREEN_HISTORY, usePanel } from '../../state/panelContext'
import { PanelHeaderActions } from './PanelHeaderActions'
import { PANEL_HEADER_TITLE } from './panelHeaderMode'

type PanelHeaderProps =
  | { mode: typeof PANEL_SCREEN_CHAT }
  | {
    mode: typeof PANEL_SCREEN_HISTORY
    onBack: () => void
  }

export const PanelHeader: FC<PanelHeaderProps> = memo((props) => {
  const { startNewChat, openHistory, closePanel } = usePanel()

  return (
    <HeaderRoot>
      <HeaderToolbar>
        <HeaderLeading>
          {props.mode === PANEL_SCREEN_HISTORY
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
            {PANEL_HEADER_TITLE[props.mode]}
          </HeaderHeading>
        </HeaderLeading>
        <PanelHeaderActions
          onNewChat={startNewChat}
          onHistory={openHistory}
          onClose={closePanel}
        />
      </HeaderToolbar>
      <Divider orientation="horizontal" variant="fullWidth" flexItem />
    </HeaderRoot>
  )
})

PanelHeader.displayName = 'PanelHeader'

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
