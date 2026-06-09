import { Box, Drawer } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Resizable, type ResizeCallback } from 're-resizable'
import { type FC, useCallback, useState } from 'react'

import { APP_HEADER_HEIGHT } from '@netcracker/qubership-apihub-ui-shared/themes/components'
import { PANEL_SCREEN_HISTORY, usePanel } from './state/panelContext'
import { ChatScreen } from './ui/screens/ChatScreen'
import { HistoryScreen } from './ui/screens/HistoryScreen'

const AI_ASSISTANT_PANEL_WIDTH_STORAGE_KEY = 'apihub.aiAssistant.panelWidth'
const AI_ASSISTANT_PANEL_MIN_WIDTH = 360
const AI_ASSISTANT_PANEL_DEFAULT_WIDTH = 440
const AI_ASSISTANT_PANEL_MAX_WIDTH = '50vw'

const RESIZE_ENABLE = {
  top: false,
  right: false,
  bottom: false,
  left: true,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false,
}

/**
 * Keep the visible resize area slightly wider than the panel edge so users can grab it.
 * `overflow: 'visible'` on the drawer paper is required so the handle that leaks
 * 4px outside the panel is still clickable and draggable.
 */
const RESIZE_HANDLE_STYLES = {
  left: {
    left: '-4px',
    width: '8px',
    cursor: 'ew-resize',
  },
}

const DRAWER_LAYOUT_STYLES = {
  top: APP_HEADER_HEIGHT,
  height: `calc(100% - ${APP_HEADER_HEIGHT})`,
}

export const AiAssistantPanel: FC = () => {
  const { open, closePanel, screen } = usePanel()
  const [panelWidth, setPanelWidth] = useState(readStoredPanelWidth)

  const handleResizeStop: ResizeCallback = useCallback((_event, _direction, elementRef) => {
    const width = normalizePanelWidth(elementRef.offsetWidth)
    setPanelWidth(width)
    localStorage.setItem(AI_ASSISTANT_PANEL_WIDTH_STORAGE_KEY, `${width}`)
  }, [])

  return (
    <StyledDrawer
      anchor="right"
      open={open}
      onClose={closePanel}
    >
      <Resizable
        size={{ width: panelWidth, height: '100%' }}
        minWidth={AI_ASSISTANT_PANEL_MIN_WIDTH}
        maxWidth={AI_ASSISTANT_PANEL_MAX_WIDTH}
        enable={RESIZE_ENABLE}
        handleStyles={RESIZE_HANDLE_STYLES}
        boundsByDirection={true}
        onResizeStop={handleResizeStop}
      >
        <PanelContainer data-testid="AiAssistantPanel">
          {screen === PANEL_SCREEN_HISTORY ? <HistoryScreen /> : <ChatScreen />}
        </PanelContainer>
      </Resizable>
    </StyledDrawer>
  )
}

/**
 * Default Drawer modal covers the full viewport and blocks the app header.
 * We offset the drawer/backdrop below the header and manage pointer events:
 * - modal wrapper: no pointer events (header strip stays interactive),
 * - backdrop: captures clicks in the shaded area and closes via Drawer onClose,
 * - drawer paper: pointer events enabled (panel is clickable).
 * App-header actions close the panel via `hideAiAssistantPanel` on the event bus.
 */
const StyledDrawer = styled(Drawer)({
  pointerEvents: 'none',
  '& .MuiDrawer-paper': {
    pointerEvents: 'auto',
    overflow: 'visible',
    ...DRAWER_LAYOUT_STYLES,
  },
  '& .MuiBackdrop-root': {
    pointerEvents: 'auto',
    ...DRAWER_LAYOUT_STYLES,
  },
})

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

function readStoredPanelWidth(): number {
  const rawPanelWidth = localStorage.getItem(AI_ASSISTANT_PANEL_WIDTH_STORAGE_KEY)
  if (!rawPanelWidth) {
    return AI_ASSISTANT_PANEL_DEFAULT_WIDTH
  }

  return normalizePanelWidth(Number.parseInt(rawPanelWidth, 10))
}

function normalizePanelWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return AI_ASSISTANT_PANEL_DEFAULT_WIDTH
  }

  return Math.max(Math.round(width), AI_ASSISTANT_PANEL_MIN_WIDTH)
}
