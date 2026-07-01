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

import { parseMcpFile } from '../src/apitypes/mcp/mcp.parser'
import { buildMcpEntities, calculateMcpEntityId, wrapEntityData } from '../src/apitypes/mcp/mcp.entities'
import { buildMcpDocument } from '../src/apitypes/mcp/mcp.document'
import { MCP_DOCUMENT_TYPE } from '../src/apitypes/mcp/mcp.consts'
import { mcpBuilder } from '../src/apitypes/mcp'
import { createDuplicateMcpEntityHandler, createMcpBuildContext, processMcpDocument, validateMcpCapabilities, validateMcpProtocolVersion } from '../src/components/mcp'
import { getMcpSchemaValidator, isSupportedMcpVersion, SUPPORTED_MCP_VERSIONS } from '../src/apitypes/mcp/mcp.validation'
import { BuilderContext, BuildConfigFile, FILE_KIND, TextFile, VersionDocument } from '../src/types'
import { ParsedMcpData } from '../src/apitypes/mcp/mcp.types'
import { MCP_KIND, McpKind } from '../src/types/package/mcp'
import { NotificationMessage } from '../src/types/package'
import { FILE_FORMAT_JSON, MESSAGE_SEVERITY } from '../src/consts'

const makeBlob = (obj: unknown): Blob => new Blob([JSON.stringify(obj)], { type: 'application/json' })

// minimal stand-in for a built MCP document — the functions under test read fileId/type/data and,
// for schema validation, metadata.mcpEndpoint and the publish flag
const makeMcpDocument = (
  fileId: string,
  type: string,
  data: ParsedMcpData,
  extra: { mcpEndpoint?: string; publish?: boolean } = {},
): VersionDocument<ParsedMcpData> =>
  ({ fileId, type, data, format: 'json', publish: extra.publish, metadata: { mcpEndpoint: extra.mcpEndpoint } }) as unknown as VersionDocument<ParsedMcpData>

