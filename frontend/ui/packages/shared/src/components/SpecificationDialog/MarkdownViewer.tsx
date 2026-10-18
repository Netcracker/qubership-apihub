/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC } from 'react'
import { memo } from 'react'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import ReactMarkdown from 'react-markdown'
import 'github-markdown-css/github-markdown-light.css'
import { MermaidDiagram } from './MermaidDiagram'

export type MarkdownViewerProps = {
  value: string
}

const MarkdownComponents: Components = {
  code({ className, children, inline, node, ...props }) {
    const language = /language-(\w+)/.exec(className ?? '')?.[1]
    if (!inline && language === 'mermaid') {
      const rawText = (node as { value?: string } | undefined)?.value ?? String(children)
      return <MermaidDiagram value={rawText.replace(/\n$/, '')}/>
    }
    return <code className={className} {...props}>{children}</code>
  },
}

export const MarkdownViewer: FC<MarkdownViewerProps> = /* @__PURE__ */ memo<MarkdownViewerProps>(({ value }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
      rehypePlugins={[rehypeRaw]}
      components={MarkdownComponents}
      className="markdown-body"
    >
      {value}
    </ReactMarkdown>
  )
})
