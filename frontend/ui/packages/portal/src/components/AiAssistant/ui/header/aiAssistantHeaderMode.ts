export const AI_ASSISTANT_HEADER_MODE = {
  chat: 'chat',
  history: 'history',
} as const

export type AiAssistantHeaderMode = (typeof AI_ASSISTANT_HEADER_MODE)[keyof typeof AI_ASSISTANT_HEADER_MODE]

export const AI_ASSISTANT_HEADER_TITLE: Record<AiAssistantHeaderMode, string> = {
  [AI_ASSISTANT_HEADER_MODE.chat]: 'AI Assistant',
  [AI_ASSISTANT_HEADER_MODE.history]: 'History',
}