describe('MCP parser', () => {
  test('should detect init shape (capabilities + serverInfo) as init', async () => {
    const data = {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: 'my-server', version: '1.0' },
    }
    const result = await parseMcpFile('init.json', makeBlob(data))
    expect(result).toBeDefined()
    expect(result!.type).toBe(MCP_DOCUMENT_TYPE.MCP_INIT)
    expect(result!.data.entities).toHaveLength(1)

    const [initEntity] = result!.data.entities
    expect(initEntity.kind).toBe('init')
    expect(initEntity.name).toBe('initialize')
  })

  test('should detect a file with capabilities as init and ignore its tools array', async () => {
    const data = {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: 'my-server', version: '1.0' },
      tools: [{ name: 'tool1', inputSchema: { type: 'object' } }],
    }
    const result = await parseMcpFile('combined.json', makeBlob(data))
    expect(result).toBeDefined()
    expect(result!.type).toBe(MCP_DOCUMENT_TYPE.MCP_INIT)
    expect(result!.data.entities).toHaveLength(1)
    const [initEntity] = result!.data.entities
    expect(initEntity.kind).toBe('init')
  })

  test('should detect a plain init that carries protocolVersion', async () => {
    const result = await parseMcpFile('init.json', makeBlob({
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: { name: 'my-server', version: '1.0' },
    }))
    expect(result?.type).toBe(MCP_DOCUMENT_TYPE.MCP_INIT)
    expect(result?.data.entities).toHaveLength(1)
  })

  test('should unwrap a JSON-RPC init response and keep only its result as the init document', async () => {
    const result = await parseMcpFile('init.json', makeBlob({
      jsonrpc: '2.0',
      id: 0,
      result: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {} },
        serverInfo: { name: 'apihub-mcp', version: '0.0.2' },
      },
    }))
    expect(result?.type).toBe(MCP_DOCUMENT_TYPE.MCP_INIT)
    // the JSON-RPC envelope is gone — originalDocument is the plain init (its `result`)
    expect(result?.data.originalDocument).not.toHaveProperty('jsonrpc')
    expect(result?.data.originalDocument.protocolVersion).toBe('2025-11-25')
    // ...and it doesn't linger in the stored source either
    const sourceText = await result!.source.text()
    expect(sourceText).not.toContain('jsonrpc')
    expect(JSON.parse(sourceText).protocolVersion).toBe('2025-11-25')
  })

  test('should unwrap a JSON-RPC tools response and detect it as tools', async () => {
    const result = await parseMcpFile('tools.json', makeBlob({
      jsonrpc: '2.0',
      id: 1,
      result: { tools: [{ name: 't', inputSchema: { type: 'object' } }] },
    }))
    expect(result?.type).toBe(MCP_DOCUMENT_TYPE.MCP_TOOLS)
    expect(result?.data.entities).toHaveLength(1)
  })

  test('should skip a non-object list item and report it', async () => {
    const result = await parseMcpFile('tools.json', makeBlob({
      tools: [42, { name: 'ok', inputSchema: { type: 'object' } }],
    }))
    expect(result).toBeDefined()
    expect(result!.data.entities).toHaveLength(1)
    const [okTool] = result!.data.entities
    expect(okTool.name).toBe('ok')
    expect(result!.errors!.some(e => /expected an object/.test(e.message))).toBe(true)
  })

  describe('list extraction', () => {
    // build a minimal valid item of the given kind (each list type has its own required fields)
    const makeItem = (kind: McpKind, name: string): Record<string, unknown> => {
      switch (kind) {
        case 'resource': return { uri: `file:///${name}`, name }
        case 'tool': return { name, inputSchema: { type: 'object' } }
        case 'prompt': return { name }
        default: throw new Error(`makeItem: unsupported kind '${kind}'`)
      }
    }

    const listKinds: Array<{ key: string; kind: McpKind; type: string }> = [
      { key: 'tools', kind: 'tool', type: MCP_DOCUMENT_TYPE.MCP_TOOLS },
      { key: 'resources', kind: 'resource', type: MCP_DOCUMENT_TYPE.MCP_RESOURCES },
      { key: 'prompts', kind: 'prompt', type: MCP_DOCUMENT_TYPE.MCP_PROMPTS },
    ]

    describe.each(listKinds)('$key', ({ key, kind, type }) => {
      test('should detect a single entity', async () => {
        const result = await parseMcpFile(`${key}.json`, makeBlob({ [key]: [makeItem(kind, 'a')] }))
        expect(result!.type).toBe(type)
        expect(result!.data.entities).toHaveLength(1)
        expect(result!.data.entities.every(e => e.kind === kind)).toBe(true)
        expect(result!.data.entities.map(e => e.name)).toEqual(['a'])
      })

      test('should detect multiple entities', async () => {
        const result = await parseMcpFile(`${key}.json`, makeBlob({ [key]: [makeItem(kind, 'a'), makeItem(kind, 'b')] }))
        expect(result!.type).toBe(type)
        expect(result!.data.entities).toHaveLength(2)
        expect(result!.data.entities.every(e => e.kind === kind)).toBe(true)
        expect(result!.data.entities.map(e => e.name)).toEqual(['a', 'b'])
      })
    })
  })

  describe('rejects non-MCP / malformed input', () => {
    const cases: Array<{ name: string; fileId: string; blob: Blob }> = [
      { name: 'OpenAPI spec', fileId: 'spec.json', blob: makeBlob({ openapi: '3.0.0', info: { title: 'x', version: '1' } }) },
      { name: 'top-level array', fileId: 'arr.json', blob: makeBlob([1, 2, 3]) },
      { name: 'invalid JSON', fileId: 'bad.json', blob: new Blob(['not json'], { type: 'application/json' }) },
      { name: 'non-json extension', fileId: 'file.yaml', blob: new Blob(['{}'], { type: 'text/plain' }) },
      { name: 'empty object', fileId: 'empty.json', blob: makeBlob({}) },
    ]

    test.each(cases)('should return undefined for $name', async ({ fileId, blob }) => {
      expect(await parseMcpFile(fileId, blob)).toBeUndefined()
    })
  })

  describe('keeps a detected MCP file even when it yields no usable entities', () => {
    // schema conformance is enforced later, fatally, at build time (validateMcpProtocolVersion) — the
    // parser must NOT downgrade a structurally-detected MCP file to an unknown document
    test('should keep an empty tools array as an MCP document with no entities', async () => {
      const result = await parseMcpFile('tools.json', makeBlob({ tools: [] }))
      expect(result?.type).toBe(MCP_DOCUMENT_TYPE.MCP_TOOLS)
      expect(result?.data.entities).toHaveLength(0)
    })

    test('should keep an all-invalid tools list as an MCP document and report the skips', async () => {
      const result = await parseMcpFile('tools.json', makeBlob({ tools: [{ description: 'no name' }] }))
      expect(result?.type).toBe(MCP_DOCUMENT_TYPE.MCP_TOOLS)
      expect(result?.data.entities).toHaveLength(0)
      expect(result?.errors?.some(e => /missing or empty required 'name'/.test(e.message))).toBe(true)
    })
  })
})

