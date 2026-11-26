import { annotation, apiDiff, type CompareOptions, DiffAction, type DiffType, unclassified } from '../src'
import type { CompareScope } from '../src/types'
import { diffsMatcher } from './helper/matchers'
import { parseAsyncApiAndAssertValid } from './helper/asyncapi'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { MaybeAsyncAPI } from '@asyncapi/parser/esm/types'

const COMPARE_OPTIONS: CompareOptions = { unify: true }
const EXTENSION_NAME = 'x-custom-extension'

const externalDocumentation = () => ({ url: 'https://example.com/docs' })
const tags = () => [{ name: 'tag', externalDocs: externalDocumentation() }]
const bindings = () => ({ kafka: {} })
const security = () => [{ type: 'userPassword' }]

const server = () => ({
  host: 'localhost:9092',
  protocol: 'kafka',
  variables: { port: { default: '9092' } },
  security: security(),
  tags: tags(),
  externalDocs: externalDocumentation(),
  bindings: bindings(),
})

const messageTrait = () => ({
  headers: { type: 'object', properties: { header: { type: 'string' } } },
  correlationId: { location: '$message.header#/id' },
  tags: tags(),
  externalDocs: externalDocumentation(),
  bindings: bindings(),
  examples: [{ name: 'example', payload: { id: '1' } }],
})

const message = () => ({
  ...messageTrait(),
  payload: { type: 'object', properties: { payload: { type: 'string' } } },
  traits: [messageTrait()],
})

const channel = (serverRef?: string) => ({
  address: 'events',
  messages: { message: message() },
  ...(serverRef ? { servers: [{ $ref: serverRef }] } : {}),
  parameters: { parameter: { location: '$message.payload#/id' } },
  tags: tags(),
  externalDocs: externalDocumentation(),
  bindings: bindings(),
})

const operationTrait = () => ({
  security: security(),
  tags: tags(),
  externalDocs: externalDocumentation(),
  bindings: bindings(),
})

const operationReply = () => ({
  address: { location: '$message.header#/replyTo' },
  channel: channel(),
  messages: [message()],
})

const operation = (channelRef: string) => ({
  ...operationTrait(),
  action: 'send',
  channel: { $ref: channelRef },
  traits: [operationTrait()],
  reply: operationReply(),
})

const schema = () => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    child: {
      type: 'array',
      items: { type: 'object' },
      additionalItems: { type: 'string' },
      contains: { type: 'object' },
    },
  },
  patternProperties: { '^property-': { type: 'object' } },
  additionalProperties: { type: 'object' },
  dependencies: { dependency: { type: 'object' } },
  propertyNames: { type: 'string' },
  if: { type: 'object' },
  then: { type: 'object' },
  else: { type: 'object' },
  allOf: [{ type: 'object' }],
  anyOf: [{ type: 'object' }],
  oneOf: [{ type: 'object' }],
  not: { type: 'object' },
  definitions: { definition: { type: 'object' } },
  externalDocs: externalDocumentation(),
})

