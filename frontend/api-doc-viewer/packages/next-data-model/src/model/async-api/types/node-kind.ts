import { SecurityTreeNodeKinds } from "../../security/types/node-kind"

export const AsyncApiTreeNodeKinds = {
  BINDING: 'binding',
  BINDINGS: 'bindings',
  EXTENSIONS: 'extensions',
  MESSAGE: 'message',
  MESSAGE_CHANNEL: 'channel',
  MESSAGE_CHANNEL_PARAMETERS: 'channelParameters',
  MESSAGE_CONTENT: 'messageContent',
  MESSAGE_HEADERS: 'messageHeaders',
  MESSAGE_OPERATION: 'operation',
  MESSAGE_PAYLOAD: 'messagePayload',
  MESSAGE_SECTION_SELECTOR: 'messageSectionSelector',
  SERVER: 'server',
  SERVERS: 'servers',
  // The Security sections' kinds (shared with OpenAPI): the operation's and each server's.
  ...SecurityTreeNodeKinds,
} as const

export const AsyncApiTreeNodeKindsList: AsyncApiTreeNodeKind[] = Object.values(AsyncApiTreeNodeKinds)

export const AsyncApiTreeNodeKindsSet: Set<AsyncApiTreeNodeKind> = new Set(AsyncApiTreeNodeKindsList)

export type AsyncApiTreeNodeKind = typeof AsyncApiTreeNodeKinds[keyof typeof AsyncApiTreeNodeKinds]
