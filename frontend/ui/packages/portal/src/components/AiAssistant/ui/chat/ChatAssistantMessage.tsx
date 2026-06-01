import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import { type FC, memo, useMemo } from 'react'

import { useShowErrorNotification } from '@netcracker/qubership-apihub-ui-portal/src/routes/root/BasePage/Notification'
import { useCopyWithFeedback } from '../../hooks/useCopyWithFeedback'
import { AI_ASSISTANT_MARKDOWN_MODE } from '../../streaming/markdown/aiAssistantMarkdownMode'
import { normalizeStreamingMarkdown } from '../../streaming/markdown/normalizeStreamingMarkdown'
import { CopyIconButton } from '../common/CopyIconButton'
import { AiAssistantMarkdownViewer } from '../markdown/AiAssistantMarkdownViewer'

export type ChatAssistantMessageProps = {
  content: string
  isStreaming?: boolean
}

export const ChatAssistantMessage: FC<ChatAssistantMessageProps> = memo(({ content, isStreaming = false }) => {
  const showError = useShowErrorNotification()
  const { createCopyHandler, copied } = useCopyWithFeedback({
    onError: (error) =>
      showError({
        title: 'Copy failed',
        message: error instanceof Error ? error.message : 'Clipboard access was denied.',
      }),
  })

  const markdownForViewer = useMemo(
    () => (isStreaming ? normalizeStreamingMarkdown(content) : content),
    [content, isStreaming],
  )

  return (
    <AssistantColumn>
      <AiAssistantMarkdownViewer
        markdown={markdownForViewer}
        mode={isStreaming ? AI_ASSISTANT_MARKDOWN_MODE.streaming : AI_ASSISTANT_MARKDOWN_MODE.full}
      />
      {!isStreaming
        ? (
          <CopyAnswerRow>
            <CopyIconButton ariaLabel="Copy answer" copied={copied} onCopy={createCopyHandler(content)} />
          </CopyAnswerRow>
        )
        : null}
    </AssistantColumn>
  )
})

ChatAssistantMessage.displayName = 'ChatAssistantMessage'

const AssistantColumn = styled(Box)(({ theme }) => ({
  alignSelf: 'stretch',
  width: '100%',
  minWidth: 0,
  ...theme.typography.body2,
}))

const CopyAnswerRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-start',
  marginTop: theme.spacing(1),
}))
