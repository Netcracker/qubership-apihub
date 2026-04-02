import * as YAML from 'js-yaml'
import { API_KIND_SPECIFICATION_EXTENSION, type ApihubApiCompatibilityKind } from '../../src'

function applyApiKind(obj: Record<string, unknown>, apiKind: ApihubApiCompatibilityKind): void {
  obj[API_KIND_SPECIFICATION_EXTENSION] = apiKind
}

export function generateAsyncApiSpec(
  payloadType: string = 'number',
  channelApiKind?: ApihubApiCompatibilityKind,
  operationApiKind?: ApihubApiCompatibilityKind,
): string {
  const channel: Record<string, unknown> = {
    address: 'channel1',
    messages: { message1: { $ref: '#/components/messages/message1' } },
  }
  channelApiKind && applyApiKind(channel, channelApiKind)

  const operation: Record<string, unknown> = {
    action: 'send',
    channel: { $ref: '#/channels/channel1' },
    messages: [{ $ref: '#/channels/channel1/messages/message1' }],
  }
  operationApiKind && applyApiKind(operation, operationApiKind)

  return YAML.dump({
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: { channel1: channel },
    operations: { operation1: operation },
    components: {
      messages: {
        message1: {
          payload: {
            type: 'object',
            properties: { userId: { type: payloadType } },
          },
        },
      },
    },
  })
}

export function generateAsyncApiTwoOperationsSpec(
  channelApiKind?: ApihubApiCompatibilityKind,
  operationApiKind?: ApihubApiCompatibilityKind,
): string {
  const channel: Record<string, unknown> = {
    address: 'channel1',
    messages: {
      message1: { $ref: '#/components/messages/message1' },
      message2: { $ref: '#/components/messages/message2' },
    },
  }
  channelApiKind && applyApiKind(channel, channelApiKind)

  const operation2: Record<string, unknown> = {
    action: 'send',
    channel: { $ref: '#/channels/channel1' },
    messages: [{ $ref: '#/channels/channel1/messages/message2' }],
  }
  operationApiKind && applyApiKind(operation2, operationApiKind)

  return YAML.dump({
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: { channel1: channel },
    operations: {
      operation1: {
        action: 'send',
        channel: { $ref: '#/channels/channel1' },
        messages: [{ $ref: '#/channels/channel1/messages/message1' }],
      },
      operation2: operation2,
    },
    components: {
      messages: {
        message1: { payload: { type: 'object', properties: { userId: { type: 'number' } } } },
        message2: { payload: { type: 'object', properties: { orderId: { type: 'number' } } } },
      },
    },
  })
}

export function generateAsyncApiTwoMessagesSpec(
  channelApiKind?: ApihubApiCompatibilityKind,
  operationApiKind?: ApihubApiCompatibilityKind,
): string {
  const channel: Record<string, unknown> = {
    address: 'channel1',
    messages: {
      message1: { $ref: '#/components/messages/message1' },
      message2: { $ref: '#/components/messages/message2' },
    },
  }
  channelApiKind && applyApiKind(channel, channelApiKind)

  const operation: Record<string, unknown> = {
    action: 'send',
    channel: { $ref: '#/channels/channel1' },
    messages: [
      { $ref: '#/channels/channel1/messages/message1' },
      { $ref: '#/channels/channel1/messages/message2' },
    ],
  }
  operationApiKind && applyApiKind(operation, operationApiKind)

  return YAML.dump({
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: { channel1: channel },
    operations: { operation1: operation },
    components: {
      messages: {
        message1: { payload: { type: 'object', properties: { userId: { type: 'number' } } } },
        message2: { payload: { type: 'object', properties: { orderId: { type: 'number' } } } },
      },
    },
  })
}

export function generateAsyncApiTwoChannelsSpec(
  channelApiKind?: ApihubApiCompatibilityKind,
  operationApiKind?: ApihubApiCompatibilityKind,
): string {
  const channel2: Record<string, unknown> = {
    address: 'channel2',
    messages: { message2: { $ref: '#/components/messages/message2' } },
  }
  channelApiKind && applyApiKind(channel2, channelApiKind)

  const operation2: Record<string, unknown> = {
    action: 'send',
    channel: { $ref: '#/channels/channel2' },
    messages: [{ $ref: '#/channels/channel2/messages/message2' }],
  }
  operationApiKind && applyApiKind(operation2, operationApiKind)

  return YAML.dump({
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: {
      channel1: { address: 'channel1', messages: { message1: { $ref: '#/components/messages/message1' } } },
      channel2: channel2,
    },
    operations: {
      operation1: {
        action: 'send',
        channel: { $ref: '#/channels/channel1' },
        messages: [{ $ref: '#/channels/channel1/messages/message1' }],
      },
      operation2: operation2,
    },
    components: {
      messages: {
        message1: { payload: { type: 'object', properties: { userId: { type: 'number' } } } },
        message2: { payload: { type: 'object', properties: { orderId: { type: 'number' } } } },
      },
    },
  })
}