describe('MCP entity ID', () => {
  // exact outputs of calculateMcpEntityId; slugify charmap keeps `_` and `.` and case,
  // maps `/` and spaces to `-`, and `()[]{}` to `_` (see SLUG_OPTIONS_OPERATION_ID)
  const cases: Array<{ name: string; endpoint: string; kind: McpKind; entityName: string; expected: string }> = [
    { name: 'simple endpoint and name', endpoint: '/mcp', kind: 'tool', entityName: 'search_docs', expected: 'mcp-tool-search_docs' },
    { name: 'trailing slash is not trimmed', endpoint: '/mcp/', kind: 'tool', entityName: 'x', expected: 'mcp--tool-x' },
    { name: 'nested path endpoint', endpoint: '/api/v1', kind: 'tool', entityName: 'get_forecast', expected: 'api-v1-tool-get_forecast' },
    { name: 'prompt kind', endpoint: '/mcp', kind: 'prompt', entityName: 'summarize', expected: 'mcp-prompt-summarize' },
    { name: 'space in name becomes a hyphen', endpoint: '/mcp', kind: 'tool', entityName: 'get forecast', expected: 'mcp-tool-get-forecast' },
    { name: 'case and dot are preserved', endpoint: '/mcp', kind: 'tool', entityName: 'Get.Forecast', expected: 'mcp-tool-Get.Forecast' },
    { name: 'parentheses become underscores', endpoint: '/mcp', kind: 'tool', entityName: 'search(docs)', expected: 'mcp-tool-search_docs_' },
  ]

  test.each(cases)('should build $expected for $name', ({ endpoint, kind, entityName, expected }) => {
    expect(calculateMcpEntityId(endpoint, kind, entityName)).toBe(expected)
  })

  // collision: distinct raw names can slugify to the same id (space vs slash both → '-').
  // the id calc does NOT auto-disambiguate — the build instead fails on the duplicate id
  // (see 'MCP cross-document duplicate detection' and the build-level duplicate tests)
  test('should produce the same ID for distinct raw names that normalize to the same slug', () => {
    expect(calculateMcpEntityId('/mcp', 'tool', 'get forecast'))
      .toBe(calculateMcpEntityId('/mcp', 'tool', 'get/forecast'))
  })
})

