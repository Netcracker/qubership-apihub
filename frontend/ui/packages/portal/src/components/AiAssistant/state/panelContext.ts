import { createContext, useContext } from 'react'

import type { ChatId } from '../api/types'
import type { StreamingTurnState } from '../streaming/turn/streamingTurnReducer'

export const PANEL_SCREEN_CHAT = 'chat'
export const PANEL_SCREEN_HISTORY = 'history'

export type PanelScreen =
  | typeof PANEL_SCREEN_CHAT
  | typeof PANEL_SCREEN_HISTORY

export type PanelContextValue = {
  open: boolean
  screen: PanelScreen
  activeChatId: ChatId | null
  openPanel: () => void
  closePanel: () => void
  openHistory: () => void
  openChatScreen: (chatId: ChatId | null) => void
  resetActiveChat: () => void
  clearActiveChat: () => void
  startNewChat: () => void
}

export type SubmitTurnHandler = (activeChatId: ChatId | null, content: string) => Promise<void>

export type StreamingActions = {
  submit: SubmitTurnHandler
  abort: () => void
  reset: () => void
}

export type StreamingTurnStatus = {
  isBusy: boolean
  activeTurnChatId: ChatId | null
}

export type StreamingLive = {
  state: StreamingTurnState
  /** True while assistant is streaming text but no start/delta arrived for a few seconds (tools / network gaps). */
  thinkingDuringAssistantPause: boolean
}

export const PanelContext = createContext<PanelContextValue>()
export const StreamingActionsContext = createContext<StreamingActions>()
export const StreamingTurnStatusContext = createContext<StreamingTurnStatus>()
export const StreamingLiveContext = createContext<StreamingLive>()

export function usePanel(): PanelContextValue {
  return useContext(PanelContext)
}

export function useStreamingActions(): StreamingActions {
  return useContext(StreamingActionsContext)
}

export function useStreamingTurnStatus(): StreamingTurnStatus {
  return useContext(StreamingTurnStatusContext)
}

export function useStreamingLive(): StreamingLive {
  return useContext(StreamingLiveContext)
}
