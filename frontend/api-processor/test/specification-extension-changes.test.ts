import {
  buildChangelogFromContent,
  expectChangeCounts,
  operationChangesOf,
} from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  ASYNCAPI_API_TYPE,
  ChangeSummary,
  OperationsApiType,
  REST_API_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../src'
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'

type ExtensionPath = (string | number)[]

jest.mock('../src/apitypes/async/async.validation', () => ({ validateAsyncApiDocument: async () => undefined }))

const ADDED_EXTENSION_NAME = 'x-added-extension'
const REMOVED_EXTENSION_NAME = 'x-removed-extension'
const UNCHANGED_EXTENSION_NAME = 'x-unchanged-extension'
const REPLACED_EXTENSION_NAME = 'x-replaced-extension'
const ADDED_VALUE = { nested: 'added' }
const REMOVED_VALUE = ['removed']
const UNCHANGED_VALUE = { nested: 'unchanged' }
const BEFORE_VALUE = 'before'
const AFTER_VALUE = { nested: ['after'] }

type ExtensionCase = {
  name: string
  path: ExtensionPath
  type: keyof ChangeSummary
  actions?: Diff['action'][]
}

const setExtensions = (document: unknown, path: ExtensionPath, side: 'before' | 'after'): void => {
  let current = document as Record<string, unknown>
  for (const key of path) {
    current = current[key] as Record<string, unknown>
  }
  if (side === 'before') {
    current[REMOVED_EXTENSION_NAME] = REMOVED_VALUE
    current[REPLACED_EXTENSION_NAME] = BEFORE_VALUE
  } else {
    current[ADDED_EXTENSION_NAME] = ADDED_VALUE
    current[REPLACED_EXTENSION_NAME] = AFTER_VALUE
  }
  current[UNCHANGED_EXTENSION_NAME] = UNCHANGED_VALUE
}

const buildExtensionChangelog = (
  packageId: string,
  document: Record<string, unknown>,
  extensionPath: ExtensionPath,
): ReturnType<typeof buildChangelogFromContent> => {
  const before = structuredClone(document)
  const after = structuredClone(document)
  setExtensions(before, extensionPath, 'before')
  setExtensions(after, extensionPath, 'after')
  return buildChangelogFromContent(packageId, {
    before: JSON.stringify(before),
    after: JSON.stringify(after),
  })
}

const expectExtensionChange = (
  result: Awaited<ReturnType<typeof buildChangelogFromContent>>,
  apiType: OperationsApiType,
  operationId: string,
  type: keyof ChangeSummary,
  actions: Diff['action'][] = [DiffAction.add, DiffAction.remove, DiffAction.replace],
): void => {
  expect(operationChangesOf(result, operationId).diffs).toHaveLength(actions.length)
  expect(operationChangesOf(result, operationId).diffs).toEqual(expect.arrayContaining(
    actions.map(action => expect.objectContaining({
      action,
      type,
      ...(action === DiffAction.replace ? { beforeValue: BEFORE_VALUE, afterValue: AFTER_VALUE } : {}),
    })),
  ))
  expectChangeCounts(result, { changes: { [type]: actions.length }, impacted: { [type]: 1 } }, apiType)
}