describe('MCP capability cross-check', () => {
  const initParsed = (capabilities: Record<string, unknown>): ParsedMcpData => ({
    entities: [{ kind: 'init', name: 'initialize', data: {} }],
    originalDocument: { capabilities, serverInfo: { name: 'test', version: '1.0' } },
  })
  const toolParsed = (name: string): ParsedMcpData => ({
    entities: [{ kind: 'tool', name, data: { name, inputSchema: { type: 'object' } } }],
    originalDocument: { tools: [{ name, inputSchema: { type: 'object' } }] },
  })

  // process every doc into one context, then run the capability cross-check and return its notifications
  const runCapabilityCheck = (
    docs: Array<{ fileId: string; endpoint: string; type: string; parsed: ParsedMcpData }>,
  ): NotificationMessage[] => {
    const ctx = createMcpBuildContext()
    const documents = new Map<string, VersionDocument>()
    for (const { fileId, endpoint, type, parsed } of docs) {
      const doc = makeMcpDocument(fileId, type, parsed)
      processMcpDocument({ fileId, metadata: { mcpEndpoint: endpoint } }, doc, mcpBuilder, ctx)
      documents.set(fileId, doc)
    }
    const notifications: NotificationMessage[] = []
    validateMcpCapabilities(ctx.mcpEntities, documents, notifications)
    return notifications
  }

  test('should warn when init declares tools capability but no tools are found', () => {
    const notifications = runCapabilityCheck([
      { fileId: 'init.json', endpoint: '/api/v1', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initParsed({ tools: {} }) },
    ])
    expect(notifications).toHaveLength(1)
    expect(notifications[0].severity).toBe(MESSAGE_SEVERITY.Warning)
    expect(notifications[0].message).toContain('tools')
    expect(notifications[0].message).toContain('/api/v1')
  })

  test('should not warn when init declares tools and tools exist', () => {
    const notifications = runCapabilityCheck([
      { fileId: 'init.json', endpoint: '/api/v1', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initParsed({ tools: {} }) },
      { fileId: 'tools.json', endpoint: '/api/v1', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolParsed('my_tool') },
    ])
    expect(notifications).toHaveLength(0)
  })

  test('should not warn when no init capabilities are declared', () => {
    const notifications = runCapabilityCheck([
      { fileId: 'tools.json', endpoint: '/api/v1', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolParsed('my_tool') },
    ])
    expect(notifications).toHaveLength(0)
  })

  test('should scope the check per endpoint — tools on another endpoint do not satisfy the init', () => {
    // init declares tools on /api/a, but the only tools entity lives on /api/b
    const notifications = runCapabilityCheck([
      { fileId: 'init.json', endpoint: '/api/a', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initParsed({ tools: {} }) },
      { fileId: 'tools.json', endpoint: '/api/b', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolParsed('my_tool') },
    ])
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message).toContain('/api/a')
  })
})

describe('wrapEntityData (table)', () => {
  const item = { name: 'x', foo: 1 }
  const cases: Array<{ kind: McpKind; expected: unknown }> = [
    { kind: 'tool', expected: { tools: [item] } },
    { kind: 'resource', expected: { resources: [item] } },
    { kind: 'prompt', expected: { prompts: [item] } },
    // init is stored raw, without a wrapper
    { kind: 'init', expected: item },
  ]

  test.each(cases)('should wrap $kind data', ({ kind, expected }) => {
    expect(wrapEntityData(kind, item)).toEqual(expected)
  })
})

describe('MCP cross-document duplicate detection', () => {
  const toolDoc = (): ParsedMcpData => ({
    entities: [{ kind: 'tool', name: 'search', data: { name: 'search', inputSchema: { type: 'object' } } }],
    originalDocument: { tools: [{ name: 'search', inputSchema: { type: 'object' } }] },
  })

  const process = (ctx: ReturnType<typeof createMcpBuildContext>, fileId: string, endpoint: string): void =>
    processMcpDocument(
      { fileId, metadata: { mcpEndpoint: endpoint } },
      makeMcpDocument(fileId, MCP_DOCUMENT_TYPE.MCP_TOOLS, toolDoc()),
      mcpBuilder,
      ctx,
      createDuplicateMcpEntityHandler(),
    )

  test('should throw when the same entity ID appears in two documents', () => {
    const ctx = createMcpBuildContext()
    process(ctx, 'tools-a.json', '/api/v1')
    expect(() => process(ctx, 'tools-b.json', '/api/v1')).toThrow(/found in different documents/)
  })

  test('should not throw when the same name lives under different endpoints', () => {
    const ctx = createMcpBuildContext()
    process(ctx, 'tools-a.json', '/api/v1')
    expect(() => process(ctx, 'tools-b.json', '/api/v2')).not.toThrow()
  })
})

