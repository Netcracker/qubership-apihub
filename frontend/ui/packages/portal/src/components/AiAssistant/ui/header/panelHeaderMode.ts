import { PANEL_SCREEN_CHAT, PANEL_SCREEN_HISTORY, type PanelScreen } from '../../state/panelContext'

export const PANEL_HEADER_TITLE: Record<PanelScreen, string> = {
  [PANEL_SCREEN_CHAT]: 'AI Assistant',
  [PANEL_SCREEN_HISTORY]: 'History',
}
