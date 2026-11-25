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
    tags: [{ name: 'root-tag' }],
  },
  servers: {
    production: {
      host: 'localhost:9092',
      protocol: 'kafka',
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
      tags: [{ name: 'channel-tag' }],
      bindings: { kafka: {} },
    },
  },
  operations: {
    operation1: {
      action: 'send',
      channel: { $ref: '#/channels/channel1' },
      messages: [{ $ref: '#/channels/channel1/messages/message1' }],
      tags: [{ name: 'operation-tag' }],
      bindings: { kafka: {} },
      reply: {
        address: { location: '$message.header#/replyTo' },
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
        headers: { type: 'object' },
        correlationId: { location: '$message.header#/correlationId' },
        examples: [{ name: 'example1', payload: { id: '1' } }],
        bindings: { kafka: {} },
      },
    },
  },
}

const asyncApiCases: ExtensionCase[] = [
  { name: 'document', path: [], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'info contact', path: ['info', 'contact'], type: ANNOTATION_CHANGE_TYPE },
  { name: 'channel', path: ['channels', 'channel1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel protocol binding', path: ['channels', 'channel1', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel parameter', path: ['channels', 'channel1', 'parameters', 'parameter1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel server', path: ['servers', 'production'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'channel tag', path: ['channels', 'channel1', 'tags', 0], type: ANNOTATION_CHANGE_TYPE, actions: [DiffAction.remove, DiffAction.add] },
  { name: 'message', path: ['components', 'messages', 'message1'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message protocol binding', path: ['components', 'messages', 'message1', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message payload schema', path: ['components', 'messages', 'message1', 'payload'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message headers schema', path: ['components', 'messages', 'message1', 'headers'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message correlation id', path: ['components', 'messages', 'message1', 'correlationId'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'message example', path: ['components', 'messages', 'message1', 'examples', 0], type: ANNOTATION_CHANGE_TYPE },
  { name: 'operation protocol binding', path: ['operations', 'operation1', 'bindings', 'kafka'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation reply', path: ['operations', 'operation1', 'reply'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation reply address', path: ['operations', 'operation1', 'reply', 'address'], type: UNCLASSIFIED_CHANGE_TYPE },
  { name: 'operation tag', path: ['operations', 'operation1', 'tags', 0], type: ANNOTATION_CHANGE_TYPE, actions: [DiffAction.remove, DiffAction.add] },
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

