export const MARKDOWN_MODE = {
  full: 'full',
  streaming: 'streaming',
} as const

export type MarkdownRenderMode = (typeof MARKDOWN_MODE)[keyof typeof MARKDOWN_MODE]
