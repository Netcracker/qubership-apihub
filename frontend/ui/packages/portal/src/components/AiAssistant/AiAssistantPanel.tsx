import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC } from 'react'

import { SidePanelDrawer } from '@netcracker/qubership-apihub-ui-shared/components/SidePanelDrawer'
import { PANEL_SCREEN_HISTORY, usePanel } from './state/panelContext'
import { ChatScreen } from './ui/screens/ChatScreen'
import { HistoryScreen } from './ui/screens/HistoryScreen'

const AI_ASSISTANT_PANEL_WIDTH_STORAGE_KEY = 'apihub.aiAssistant.panelWidth'
const AI_ASSISTANT_PANEL_MIN_WIDTH = 360
const AI_ASSISTANT_PANEL_DEFAULT_WIDTH = 440
const AI_ASSISTANT_PANEL_MAX_WIDTH = '50vw'

export const AiAssistantPanel: FC = () => {
  const { open, closePanel, screen } = usePanel()

  return (
    <SidePanelDrawer
      open={open}
      onClose={closePanel}
      resizable
      widthStorageKey={AI_ASSISTANT_PANEL_WIDTH_STORAGE_KEY}
      defaultWidth={AI_ASSISTANT_PANEL_DEFAULT_WIDTH}
      minWidth={AI_ASSISTANT_PANEL_MIN_WIDTH}
      maxWidth={AI_ASSISTANT_PANEL_MAX_WIDTH}
    >
      <PanelContainer data-testid="AiAssistantPanel">
        {screen === PANEL_SCREEN_HISTORY ? <HistoryScreen /> : <ChatScreen />}
      </PanelContainer>
    </SidePanelDrawer>
  )
}

const PanelContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  minHeight: 0,
  flex: 1,
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.background.paper,
}))