const asyncApiDocument = {
  asyncapi: '3.0.0',
  info: {
    title: 'Test AsyncAPI',
    version: '1.0.0',
    contact: { name: 'Support' },
    license: { name: 'Apache-2.0' },
    tags: [{ name: 'root-tag', externalDocs: { url: 'https://example.com/root-tag' } }],
    externalDocs: { url: 'https://example.com/info' },
  },
  servers: {
    production: {
      host: 'localhost:9092',
      protocol: 'kafka',
      variables: { port: { default: '9092' } },
      security: [{ type: 'userPassword' }],
      tags: [{ name: 'server-tag', externalDocs: { url: 'https://example.com/server-tag' } }],
      externalDocs: { url: 'https://example.com/server' },
      bindings: { kafka: {} },
    },
  },
  channels: {
    channel1: {
      address: 'events',
      messages: {
        message1: { $ref: '#/components/messages/message1' },
      },
      parameters: {
        parameter1: { location: '$message.payload#/id' },
      },
      servers: [{ $ref: '#/servers/production' }],
      tags: [{ name: 'channel-tag', externalDocs: { url: 'https://example.com/channel-tag' } }],
      externalDocs: { url: 'https://example.com/channel' },
      bindings: { kafka: {} },
    },
  },
  operations: {
    operation1: {
      action: 'send',
      channel: { $ref: '#/channels/channel1' },
      messages: [{ $ref: '#/channels/channel1/messages/message1' }],
      security: [{ type: 'userPassword' }],
      tags: [{ name: 'operation-tag', externalDocs: { url: 'https://example.com/operation-tag' } }],
      externalDocs: { url: 'https://example.com/operation' },
      bindings: { kafka: {} },
      traits: [{
        security: [{ type: 'userPassword' }],
        tags: [{ name: 'operation-trait-tag', externalDocs: { url: 'https://example.com/operation-trait-tag' } }],
        externalDocs: { url: 'https://example.com/operation-trait' },
        bindings: { kafka: {} },
      }],
      reply: {
        address: { location: '$message.header#/replyTo' },
        channel: {
          address: 'replies',
          messages: { replyMessage: { payload: { type: 'object' } } },
        },
        messages: [{ payload: { type: 'object' } }],
      },
    },
  },
  components: {
    messages: {
      message1: {
        name: 'message1',
        payload: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
        headers: { type: 'object', properties: { header: { type: 'string' } } },
        correlationId: { location: '$message.header#/correlationId' },
        tags: [{ name: 'message-tag', externalDocs: { url: 'https://example.com/message-tag' } }],
        externalDocs: { url: 'https://example.com/message' },
        examples: [{ name: 'example1', payload: { id: '1' } }],
        bindings: { kafka: {} },
        traits: [{
          headers: { type: 'object' },
          correlationId: { location: '$message.header#/traitCorrelationId' },
          tags: [{ name: 'message-trait-tag', externalDocs: { url: 'https://example.com/message-trait-tag' } }],
          externalDocs: { url: 'https://example.com/message-trait' },
          examples: [{ name: 'trait-example' }],
          bindings: { kafka: {} },
        }],
      },
    },
  },
}

const TAG_ACTIONS: Diff['action'][] = [DiffAction.remove, DiffAction.add]

