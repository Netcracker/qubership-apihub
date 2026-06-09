import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import { type FC, memo } from 'react'

import { MESSAGE_BACKGROUND_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'

type ChatUserMessageProps = {
  content: string
}

export const ChatUserMessage: FC<ChatUserMessageProps> = memo(({ content }) => {
  return <UserBubble>{content}</UserBubble>
})

ChatUserMessage.displayName = 'ChatUserMessage'

const UserBubble = styled(Box)(({ theme }) => ({
  alignSelf: 'flex-end',
  maxWidth: '100%',
  padding: theme.spacing(1.25, 1.5),
  borderRadius: theme.spacing(2),
  backgroundColor: MESSAGE_BACKGROUND_COLOR,
  color: theme.palette.text.primary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  ...theme.typography.body2,
}))
