export const AI_ASSISTANT_MARKDOWN_MODE = {
  full: 'full',
  streaming: 'streaming',
} as const

export type AiAssistantMarkdownRenderMode = (typeof AI_ASSISTANT_MARKDOWN_MODE)[keyof typeof AI_ASSISTANT_MARKDOWN_MODE]
