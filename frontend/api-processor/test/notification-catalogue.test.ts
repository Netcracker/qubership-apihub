/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, test } from '@jest/globals'
import { ANY_ASYNCAPI_SPEC, ANY_REST_SPEC, expectNotEmpty, LocalRegistry } from './helpers'
import { BUILD_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY, VERSION_STATUS } from '../src/consts'
import { BuildConfig, BuildResult, MessageCategory, MessageSeverity, NotificationMessage } from '../src/types'

/**
 * One row per diagnostic a build can raise, with what raises it and what the publisher gets: the severity,
 * whether a document is named, and whether a release still publishes. A row is the reference for its
 * category, so a suite that reaches the same category from its own fixture need not restate any of it.
 *
 * The categories no row can reach are listed, with their reason, above `publish`.
 */

type Stream = 'build' | 'comparison'

interface CaseFields {
  /** what the publisher did, as the test titles read it */
  name: string
  category: MessageCategory
  severity: MessageSeverity
  /** the message names the document it belongs to */
  attributed: boolean
  /** a release carrying it does not publish */
  blocksRelease: boolean
  stream?: Stream
  config: Partial<BuildConfig>
  /** published as v1 first, for a diagnostic that only appears when there is something to compare against */
  baseline?: { content: Record<string, string>; config: Partial<BuildConfig> }
}

/**
 * Where a row's files come from: a fixture folder read from disk, or files published from memory. A row has
 * exactly one of the two.
 */
type Case = CaseFields & (
  | {
    /** the fixture folder the files are read from */
    project: string
    content?: undefined
  }
  | {
    project?: undefined
    /** published from memory, keyed by file id */
    content: Record<string, string>
  }
)

const MCP = { metadata: { mcpEndpoint: '/mcp' } }
const file = (fileId: string): { fileId: string } => ({ fileId })

const BROKEN_SWAGGER = `swagger: '2.0'
info:
  title: Broken Swagger
  version: 1.0.0
paths:
  /pets:
    get:
      responses:
        '200':
          description: ok
          schema:
            $ref: '#/definitions/Missing'
`

const REF_IN_OPERATION_POSITION = `openapi: 3.0.1
info:
  title: t
  version: 1.0.0
paths:
  /a:
    get:
      $ref: '#/components/schemas/Thing'
components:
  schemas:
    Thing:
      type: object
`

// an operation whose message is written inline: without a `$ref` the unifier stamps no reference key, so the
// message has no id and the operation cannot be built
const ASYNC_INLINE_MESSAGE = `asyncapi: 3.0.0
info: { title: t, version: 1.0.0 }
channels:
  c1:
    address: c1
    messages:
      M1: { payload: {} }
operations:
  'user/created':
    action: receive
    channel: { $ref: '#/channels/c1' }
    messages:
      - payload: {}
`

// a deprecated channel: the tolerant hash is stamped on schema and parameter nodes, never on a channel
const ASYNC_DEPRECATED_CHANNEL = `asyncapi: 3.0.0
info: { title: t, version: 1.0.0 }
channels:
  userSignedUp:
    address: user/signedup
    x-deprecated: true
    messages:
      UserSignedUp:
        payload: { type: object, properties: { id: { type: string } } }
operations:
  onUserSignedUp:
    action: receive
    channel: { $ref: '#/channels/userSignedUp' }
    messages:
      - $ref: '#/channels/userSignedUp/messages/UserSignedUp'
`

