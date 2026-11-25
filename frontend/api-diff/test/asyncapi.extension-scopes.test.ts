import { annotation, apiDiff, CompareOptions, DiffAction, DiffType, unclassified } from '../src'
import { diffsMatcher } from './helper/matchers'
import { parseAsyncApiAndAssertValid } from './helper/asyncapi'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { MaybeAsyncAPI } from '@asyncapi/parser/esm/types'

const COMPARE_OPTIONS: CompareOptions = { unify: true }
const EXTENSION_NAME = 'x-custom-extension'

const document = {
  asyncapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  components: {
    schemas: {
      plain: { type: 'object' },
      multiFormat: {
        schemaFormat: 'application/vnd.aai.asyncapi+json;version=3.0.0',
        schema: { type: 'object' },
      },
    },
    servers: {
      production: {
        host: 'localhost:9092',
        protocol: 'kafka',
        variables: { port: { default: '9092' } },
      },
    },
    channels: { channel: { address: 'events' } },
    operations: {
      operation: {
        action: 'send',
        channel: { $ref: '#/components/channels/channel' },
      },
    },
    messages: { message: { payload: { type: 'object' } } },
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        scopes: [],
        flows: {
          implicit: {
            authorizationUrl: 'https://example.com/authorize',
            availableScopes: {},
          },
        },
      },
    },
    serverVariables: { variable: { default: 'value' } },
    parameters: { parameter: { location: '$message.payload#/id' } },
    correlationIds: { correlation: { location: '$message.header#/id' } },
    replies: { reply: {} },
    replyAddresses: { address: { location: '$message.header#/replyTo' } },
    externalDocs: { documentation: { url: 'https://example.com/docs' } },
    tags: { tag: { name: 'tag' } },
    operationTraits: { trait: { title: 'Operation trait' } },
    messageTraits: { trait: { title: 'Message trait' } },
    serverBindings: { kafka: {} },
    channelBindings: { kafka: {} },
    operationBindings: { kafka: {} },
    messageBindings: { kafka: {} },
  },
}

const paths: [string, JsonPath, DiffType?, boolean?][] = [
  ['components', ['components']],
  ['plain schema', ['components', 'schemas', 'plain']],
  ['multi-format schema', ['components', 'schemas', 'multiFormat']],
  ['schema inside multi-format schema', ['components', 'schemas', 'multiFormat', 'schema']],
  ['server variable', ['components', 'servers', 'production', 'variables', 'port'], annotation],
  ['component server variable', ['components', 'serverVariables', 'variable'], annotation],
  ['security scheme', ['components', 'securitySchemes', 'oauth']],
  ['OAuth flows', ['components', 'securitySchemes', 'oauth', 'flows'], unclassified, true],
  ['OAuth flow', ['components', 'securitySchemes', 'oauth', 'flows', 'implicit']],
  ['component parameter', ['components', 'parameters', 'parameter']],
  ['component correlation id', ['components', 'correlationIds', 'correlation']],
  ['component reply', ['components', 'replies', 'reply']],
  ['component reply address', ['components', 'replyAddresses', 'address']],
  ['component external documentation', ['components', 'externalDocs', 'documentation'], annotation],
  ['operation trait', ['components', 'operationTraits', 'trait']],
  ['message trait', ['components', 'messageTraits', 'trait']],
  ['server protocol binding', ['components', 'serverBindings', 'kafka']],
  ['channel protocol binding', ['components', 'channelBindings', 'kafka']],
  ['operation protocol binding', ['components', 'operationBindings', 'kafka']],
  ['message protocol binding', ['components', 'messageBindings', 'kafka']],
]

const withExtension = (source: MaybeAsyncAPI, path: JsonPath, value: string): MaybeAsyncAPI => {
  const clone = structuredClone(source)
  let current = clone as Record<PropertyKey, unknown>
  for (const key of path) {
    current = current[key] as Record<PropertyKey, unknown>
  }
  current[EXTENSION_NAME] = { nested: value }
  return clone
}

describe('AsyncAPI specification extensions in component and schema scopes', () => {
  test.each(paths)('reports a nested extension change in %s', async (_name, path, expectedType = unclassified, parserRejectsExtension = false) => {
    const before = withExtension(document, path, 'before')
    const after = withExtension(document, path, 'after')
    // AsyncAPI Parser 3.6.0 rejects x-* on OAuth Flows Object although SpecificationExtensions allows it.
    if (!parserRejectsExtension) {
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)
    }

    const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)

    expect(diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        type: expectedType,
        beforeValue: 'before',
        afterValue: 'after',
        beforeDeclarationPaths: [[...path, EXTENSION_NAME, 'nested']],
        afterDeclarationPaths: [[...path, EXTENSION_NAME, 'nested']],
      }),
    ]))
  })
})
