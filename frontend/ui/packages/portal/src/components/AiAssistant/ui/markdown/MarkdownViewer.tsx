import 'github-markdown-css/github-markdown-light.css'
import 'highlight.js/styles/github.css'

import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import http from 'highlight.js/lib/languages/http'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import { type ComponentPropsWithoutRef, type FC, memo, type MouseEvent, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { CodeProps } from 'react-markdown/lib/ast-to-react'
import type { ReactMarkdownProps } from 'react-markdown/lib/complex-types'
import { Link } from 'react-router-dom'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { PluggableList } from 'unified'

import { usePanel } from '../../state/panelContext'
import { isEphemeralFileLink, isInternalPortalLink, resolveToUrl } from '../../utils/internalLinkMatcher'
import { plainChildrenText } from '../../utils/plainChildrenText'
import { MARKDOWN_MODE, type MarkdownRenderMode } from '../markdown/markdownMode'
import { CHAT_CARD_LINK_CLASS } from './chatCard'
import { CodeBlock } from './CodeBlock'
import { FileDownloadLink } from './FileDownloadLink'

const highlightLanguages = { json, yaml, http }

const remarkPlugins: PluggableList = [[remarkGfm, { singleTilde: false }]]

const rehypePluginsFull: PluggableList = [
  [
    rehypeHighlight,
    {
      detect: false,
      ignoreMissing: true,
      languages: highlightLanguages,
      aliases: { yml: 'yaml' },
    },
  ],
]

type MarkdownViewerProps = {
  markdown: string
  mode?: MarkdownRenderMode
  normalizeMarkdown?: (markdown: string) => string
}

export const MarkdownViewer: FC<MarkdownViewerProps> = memo(({
  markdown,
  mode = MARKDOWN_MODE.full,
  normalizeMarkdown,
}) => {
  const source = normalizeMarkdown ? normalizeMarkdown(markdown) : markdown
  const isStreaming = mode === MARKDOWN_MODE.streaming

  const components = useMemo(
    () => ({
      pre: MarkdownPre,
      code: markdownCodeRenderer(!isStreaming),
      a: MarkdownLink,
      p: MarkdownParagraph,
    }),
    [isStreaming],
  )

  const rehypePlugins = isStreaming ? undefined : rehypePluginsFull

  return (
    <AssistantMarkdownSurface>
      <ReactMarkdown
        className="markdown-body"
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </AssistantMarkdownSurface>
  )
})

MarkdownViewer.displayName = 'MarkdownViewer'

const MarkdownPre: FC<ComponentPropsWithoutRef<'pre'> & ReactMarkdownProps> = ({ children }) => <>{children}</>
MarkdownPre.displayName = 'MarkdownPre'

function markdownCodeRenderer(showHeader: boolean): FC<CodeProps> {
  const MarkdownCode: FC<CodeProps> = ({ inline, className, children, node, ...rest }) => {
    if (inline) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      )
    }
    const rawText = (node as { value?: string }).value ?? plainChildrenText(children)
    return (
      <CodeBlock className={className} rawText={rawText} showHeader={showHeader}>
        {children}
      </CodeBlock>
    )
  }
  MarkdownCode.displayName = showHeader ? 'MarkdownCode' : 'StreamingMarkdownCode'
  return MarkdownCode
}

/** `p` as block `div` so link/file rows (div) stay valid; spacing matches `.markdown-body p` (github-markdown-css). */
const MarkdownParagraph: FC<ComponentPropsWithoutRef<'p'> & ReactMarkdownProps> = ({ children }) => (
  <Box className="assistant-md-paragraph" component="div">
    {children}
  </Box>
)
MarkdownParagraph.displayName = 'MarkdownParagraph'

const MarkdownLink: FC<ComponentPropsWithoutRef<'a'> & ReactMarkdownProps> = memo(({
  href = '',
  children,
}) => {
  const { closePanel, resetActiveChat } = usePanel()
  const onInternalPortalLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      closePanel()
      resetActiveChat()
    },
    [closePanel, resetActiveChat],
  )
  const { origin } = window.location
  if (isEphemeralFileLink(href, origin)) {
    return <FileDownloadLink href={resolveToUrl(href, origin).href}>{children}</FileDownloadLink>
  }
  if (isInternalPortalLink(href, origin)) {
    const resolved = resolveToUrl(href, origin)
    const to = `${resolved.pathname}${resolved.search}${resolved.hash}`
    return (
      <Link to={to} onClick={onInternalPortalLinkClick}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
})

MarkdownLink.displayName = 'MarkdownLink'

const AssistantMarkdownSurface = styled(Box)(({ theme }) => ({
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  wordBreak: 'break-word',
  '& .markdown-body': {
    ...theme.typography.body2,
  },
  '& .markdown-body .assistant-md-paragraph': {
    display: 'block',
    width: '100%',
    marginTop: 0,
    marginBottom: theme.spacing(2),
  },
  '& .markdown-body .assistant-md-paragraph:last-child': {
    marginBottom: 0,
  },
  [`& .markdown-body a.${CHAT_CARD_LINK_CLASS}`]: {
    textDecoration: 'none',
    color: 'inherit',
    '&:hover, &:focus, &:active, &:visited': {
      textDecoration: 'none',
      color: 'inherit',
    },
  },
}))