const document = {
  asyncapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
    contact: { name: 'Support' },
    license: { name: 'Apache-2.0' },
    tags: tags(),
    externalDocs: externalDocumentation(),
  },
  servers: { production: server() },
  channels: { channel: channel('#/servers/production') },
  operations: { operation: operation('#/channels/channel') },
  components: {
    schemas: {
      plain: schema(),
      multiFormat: {
        schemaFormat: 'application/vnd.aai.asyncapi+json;version=3.0.0',
        schema: schema(),
      },
      jsonMultiFormat: {
        schemaFormat: 'application/schema+json;version=draft-07',
        schema: { type: 'object', properties: { child: { type: 'string' } } },
      },
    },
    servers: { production: server() },
    channels: { channel: channel('#/components/servers/production') },
    operations: { operation: operation('#/components/channels/channel') },
    messages: { message: message() },
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        scopes: [],
        flows: {
          implicit: {
            authorizationUrl: 'https://example.com/authorize',
            availableScopes: {},
          },
          password: {
            tokenUrl: 'https://example.com/token',
            availableScopes: {},
          },
          clientCredentials: {
            tokenUrl: 'https://example.com/token',
            availableScopes: {},
          },
          authorizationCode: {
            authorizationUrl: 'https://example.com/authorize',
            tokenUrl: 'https://example.com/token',
            availableScopes: {},
          },
        },
      },
    },
    serverVariables: { variable: { default: 'value' } },
    parameters: { parameter: { location: '$message.payload#/id' } },
    correlationIds: { correlation: { location: '$message.header#/id' } },
    replies: { reply: operationReply() },
    replyAddresses: { address: { location: '$message.header#/replyTo' } },
    externalDocs: { documentation: externalDocumentation() },
    tags: { tag: { name: 'tag', externalDocs: externalDocumentation() } },
    operationTraits: { trait: operationTrait() },
    messageTraits: { trait: messageTrait() },
    serverBindings: { binding: bindings() },
    channelBindings: { binding: bindings() },
    operationBindings: { binding: bindings() },
    messageBindings: { binding: bindings() },
  },
}

const openApiMultiFormatDocument = {
  asyncapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  components: {
    schemas: {
      schema: {
        schemaFormat: 'application/vnd.oai.openapi+json;version=3.0.0',
        schema: { type: 'object', properties: { child: { type: 'string' } } },
      },
    },
  },
}

type ExtensionCaseOptions = {
  skipParserValidation?: boolean
  useOpenApiMultiFormatDocument?: boolean
  wholeObjectAddRemove?: boolean
  skipScopes?: CompareScope[]
}

type ExtensionCase = [string, JsonPath, DiffType?, ExtensionCaseOptions?]

const skipOperationScopeOptions: ExtensionCaseOptions = { skipScopes: ['send'] }
const wholeTagOptions: ExtensionCaseOptions = { wholeObjectAddRemove: true }
const openApiMultiFormatOptions: ExtensionCaseOptions = {
  skipParserValidation: true,
  useOpenApiMultiFormatDocument: true,
}

const rootAndInfoPaths: ExtensionCase[] = [
  ['document', []],
  ['info', ['info'], annotation],
  ['info contact', ['info', 'contact'], annotation],
  ['info license', ['info', 'license'], annotation],
  ['info tag', ['info', 'tags', 0], annotation, wholeTagOptions],
  ['info tag external documentation', ['info', 'tags', 0, 'externalDocs'], annotation, wholeTagOptions],
  ['info external documentation', ['info', 'externalDocs'], annotation],
]