describe('MCP per-version schema validation', () => {
  // validates the payload exactly as it is stored on an entity (init = raw InitializeResult; list kinds
  // wrapped in their collection form by wrapEntityData) against the OFFICIAL schema for the version.
  const check = (version: string, kind: McpKind, data: unknown): { ok: boolean; errors: string[] } => {
    const validate = getMcpSchemaValidator(version, kind)
    if (!validate) { throw new Error(`no validator for ${version}/${kind}`) }
    const ok = validate(data) as boolean
    return { ok, errors: (validate.errors ?? []).map(e => `${e.instancePath || '/'} ${e.message ?? ''}`) }
  }

  test('should pass valid init/tools/resources/prompts for 2025-11-25', () => {
    expect(check('2025-11-25', MCP_KIND.INIT, {
      protocolVersion: '2025-11-25', capabilities: {}, serverInfo: { name: 's', version: '1.0.0' },
    }).ok).toBe(true)
    expect(check('2025-11-25', MCP_KIND.TOOL, { tools: [{ name: 't', inputSchema: { type: 'object' } }] }).ok).toBe(true)
    expect(check('2025-11-25', MCP_KIND.RESOURCE, { resources: [{ name: 'r', uri: 'https://example.com' }] }).ok).toBe(true)
    expect(check('2025-11-25', MCP_KIND.PROMPT, { prompts: [{ name: 'p' }] }).ok).toBe(true)
  })

  test('should reject a tool missing required inputSchema', () => {
    const { ok, errors } = check('2025-11-25', MCP_KIND.TOOL, { tools: [{ name: 't' }] })
    expect(ok).toBe(false)
    expect(errors.some(m => /inputSchema/.test(m))).toBe(true)
  })

  test('should reject init missing serverInfo.version', () => {
    const { ok, errors } = check('2025-11-25', MCP_KIND.INIT, {
      protocolVersion: '2025-11-25', capabilities: {}, serverInfo: { name: 's' },
    })
    expect(ok).toBe(false)
    expect(errors.some(m => /version/.test(m))).toBe(true)
  })

  test('should reject a resource missing required uri', () => {
    const { ok, errors } = check('2025-11-25', MCP_KIND.RESOURCE, { resources: [{ name: 'r' }] })
    expect(ok).toBe(false)
    expect(errors.some(m => /uri/.test(m))).toBe(true)
  })

  test('should validate the draft-07 revisions too (2024-11-05)', () => {
    expect(check('2024-11-05', MCP_KIND.TOOL, { tools: [{ name: 't', inputSchema: { type: 'object' } }] }).ok).toBe(true)
    expect(check('2024-11-05', MCP_KIND.TOOL, { tools: [{ name: 't' }] }).ok).toBe(false)
  })

  test('should support exactly the four non-draft versions and nothing else', () => {
    expect(SUPPORTED_MCP_VERSIONS).toEqual(['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'])
    expect(isSupportedMcpVersion('2025-11-25')).toBe(true)
    expect(isSupportedMcpVersion('draft')).toBe(false)
    expect(getMcpSchemaValidator('1999-01-01', MCP_KIND.TOOL)).toBeUndefined()
  })
})