const CASES: Case[] = [
  {
    name: 'a file whose parser threw',
    category: MESSAGE_CATEGORY.ParseFile,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'reference-bundling/unparsable-reference',
    config: { files: [file('broken.yaml')] },
  },
  {
    name: 'a document the parser read but did not approve',
    category: MESSAGE_CATEGORY.InvalidTextFile,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    project: 'reference-bundling/shared-broken-reference',
    config: { files: [file('shared.yaml')] },
  },
  {
    name: 'a configured file the resolver cannot produce',
    category: MESSAGE_CATEGORY.FileNotParsed,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    content: { 'rest.json': ANY_REST_SPEC },
    config: { files: [file('rest.json'), file('no-such-file.yaml')] },
  },
  {
    name: 'a Swagger 2.0 document that fails conversion',
    category: MESSAGE_CATEGORY.SwaggerConversion,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    // a Swagger 2.0 document whose conversion fails: the `$ref` target does not exist
    content: { 'swagger.yaml': BROKEN_SWAGGER },
    config: { files: [file('swagger.yaml')] },
  },
  {
    name: 'a $ref with sibling keys',
    category: MESSAGE_CATEGORY.RefHasSiblings,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    project: 'reference-bundling/description-override',
    config: { files: [file('openapi.yaml')], validationRulesSeverity: { brokenRefs: 'error' } },
  },
  {
    name: 'a $ref in a position the schema does not allow',
    category: MESSAGE_CATEGORY.RefNotAllowed,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    content: { 'spec.yaml': REF_IN_OPERATION_POSITION },
    config: { files: [file('spec.yaml')], validationRulesSeverity: { brokenRefs: 'error' } },
  },
  {
    name: 'a GraphQL introspection the builder cannot read',
    category: MESSAGE_CATEGORY.BuildDocument,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    content: { 'schema.json': '{"__schema": {"types": "not-an-array"}}' },
    config: { files: [file('schema.json')] },
  },
  {
    name: 'a $ref to a file that does not exist',
    category: MESSAGE_CATEGORY.RefNotFound,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'reference-bundling/case2',
    config: { files: [file('openapi.yaml')], validationRulesSeverity: { brokenRefs: 'error' } },
  },
  {
    name: 'a $ref to a file that is not text',
    category: MESSAGE_CATEGORY.RefNotValidFormat,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'reference-bundling/case6',
    config: { files: [file('openapi.yaml')], validationRulesSeverity: { brokenRefs: 'error' } },
  },
  {
    name: 'two REST operations of one document sharing an operationId',
    category: MESSAGE_CATEGORY.RestDuplicateOperation,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'operation-id-collisions/same-operation-id-same-document',
    config: { files: [file('spec.json')] },
  },
  {
    name: 'two AsyncAPI operations of one document sharing an operationId',
    category: MESSAGE_CATEGORY.AsyncDuplicateOperation,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'asyncapi-changes/operation/duplicate-within-document',
    config: { files: [file('spec.yaml')] },
  },
  {
    name: 'one operationId claimed by two documents whose content differs',
    category: MESSAGE_CATEGORY.DuplicateOperationId,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'operation-id-collisions/same-path-different-documents',
    config: { files: [file('spec1.json'), file('spec2.json')] },
  },
  {
    name: 'a path parameter with no name',
    category: MESSAGE_CATEGORY.EmptyPathParameter,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    project: 'operation-id-collisions/empty-path-parameter-name',
    config: { files: [file('spec.json')] },
  },
  {
    name: 'a path with a double slash',
    category: MESSAGE_CATEGORY.DoubleSlashPath,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    project: 'operation-id-collisions/double-slash-in-path',
    config: { files: [file('spec.json')] },
  },
  {
    name: 'DDL with an unresolved reference',
    category: MESSAGE_CATEGORY.DdlParseIssue,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    content: { 'shop.sql': 'CREATE TABLE orders (id bigint PRIMARY KEY, uid bigint REFERENCES missing(id));' },
    config: { files: [file('shop.sql')] },
  },
  {
    name: 'the same table declared twice in one file',
    category: MESSAGE_CATEGORY.DdlDuplicateObject,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    content: { 'shop.sql': 'CREATE TABLE users (id bigint PRIMARY KEY);\nCREATE TABLE users (id bigint PRIMARY KEY);' },
    config: { files: [file('shop.sql')] },
  },
  {
    name: 'the same table declared in two files',
    category: MESSAGE_CATEGORY.DdlDuplicateEntity,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    content: {
      'a.sql': 'CREATE TABLE users (id bigint PRIMARY KEY);',
      'b.sql': 'CREATE TABLE users (id bigint PRIMARY KEY, email text);',
    },
    config: { files: [file('a.sql'), file('b.sql')] },
  },
  {
    name: 'two DDL tables whose ids collide',
    category: MESSAGE_CATEGORY.DdlEntityBuild,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'ddl-build',
    config: { files: [file('duplicate.sql')] },
  },
  {
    name: 'two MCP entities of one name in one document',
    category: MESSAGE_CATEGORY.McpEntityBuild,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'mcp-build',
    config: { files: [{ ...file('init.json'), ...MCP }, { ...file('tools-duplicate-name.json'), ...MCP }] },
  },
  {
    name: 'one MCP entity id claimed by two documents',
    category: MESSAGE_CATEGORY.McpDuplicateEntity,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'mcp-build',
    config: {
      files: [
        { ...file('init.json'), ...MCP },
        { ...file('tools-same-name.json'), ...MCP },
        { ...file('tools-same-name-2.json'), ...MCP },
      ],
    },
  },
  {
    name: 'an MCP document that fails its protocol schema',
    category: MESSAGE_CATEGORY.McpDocumentSchema,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'mcp-build',
    config: { files: [{ ...file('init.json'), ...MCP }, { ...file('tools-missing-inputschema.json'), ...MCP }] },
  },
  {
    name: 'an MCP endpoint published without an init',
    category: MESSAGE_CATEGORY.McpInitRequired,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    project: 'mcp-build',
    config: { files: [{ ...file('tools.json'), ...MCP }] },
  },
  {
    name: 'an MCP capability declared with no entities',
    category: MESSAGE_CATEGORY.McpCapabilityUnused,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    project: 'mcp-build',
    config: { files: [{ ...file('init.json'), ...MCP }, { ...file('tools.json'), ...MCP }] },
  },
  {
    name: 'an AsyncAPI operation whose message is inline',
    category: MESSAGE_CATEGORY.BuildOperations,
    severity: MESSAGE_SEVERITY.Error, attributed: true, blocksRelease: true,
    content: { 'async.yaml': ASYNC_INLINE_MESSAGE },
    config: { files: [file('async.yaml')] },
  },
  {
    name: 'a deprecated REST item the unifier stamps no tolerant hash on',
    category: MESSAGE_CATEGORY.TolerantHashMissing,
    severity: MESSAGE_SEVERITY.Warning, attributed: true, blocksRelease: false,
    project: 'deprecated/public-registry',
    config: { files: [file('v2.yaml')] },
  },
  {
    name: 'a version that added an api type its baseline does not have',
    category: MESSAGE_CATEGORY.VersionDocumentsMissing,
    severity: MESSAGE_SEVERITY.Warning, attributed: false, blocksRelease: false, stream: 'comparison',
    baseline: { content: { 'async.yaml': ANY_ASYNCAPI_SPEC }, config: { files: [file('async.yaml')] } },
    content: { 'rest.json': ANY_REST_SPEC },
    config: { files: [file('rest.json')], previousVersion: 'v1' },
  },
  {
    name: 'a previous version that does not resolve',
    category: MESSAGE_CATEGORY.VersionNotResolved,
    severity: MESSAGE_SEVERITY.Error, attributed: false, blocksRelease: true, stream: 'comparison',
    content: { 'rest.json': ANY_REST_SPEC },
    config: { files: [file('rest.json')], previousVersion: 'no-such-version' },
  },
]

