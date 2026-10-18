import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { type FC, memo, type ReactNode } from 'react'

import { CopyIconButton } from '../common/CopyIconButton'
import { useCopyToClipboardWithFeedback } from '../common/useCopyToClipboardWithFeedback'

type CodeBlockProps = {
  className?: string
  rawText: string
  children?: ReactNode
  /** When false, renders only the fenced body (no language bar or copy). Used during SSE streaming. */
  showHeader?: boolean
}

const LANGUAGE_LABELS: Record<string, string> = {
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  http: 'HTTP',
}

export const CodeBlock: FC<CodeBlockProps> = memo(({ className, rawText, children, showHeader = true }) => (
  <CodeBlockRoot>
    {showHeader ? <CodeBlockHeaderBar className={className} rawText={rawText} /> : null}
    <CodeBlockBody>
      <CodeBlockContent className={className}>{children}</CodeBlockContent>
    </CodeBlockBody>
  </CodeBlockRoot>
))

CodeBlock.displayName = 'CodeBlock'

type CodeBlockHeaderBarProps = {
  className?: string
  rawText: string
}

const CodeBlockHeaderBar: FC<CodeBlockHeaderBarProps> = memo(({ className, rawText }) => {
  const { createCopyHandler, copied } = useCopyToClipboardWithFeedback()

  const languageLabel = languageLabelFromClassName(className)

  return (
    <CodeBlockHeader>
      <CodeBlockFenceLabel variant="subtitle4">
        {`</> ${languageLabel}`}
      </CodeBlockFenceLabel>
      <CopyIconButton ariaLabel="Copy code" copied={copied} onCopy={createCopyHandler(rawText)} />
    </CodeBlockHeader>
  )
})

CodeBlockHeaderBar.displayName = 'CodeBlockHeaderBar'

function languageLabelFromClassName(className: string | undefined): string {
  if (!className) {
    return 'code'
  }
  const match = /language-([\w-]+)/.exec(className)
  if (!match) {
    return 'code'
  }
  const id = match[1].toLowerCase()
  return LANGUAGE_LABELS[id] ?? id
}

const CodeBlockRoot = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  margin: theme.spacing(0.75, 0),
  backgroundColor: theme.palette.action.hover,
}))

const CodeBlockHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0.75, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const CodeBlockFenceLabel = styled(Typography)({
  fontFamily: 'monospace',
  userSelect: 'none',
  lineHeight: 1,
})

const CodeBlockBody = styled(Box)(({ theme }) => ({
  margin: 0,
  padding: theme.spacing(1.5),
  overflow: 'auto',
  maxHeight: 320,
  lineHeight: 1.6,
  '& pre, & .hljs, & code': {
    // github-markdown-css / highlight.js set their own backgrounds on pre/code; keep the shell bg only.
    backgroundColor: 'transparent',
    // github-markdown-css uses 85% on code; fenced blocks use body2 (inline code keeps default)
    fontSize: theme.typography.body2.fontSize,
  },
}))

const CodeBlockContent = styled('code')({
  fontFamily: 'monospace',
  display: 'block',
  whiteSpace: 'pre',
})
