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
} as const

export const AsyncApiTreeNodeKindsList: AsyncApiTreeNodeKind[] = Object.values(AsyncApiTreeNodeKinds)

export type AsyncApiTreeNodeKind = typeof AsyncApiTreeNodeKinds[keyof typeof AsyncApiTreeNodeKinds]