/*
 * The categories this table does not drive, and why.
 *
 * No document a publisher can write produces them: each needs a collaborator to fail — a resolver returning
 * nothing, a diff arriving malformed, a hash that throws. The suite that stubs that collaborator owns the case.
 *
 *   version-refs-not-resolved    notification-attribution.test.ts — host-conditional: the contract lets the
 *                                references resolver answer `null`, and `LocalRegistry` never does
 *   comparison-serialization     release-gate.test.ts — a violation of api-diff's output contract, not of
 *                                anything a document can say
 *   risky-origins                calculation-diagnostics.test.ts — needs origins to be absent, which the
 *                                comparison's own normalization always supplies
 *   tolerant-hash-failed         calculation-diagnostics.test.ts — the deferred hash has no input-shaped throw
 *   deprecated-component-path    calculation-diagnostics.test.ts — a `components`-rooted declaration path comes
 *                                from a `$ref` pointer, so its segments are always strings
 *
 * One belongs to a build type this table does not run:
 *
 *   group-documents-missing      document-group.test.ts — a group build, whose archive carries it like any
 *                                other; only the export build types return before `notifications.json`
 *
 * And one no build reaches at all:
 *
 *   partial-group-documents      raised inside the branch that already found no documents, where
 *                                `[].every(...)` holds — so the partial case it names cannot reach it. It
 *                                fires only when the resolver answers `null`, and then it says the wrong
 *                                thing. Predates this change; the fix is to lift it out of that branch.
 */

