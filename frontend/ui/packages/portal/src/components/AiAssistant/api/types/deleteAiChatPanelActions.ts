import type { PanelScreen } from '../../state/panelContext'
import type { ChatId } from '../types'

export type DeleteAiChatContext = {
  wasActiveChat: boolean
  previousScreen: PanelScreen
}

export type DeleteAiChatPanelActions = {
  getDeleteContext: (chatId: ChatId) => DeleteAiChatContext
  onBeforeDelete: (chatId: ChatId, context: DeleteAiChatContext) => void
  onDeleteFailed: (chatId: ChatId, context: DeleteAiChatContext) => void
}
