import { type CSSObject, type Theme } from '@mui/material/styles'

const CHAT_CARD_DROP_SHADOW =
  '0px 1px 1px 0px rgba(4, 10, 21, 0.04), 0px 3px 14px 0px rgba(4, 12, 29, 0.09), 0px 0px 1px 0px rgba(7, 13, 26, 0.27)'

/** Class on generated-file anchors; underline/color overrides live on `AssistantMarkdownSurface`. */
export const CHAT_CARD_LINK_CLASS = 'assistant-chat-card-link'

export function chatCardSurface(theme: Theme): CSSObject {
  return {
    margin: theme.spacing(1, 0),
    padding: theme.spacing(1, 1, 1, 1.5),
    boxSizing: 'border-box',
    border: 'none',
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    boxShadow: CHAT_CARD_DROP_SHADOW,
  }
}
