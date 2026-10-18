import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import { type FC, memo, useMemo } from 'react'

import { normalizeStreamingMarkdown } from '../../streaming/markdown/normalizeStreamingMarkdown'
import { CopyIconButton } from '../common/CopyIconButton'
import { useCopyToClipboardWithFeedback } from '../common/useCopyToClipboardWithFeedback'
import { MARKDOWN_MODE } from '../markdown/markdownMode'
import { MarkdownViewer } from '../markdown/MarkdownViewer'

type ChatAssistantMessageProps = {
  content: string
  isStreaming?: boolean
}

export const ChatAssistantMessage: FC<ChatAssistantMessageProps> = memo(({ content, isStreaming = false }) => {
  const { createCopyHandler, copied } = useCopyToClipboardWithFeedback()

  const markdownForViewer = useMemo(
    () => (isStreaming ? normalizeStreamingMarkdown(content) : content),
    [content, isStreaming],
  )

  return (
    <AssistantColumn>
      <MarkdownViewer
        markdown={markdownForViewer}
        mode={isStreaming ? MARKDOWN_MODE.streaming : MARKDOWN_MODE.full}
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