const publish = async (testCase: Case, status: string): Promise<BuildResult> => {
  const packageId = `catalogue/${testCase.category}`
  const registry = new LocalRegistry(packageId)

  if (testCase.baseline) {
    await registry.publishFromContent(testCase.baseline.content, {
      packageId, version: 'v1', status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD, ...testCase.baseline.config,
    } as BuildConfig)
  }

  const config = {
    packageId,
    version: testCase.baseline ? 'v2' : 'v1',
    status,
    buildType: BUILD_TYPE.BUILD,
    ...testCase.config,
  } as BuildConfig
  return testCase.content
    ? registry.publishFromContent(testCase.content, config)
    : registry.publish(testCase.project, config)
}

const raised = (result: BuildResult, stream: Stream = 'build'): NotificationMessage[] =>
  (stream === 'build'
    ? result.notifications
    : [...result.comparisonNotifications, ...result.comparisons.flatMap(({ notifications }) => notifications)])

// `MessageCategory` is a contract the backend filters on, so a value added here without a row — or a row left
// behind after a value is removed — has to fail rather than drift.
const UNREACHABLE_FROM_A_DOCUMENT: MessageCategory[] = [
  MESSAGE_CATEGORY.TolerantHashFailed,
  MESSAGE_CATEGORY.RiskyOrigins,
  MESSAGE_CATEGORY.DeprecatedComponentPath,
  MESSAGE_CATEGORY.VersionRefsNotResolved,
  MESSAGE_CATEGORY.ComparisonSerialization,
  MESSAGE_CATEGORY.GroupDocumentsMissing,
  MESSAGE_CATEGORY.PartialGroupDocuments,
]

// A channel is a node the unifier stamps no hash flag on, so asking for a tolerant hash there could only
// ever report a missing one. The schema-derived deprecated items of the same document still ask for theirs.
describe('A deprecated AsyncAPI channel', () => {
  test('should publish without reporting a missing tolerant hash', async () => {
    const packageId = 'tolerant-hash/deprecated-channel'
    const registry = new LocalRegistry(packageId)
    const result = await registry.publishFromContent({ 'async.yaml': ASYNC_DEPRECATED_CHANNEL }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [file('async.yaml')],
    } as BuildConfig)

    expect(result.notifications.map(({ category }) => category))
      .not.toContain(MESSAGE_CATEGORY.TolerantHashMissing)
    // the deprecated item itself is still published
    const [operation] = [...result.operations.values()]
    expectNotEmpty(operation.deprecatedItems)
  }, 30000)
})

// Removed from the enum: `versionOperationsResolver` raised it only for `includeData`, and both call sites in
// `compare.operations.ts` pass `false`, so no build could reach it.
describe('Categories no build can raise', () => {
  test('should keep operation-data-missing out of the categories', () => {
    expect(Object.values(MESSAGE_CATEGORY)).not.toContain('operation-data-missing')
  })
})

describe('The catalogue covers every category', () => {
  test('should drive or explicitly exclude each value of MESSAGE_CATEGORY', () => {
    const driven = new Set<string>(CASES.map(({ category }) => category))
    const excluded = new Set<string>(UNREACHABLE_FROM_A_DOCUMENT)

    const uncovered = Object.values(MESSAGE_CATEGORY).filter(category =>
      !driven.has(category) && !excluded.has(category))
    expect(uncovered).toEqual([])

    // and nothing is listed on both sides, or excluded after it became reachable
    expect([...excluded].filter(category => driven.has(category))).toEqual([])
  })
})

describe('Every diagnostic a build can raise', () => {
  test.each(CASES)('should report $name', async (testCase) => {
    const draft = await publish(testCase, VERSION_STATUS.DRAFT)
    const [message] = raised(draft, testCase.stream).filter(({ category }) => category === testCase.category)

    expect(message).toBeDefined()
    expect(message.severity).toBe(testCase.severity)
    expect(!!message.documentId).toBe(testCase.attributed)
  }, 60000)

  test.each(CASES.map(testCase => ({ ...testCase, release: testCase.blocksRelease ? 'refuse' : 'publish' })))(
    'should $release a release carrying $name', async (testCase) => {
    const release = publish(testCase, VERSION_STATUS.RELEASE)

    if (testCase.blocksRelease) {
      await expect(release).rejects.toThrow(/You can publish version in draft status/)
    } else {
      await expect(release).resolves.toBeDefined()
    }
  }, 60000)
})