const serverPaths: ExtensionCase[] = [
  ['root server', ['servers', 'production'], annotation, skipOperationScopeOptions],
  ['root server variable', ['servers', 'production', 'variables', 'port'], annotation, skipOperationScopeOptions],
  ['root server security scheme', ['servers', 'production', 'security', 0], unclassified, skipOperationScopeOptions],
  ['root server tag', ['servers', 'production', 'tags', 0], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['root server tag external documentation', ['servers', 'production', 'tags', 0, 'externalDocs'], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['root server external documentation', ['servers', 'production', 'externalDocs'], annotation, skipOperationScopeOptions],
  ['root server bindings', ['servers', 'production', 'bindings'], unclassified, skipOperationScopeOptions],
  ['root server protocol binding', ['servers', 'production', 'bindings', 'kafka'], unclassified, skipOperationScopeOptions],
  ['component server', ['components', 'servers', 'production'], annotation, skipOperationScopeOptions],
  ['component server variable', ['components', 'servers', 'production', 'variables', 'port'], annotation, skipOperationScopeOptions],
  ['component server security scheme', ['components', 'servers', 'production', 'security', 0], unclassified, skipOperationScopeOptions],
  ['component server tag', ['components', 'servers', 'production', 'tags', 0], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['component server tag external documentation', ['components', 'servers', 'production', 'tags', 0, 'externalDocs'], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['component server external documentation', ['components', 'servers', 'production', 'externalDocs'], annotation, skipOperationScopeOptions],
  ['component server bindings', ['components', 'servers', 'production', 'bindings'], unclassified, skipOperationScopeOptions],
  ['component server protocol binding', ['components', 'servers', 'production', 'bindings', 'kafka'], unclassified, skipOperationScopeOptions],
  ['reusable server variable', ['components', 'serverVariables', 'variable'], annotation],
]

const channelPaths: ExtensionCase[] = [
  ['root channel', ['channels', 'channel'], unclassified, skipOperationScopeOptions],
  ['root channel message', ['channels', 'channel', 'messages', 'message'], unclassified, skipOperationScopeOptions],
  ['root channel parameter', ['channels', 'channel', 'parameters', 'parameter'], unclassified, skipOperationScopeOptions],
  ['root channel tag', ['channels', 'channel', 'tags', 0], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['root channel tag external documentation', ['channels', 'channel', 'tags', 0, 'externalDocs'], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['root channel external documentation', ['channels', 'channel', 'externalDocs'], annotation, skipOperationScopeOptions],
  ['root channel bindings', ['channels', 'channel', 'bindings'], unclassified, skipOperationScopeOptions],
  ['root channel protocol binding', ['channels', 'channel', 'bindings', 'kafka'], unclassified, skipOperationScopeOptions],
  ['component channel', ['components', 'channels', 'channel'], unclassified, skipOperationScopeOptions],
  ['component channel message', ['components', 'channels', 'channel', 'messages', 'message'], unclassified, skipOperationScopeOptions],
  ['component channel parameter', ['components', 'channels', 'channel', 'parameters', 'parameter'], unclassified, skipOperationScopeOptions],
  ['component channel tag', ['components', 'channels', 'channel', 'tags', 0], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['component channel tag external documentation', ['components', 'channels', 'channel', 'tags', 0, 'externalDocs'], annotation, { ...skipOperationScopeOptions, ...wholeTagOptions }],
  ['component channel external documentation', ['components', 'channels', 'channel', 'externalDocs'], annotation, skipOperationScopeOptions],
  ['component channel bindings', ['components', 'channels', 'channel', 'bindings'], unclassified, skipOperationScopeOptions],
  ['component channel protocol binding', ['components', 'channels', 'channel', 'bindings', 'kafka'], unclassified, skipOperationScopeOptions],
]

const operationPaths: ExtensionCase[] = [
  ['root operation', ['operations', 'operation']],
  ['root operation security scheme', ['operations', 'operation', 'security', 0]],
  ['root operation tag', ['operations', 'operation', 'tags', 0], annotation, wholeTagOptions],
  ['root operation tag external documentation', ['operations', 'operation', 'tags', 0, 'externalDocs'], annotation, wholeTagOptions],
  ['root operation external documentation', ['operations', 'operation', 'externalDocs'], annotation],
  ['root operation bindings', ['operations', 'operation', 'bindings']],
  ['root operation protocol binding', ['operations', 'operation', 'bindings', 'kafka']],
  ['root operation trait', ['operations', 'operation', 'traits', 0]],
  ['root operation trait security scheme', ['operations', 'operation', 'traits', 0, 'security', 0]],
  ['root operation trait tag', ['operations', 'operation', 'traits', 0, 'tags', 0]],
  ['root operation trait tag external documentation', ['operations', 'operation', 'traits', 0, 'tags', 0, 'externalDocs']],
  ['root operation trait external documentation', ['operations', 'operation', 'traits', 0, 'externalDocs']],
  ['root operation trait bindings', ['operations', 'operation', 'traits', 0, 'bindings']],
  ['root operation trait protocol binding', ['operations', 'operation', 'traits', 0, 'bindings', 'kafka']],
  ['root operation reply', ['operations', 'operation', 'reply']],
  ['root operation reply address', ['operations', 'operation', 'reply', 'address']],
  ['root operation reply channel', ['operations', 'operation', 'reply', 'channel']],
  ['root operation reply message', ['operations', 'operation', 'reply', 'messages', 0]],
  ['component operation', ['components', 'operations', 'operation']],
  ['component operation security scheme', ['components', 'operations', 'operation', 'security', 0]],
  ['component operation tag', ['components', 'operations', 'operation', 'tags', 0], annotation, wholeTagOptions],
  ['component operation tag external documentation', ['components', 'operations', 'operation', 'tags', 0, 'externalDocs'], annotation, wholeTagOptions],
  ['component operation external documentation', ['components', 'operations', 'operation', 'externalDocs'], annotation],
  ['component operation bindings', ['components', 'operations', 'operation', 'bindings']],
  ['component operation protocol binding', ['components', 'operations', 'operation', 'bindings', 'kafka']],
  ['component operation trait', ['components', 'operations', 'operation', 'traits', 0]],
  ['component operation reply', ['components', 'operations', 'operation', 'reply']],
  ['component operation reply address', ['components', 'operations', 'operation', 'reply', 'address']],
  ['component operation reply channel', ['components', 'operations', 'operation', 'reply', 'channel']],
  ['component operation reply message', ['components', 'operations', 'operation', 'reply', 'messages', 0]],
  ['reusable reply channel', ['components', 'replies', 'reply', 'channel']],
  ['reusable reply message', ['components', 'replies', 'reply', 'messages', 0]],
]

const messagePaths: ExtensionCase[] = [
  ['component message', ['components', 'messages', 'message']],
  ['component message payload schema', ['components', 'messages', 'message', 'payload']],
  ['component message payload property schema', ['components', 'messages', 'message', 'payload', 'properties', 'payload']],
  ['component message headers schema', ['components', 'messages', 'message', 'headers']],
  ['component message headers property schema', ['components', 'messages', 'message', 'headers', 'properties', 'header']],
  ['component message correlation id', ['components', 'messages', 'message', 'correlationId']],
  ['component message tag', ['components', 'messages', 'message', 'tags', 0], annotation, wholeTagOptions],
  ['component message tag external documentation', ['components', 'messages', 'message', 'tags', 0, 'externalDocs'], annotation, wholeTagOptions],
  ['component message external documentation', ['components', 'messages', 'message', 'externalDocs'], annotation],
  ['component message bindings', ['components', 'messages', 'message', 'bindings']],
  ['component message protocol binding', ['components', 'messages', 'message', 'bindings', 'kafka']],
  ['component message example', ['components', 'messages', 'message', 'examples', 0], annotation, { skipParserValidation: true }],
  ['inline message trait', ['components', 'messages', 'message', 'traits', 0]],
  ['inline message trait headers schema', ['components', 'messages', 'message', 'traits', 0, 'headers']],
  ['inline message trait correlation id', ['components', 'messages', 'message', 'traits', 0, 'correlationId']],
  ['inline message trait tag', ['components', 'messages', 'message', 'traits', 0, 'tags', 0]],
  ['inline message trait external documentation', ['components', 'messages', 'message', 'traits', 0, 'externalDocs']],
  ['inline message trait bindings', ['components', 'messages', 'message', 'traits', 0, 'bindings']],
  ['inline message trait protocol binding', ['components', 'messages', 'message', 'traits', 0, 'bindings', 'kafka']],
  ['inline message trait example', ['components', 'messages', 'message', 'traits', 0, 'examples', 0], unclassified, { skipParserValidation: true }],
  ['reusable message trait headers schema', ['components', 'messageTraits', 'trait', 'headers']],
  ['reusable message trait correlation id', ['components', 'messageTraits', 'trait', 'correlationId']],
  ['reusable message trait tag', ['components', 'messageTraits', 'trait', 'tags', 0]],
  ['reusable message trait tag external documentation', ['components', 'messageTraits', 'trait', 'tags', 0, 'externalDocs']],
  ['reusable message trait external documentation', ['components', 'messageTraits', 'trait', 'externalDocs']],
  ['reusable message trait bindings', ['components', 'messageTraits', 'trait', 'bindings']],
  ['reusable message trait protocol binding', ['components', 'messageTraits', 'trait', 'bindings', 'kafka']],
  ['reusable message trait example', ['components', 'messageTraits', 'trait', 'examples', 0], unclassified, { skipParserValidation: true }],
]

const componentPaths: ExtensionCase[] = [
  ['components', ['components']],
  ['component tag', ['components', 'tags', 'tag'], annotation],
  ['component tag external documentation', ['components', 'tags', 'tag', 'externalDocs'], annotation],
  ['component external documentation', ['components', 'externalDocs', 'documentation'], annotation],
  ['security scheme', ['components', 'securitySchemes', 'oauth']],
  ['OAuth flows', ['components', 'securitySchemes', 'oauth', 'flows'], unclassified, { skipParserValidation: true }],
  ['OAuth implicit flow', ['components', 'securitySchemes', 'oauth', 'flows', 'implicit']],
  ['OAuth password flow', ['components', 'securitySchemes', 'oauth', 'flows', 'password']],
  ['OAuth client credentials flow', ['components', 'securitySchemes', 'oauth', 'flows', 'clientCredentials']],
  ['OAuth authorization code flow', ['components', 'securitySchemes', 'oauth', 'flows', 'authorizationCode']],
  ['component parameter', ['components', 'parameters', 'parameter']],
  ['component correlation id', ['components', 'correlationIds', 'correlation']],
  ['component reply', ['components', 'replies', 'reply']],
  ['component reply address', ['components', 'replyAddresses', 'address']],
  ['operation trait', ['components', 'operationTraits', 'trait']],
  ['operation trait security scheme', ['components', 'operationTraits', 'trait', 'security', 0]],
  ['operation trait tag', ['components', 'operationTraits', 'trait', 'tags', 0]],
  ['operation trait tag external documentation', ['components', 'operationTraits', 'trait', 'tags', 0, 'externalDocs']],
  ['operation trait external documentation', ['components', 'operationTraits', 'trait', 'externalDocs']],
  ['operation trait bindings', ['components', 'operationTraits', 'trait', 'bindings']],
  ['operation trait protocol binding', ['components', 'operationTraits', 'trait', 'bindings', 'kafka']],
  ['message trait', ['components', 'messageTraits', 'trait']],
  ['server bindings', ['components', 'serverBindings', 'binding']],
  ['server protocol binding', ['components', 'serverBindings', 'binding', 'kafka']],
  ['channel bindings', ['components', 'channelBindings', 'binding']],
  ['channel protocol binding', ['components', 'channelBindings', 'binding', 'kafka']],
  ['operation bindings', ['components', 'operationBindings', 'binding']],
  ['operation protocol binding', ['components', 'operationBindings', 'binding', 'kafka']],
  ['message bindings', ['components', 'messageBindings', 'binding']],
  ['message protocol binding', ['components', 'messageBindings', 'binding', 'kafka']],
]

const schemaPaths: ExtensionCase[] = [
  ['plain schema', ['components', 'schemas', 'plain']],
  ['multi-format schema', ['components', 'schemas', 'multiFormat']],
  ['schema inside multi-format schema', ['components', 'schemas', 'multiFormat', 'schema']],
  ['JSON schema inside multi-format schema', ['components', 'schemas', 'jsonMultiFormat', 'schema']],
  ['JSON schema property inside multi-format schema', ['components', 'schemas', 'jsonMultiFormat', 'schema', 'properties', 'child']],
  ['OpenAPI schema inside multi-format schema', ['components', 'schemas', 'schema', 'schema'], unclassified, openApiMultiFormatOptions],
  ['OpenAPI schema property inside multi-format schema', ['components', 'schemas', 'schema', 'schema', 'properties', 'child'], unclassified, openApiMultiFormatOptions],
  ['schema property', ['components', 'schemas', 'plain', 'properties', 'child']],
  ['schema items', ['components', 'schemas', 'plain', 'properties', 'child', 'items']],
  ['schema additional items', ['components', 'schemas', 'plain', 'properties', 'child', 'additionalItems']],
  ['schema contains', ['components', 'schemas', 'plain', 'properties', 'child', 'contains']],
  ['schema pattern property', ['components', 'schemas', 'plain', 'patternProperties', '^property-']],
  ['schema additional properties', ['components', 'schemas', 'plain', 'additionalProperties']],
  ['schema dependency', ['components', 'schemas', 'plain', 'dependencies', 'dependency']],
  ['schema property names', ['components', 'schemas', 'plain', 'propertyNames']],
  ['schema if', ['components', 'schemas', 'plain', 'if']],
  ['schema then', ['components', 'schemas', 'plain', 'then']],
  ['schema else', ['components', 'schemas', 'plain', 'else']],
  ['schema allOf variant', ['components', 'schemas', 'plain', 'allOf', 0]],
  ['schema anyOf variant', ['components', 'schemas', 'plain', 'anyOf', 0]],
  ['schema oneOf variant', ['components', 'schemas', 'plain', 'oneOf', 0]],
  ['schema not', ['components', 'schemas', 'plain', 'not']],
  ['schema definition', ['components', 'schemas', 'plain', 'definitions', 'definition']],
  ['schema external documentation', ['components', 'schemas', 'plain', 'externalDocs'], annotation],
  ['multi-format schema property', ['components', 'schemas', 'multiFormat', 'schema', 'properties', 'child']],
]

const paths: ExtensionCase[] = [
  ...rootAndInfoPaths,
  ...serverPaths,
  ...channelPaths,
  ...operationPaths,
  ...messagePaths,
  ...componentPaths,
  ...schemaPaths,
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

const valueAtPath = (source: MaybeAsyncAPI, path: JsonPath): unknown => {
  let current = source as unknown
  for (const key of path) {
    current = (current as Record<PropertyKey, unknown>)[key]
  }
  return current
}

describe('AsyncAPI specification extension scopes', () => {
  test.each(paths)('reports a nested extension change in %s', async (_name, path, expectedType = unclassified, options = {}) => {
    const source = options.useOpenApiMultiFormatDocument ? openApiMultiFormatDocument : document
    const before = withExtension(source, path, 'before')
    const after = withExtension(source, path, 'after')
    // Parser 3.6.0 rejects some specification-approved extension objects and OpenAPI multi-format media types.
    if (!options.skipParserValidation) {
      await parseAsyncApiAndAssertValid(before)
      await parseAsyncApiAndAssertValid(after)
    }

    const { diffs } = apiDiff(before, after, COMPARE_OPTIONS)
    const skippedScopes = new Set(options.skipScopes ?? [])
    const relevantDiffs = diffs.filter(diff => !skippedScopes.has(diff.scope))

    if (options.wholeObjectAddRemove) {
      const tagPath = path[path.length - 1] === 'externalDocs' ? path.slice(0, -1) : path
      expect(relevantDiffs).toHaveLength(2) // deep-equality tag mapping reports the changed tag as removed and added
      expect(relevantDiffs).toEqual(diffsMatcher([
        expect.objectContaining({
          action: DiffAction.remove,
          type: expectedType,
          beforeValue: valueAtPath(before, tagPath),
          beforeDeclarationPaths: [tagPath],
        }),
        expect.objectContaining({
          action: DiffAction.add,
          type: expectedType,
          afterValue: valueAtPath(after, tagPath),
          afterDeclarationPaths: [tagPath],
        }),
      ]))
      return
    }

    expect(relevantDiffs).toHaveLength(1) // the nested extension replacement
    expect(relevantDiffs).toEqual(diffsMatcher([
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