describe('validateMcpProtocolVersion (build-level)', () => {
  const ENDPOINT = '/mcp/v1'
  const VERSION = '2025-11-25'

  const initDoc = (overrides: Record<string, unknown> = {}): ParsedMcpData => {
    const originalDocument = {
      protocolVersion: VERSION, capabilities: {}, serverInfo: { name: 's', version: '1.0.0' }, ...overrides,
    }
    return { entities: [{ kind: 'init', name: 'initialize', data: originalDocument }], originalDocument }
  }

  // entities deliberately left empty — validation must validate the raw document, not the extracted entities
  const toolsDoc = (tools: unknown[]): ParsedMcpData => ({ entities: [], originalDocument: { tools } })

  const buildDocuments = (
    docs: Array<{ fileId: string; type: string; parsed: ParsedMcpData; endpoint?: string; publish?: boolean }>,
  ): Map<string, VersionDocument> => {
    const map = new Map<string, VersionDocument>()
    for (const { fileId, type, parsed, endpoint = ENDPOINT, publish } of docs) {
      map.set(fileId, makeMcpDocument(fileId, type, parsed, { mcpEndpoint: endpoint, publish }))
    }
    return map
  }

  // gap 2: a tools list whose every item is dropped in extraction (zero entities) must still be
  // schema-validated, so a non-conforming item (here: missing required name/inputSchema) breaks publish
  test('should throw when an all-invalid tools list yields a non-conforming document', () => {
    const documents = buildDocuments([
      { fileId: 'init.json', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initDoc() },
      { fileId: 'tools.json', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolsDoc([{ description: 'no name' }]) },
    ])
    expect(() => validateMcpProtocolVersion(documents)).toThrow(/does not conform/)
  })

  test('should pass a structurally-empty tools list', () => {
    const documents = buildDocuments([
      { fileId: 'init.json', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initDoc() },
      { fileId: 'tools.json', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolsDoc([]) },
    ])
    expect(() => validateMcpProtocolVersion(documents)).not.toThrow()
  })

  test('should pass a valid init + tools set', () => {
    const documents = buildDocuments([
      { fileId: 'init.json', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initDoc() },
      { fileId: 'tools.json', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolsDoc([{ name: 't', inputSchema: { type: 'object' } }]) },
    ])
    expect(() => validateMcpProtocolVersion(documents)).not.toThrow()
  })

  test('should throw on an unsupported protocolVersion', () => {
    const documents = buildDocuments([
      { fileId: 'init.json', type: MCP_DOCUMENT_TYPE.MCP_INIT, parsed: initDoc({ protocolVersion: '1999-01-01' }) },
    ])
    expect(() => validateMcpProtocolVersion(documents)).toThrow(/unsupported protocolVersion/)
  })

  // gap 1: the endpoint requirement is enforced for every published MCP document, regardless of entities
  test('should throw when a published MCP document is missing metadata.mcpEndpoint', () => {
    const documents = new Map<string, VersionDocument>([
      ['tools.json', makeMcpDocument(
        'tools.json', MCP_DOCUMENT_TYPE.MCP_TOOLS,
        toolsDoc([{ name: 't', inputSchema: { type: 'object' } }]), {},
      )],
    ])
    expect(() => validateMcpProtocolVersion(documents)).toThrow(/missing required metadata.mcpEndpoint/)
  })

  test('should skip documents that are not published', () => {
    // an otherwise non-conforming tools doc — but publish:false means it is never validated
    const documents = buildDocuments([
      { fileId: 'tools.json', type: MCP_DOCUMENT_TYPE.MCP_TOOLS, parsed: toolsDoc([{ description: 'no name' }]), publish: false },
    ])
    expect(() => validateMcpProtocolVersion(documents)).not.toThrow()
  })
})

describe('buildMcpDocument metadata flattening', () => {
  const parsedFile = (originalDocument: Record<string, unknown>): TextFile<ParsedMcpData> => ({
    fileId: 'init.json',
    type: MCP_DOCUMENT_TYPE.MCP_INIT,
    format: FILE_FORMAT_JSON,
    data: { entities: [], originalDocument },
    source: new Blob([]),
    kind: FILE_KIND.TEXT,
  })

  // buildMcpDocument ignores its BuilderContext argument; an empty stand-in keeps the call type-safe
  const ctx = {} as unknown as BuilderContext<ParsedMcpData>

  test('should place the file metadata keys directly under document.metadata (not nested)', async () => {
    const file: BuildConfigFile = { fileId: 'init.json', metadata: { mcpEndpoint: '/mcp' }, foo: 'bar' }
    const document = await buildMcpDocument(parsedFile({ capabilities: {} }), file, ctx)
    // file.metadata.mcpEndpoint is now a top-level key of document.metadata, not document.metadata.metadata
    expect(document.metadata.mcpEndpoint).toBe('/mcp')
    expect(document.metadata.metadata).toBeUndefined()
    // other pass-through file fields are still carried onto document.metadata
    expect(document.metadata.foo).toBe('bar')
  })

  test('should not fail when the file carries no metadata object', async () => {
    const file: BuildConfigFile = { fileId: 'init.json' }
    const document = await buildMcpDocument(parsedFile({ capabilities: {} }), file, ctx)
    expect(document.metadata).toEqual({})
  })
})

describe('buildMcpEntities metadata requirement', () => {
  // gap 1: the endpoint check is hoisted above the no-entities early return, so a zero-entity
  // document with no endpoint still fails fast rather than slipping through
  test('should throw when mcpEndpoint is missing even for a zero-entity document', () => {
    const document = makeMcpDocument('tools.json', MCP_DOCUMENT_TYPE.MCP_TOOLS, { entities: [], originalDocument: { tools: [] } })
    expect(() => buildMcpEntities(document, { fileId: 'tools.json', metadata: {} })).toThrow(/missing required metadata.mcpEndpoint/)
  })
})