const asyncApiCases: ExtensionCase[] = [
  { name: 'document', path: [], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'info', path: ['info'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'info contact', path: ['info', 'contact'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'info license', path: ['info', 'license'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'info tag', path: ['info', 'tags', 0], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'info tag external documentation', path: ['info', 'tags', 0, 'externalDocs'], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'info external documentation', path: ['info', 'externalDocs'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'channel', path: ['channels', 'channel1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel bindings', path: ['channels', 'channel1', 'bindings'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel protocol binding', path: ['channels', 'channel1', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel parameter', path: ['channels', 'channel1', 'parameters', 'parameter1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server', path: ['servers', 'production'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server variable', path: ['servers', 'production', 'variables', 'port'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server security scheme', path: ['servers', 'production', 'security', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server tag', path: ['servers', 'production', 'tags', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server tag external documentation', path: ['servers', 'production', 'tags', 0, 'externalDocs'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server external documentation', path: ['servers', 'production', 'externalDocs'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server bindings', path: ['servers', 'production', 'bindings'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server protocol binding', path: ['servers', 'production', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel tag', path: ['channels', 'channel1', 'tags', 0], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'channel tag external documentation', path: ['channels', 'channel1', 'tags', 0, 'externalDocs'], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'channel external documentation', path: ['channels', 'channel1', 'externalDocs'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'operation', path: ['operations', 'operation1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation security scheme', path: ['operations', 'operation1', 'security', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation protocol binding', path: ['operations', 'operation1', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation bindings', path: ['operations', 'operation1', 'bindings'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation external documentation', path: ['operations', 'operation1', 'externalDocs'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'operation reply', path: ['operations', 'operation1', 'reply'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation reply address', path: ['operations', 'operation1', 'reply', 'address'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation reply channel', path: ['operations', 'operation1', 'reply', 'channel'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation reply message', path: ['operations', 'operation1', 'reply', 'messages', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation tag', path: ['operations', 'operation1', 'tags', 0], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'operation tag external documentation', path: ['operations', 'operation1', 'tags', 0, 'externalDocs'], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'operation trait', path: ['operations', 'operation1', 'traits', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation trait security scheme', path: ['operations', 'operation1', 'traits', 0, 'security', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation trait tag', path: ['operations', 'operation1', 'traits', 0, 'tags', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation trait external documentation', path: ['operations', 'operation1', 'traits', 0, 'externalDocs'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation trait bindings', path: ['operations', 'operation1', 'traits', 0, 'bindings'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation trait protocol binding', path: ['operations', 'operation1', 'traits', 0, 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message', path: ['components', 'messages', 'message1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message bindings', path: ['components', 'messages', 'message1', 'bindings'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message protocol binding', path: ['components', 'messages', 'message1', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message payload schema', path: ['components', 'messages', 'message1', 'payload'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message payload property schema', path: ['components', 'messages', 'message1', 'payload', 'properties', 'id'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message headers schema', path: ['components', 'messages', 'message1', 'headers'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message headers property schema', path: ['components', 'messages', 'message1', 'headers', 'properties', 'header'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message correlation id', path: ['components', 'messages', 'message1', 'correlationId'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message tag', path: ['components', 'messages', 'message1', 'tags', 0], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'message tag external documentation', path: ['components', 'messages', 'message1', 'tags', 0, 'externalDocs'], type: ANNOTATION_CHANGE_TYPE, actions: TAG_ACTIONS },
  { name: 'message external documentation', path: ['components', 'messages', 'message1', 'externalDocs'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'message example', path: ['components', 'messages', 'message1', 'examples', 0], type: ANNOTATION_CHANGE_TYPE },
  { name: 'message trait', path: ['components', 'messages', 'message1', 'traits', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait headers schema', path: ['components', 'messages', 'message1', 'traits', 0, 'headers'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait correlation id', path: ['components', 'messages', 'message1', 'traits', 0, 'correlationId'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait tag', path: ['components', 'messages', 'message1', 'traits', 0, 'tags', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait external documentation', path: ['components', 'messages', 'message1', 'traits', 0, 'externalDocs'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait example', path: ['components', 'messages', 'message1', 'traits', 0, 'examples', 0], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait bindings', path: ['components', 'messages', 'message1', 'traits', 0, 'bindings'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message trait protocol binding', path: ['components', 'messages', 'message1', 'traits', 0, 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
]

describe('Specification extension changelog', () => {
  describe('AsyncAPI', () => {
    test.each(asyncApiCases)('reports a nested extension change in $name', async ({ path, type, actions }) => {
      const result = await buildExtensionChangelog(`specification-extensions/asyncapi/${path.join('-') || 'root'}`, asyncApiDocument, path)
      expectExtensionChange(result, ASYNCAPI_API_TYPE, 'operation1-message1', type, actions)
    })
  })

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Test OpenAPI',
    version: '1.0.0',
    contact: { name: 'Support' },
  },
  externalDocs: { url: 'https://example.com/docs' },
  paths: {
    '/test': {
      get: {
        operationId: 'getTest',
        parameters: [{
          name: 'filter',
          in: 'query',
          content: { 'application/json': { schema: { type: 'object' } } },
        }],
        callbacks: {
          callback1: {
            '{$request.body#/callbackUrl}': {
              post: { responses: { '200': { description: 'OK' } } },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            links: { next: { operationId: 'getTest' } },
          },
        },
      },
    },
  },
}

const openApiCases: ExtensionCase[] = [
  { name: 'document', path: [], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'info contact', path: ['info', 'contact'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'root external documentation', path: ['externalDocs'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'callback path item', path: ['paths', '/test', 'get', 'callbacks', 'callback1', '{$request.body#/callbackUrl}'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'response link', path: ['paths', '/test', 'get', 'responses', '200', 'links', 'next'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'parameter media type', path: ['paths', '/test', 'get', 'parameters', 0, 'content', 'application/json'], type: UNCLASSIFIED_CHANGE_TYPE },
]

  describe('OpenAPI', () => {
    test.each(openApiCases)('reports a nested extension change in $name', async ({ path, type }) => {
      const result = await buildExtensionChangelog(`specification-extensions/openapi/${path.join('-') || 'root'}`, openApiDocument, path)
      expectExtensionChange(result, REST_API_TYPE, 'test-get', type)
    })
  })
})

