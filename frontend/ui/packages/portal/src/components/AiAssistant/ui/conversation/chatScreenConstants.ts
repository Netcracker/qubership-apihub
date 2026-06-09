/** Jump-to-latest FAB while a streaming turn is in flight. */
export const CHAT_MESSAGE_LIST_JUMP_PHASE = {
  idle: 'idle',
  active: 'active',
} as const

export type ChatMessageListJumpPhase = (typeof CHAT_MESSAGE_LIST_JUMP_PHASE)[keyof typeof CHAT_MESSAGE_LIST_JUMP_PHASE]
