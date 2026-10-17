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
import {
  documentOf,
  Editor,
  errorNotificationsOf,
  expectNotEmpty,
  loadJsonFromRegistry,
  LocalRegistry,
  VERSIONS_PATH,
  warningNotificationsOf,
} from './helpers'
import { BUILD_TYPE, MESSAGE_CATEGORY, REST_API_TYPE, VERSION_STATUS } from '../src/consts'
import { MCP_DOCUMENT_TYPE } from '../src/apitypes/mcp'
import { McpEntity, McpEntityIndex, McpKind, PackageMcpEntity } from '../src/types/package/mcp'
import { BuildResult } from '../src/types'

const MCP_ENDPOINT = '/mcp'

// A build file entry for the init document. Returns a FRESH object per call — the builder mutates
// file entries (sets `slug`, `apiKind`), so a shared reference would leak state across runs.
const initFile = (mcpEndpoint: string = MCP_ENDPOINT, fileId = 'init.json'): { fileId: string; metadata: { mcpEndpoint: string } } =>
  ({ fileId, metadata: { mcpEndpoint } })

// mcpEntities is a flat Map keyed by id, valued by McpEntity (index fields + data); pull out a kind's entities
const entitiesOfKind = (
  result: { mcpEntities?: McpEntityIndex },
  kind: McpKind,
): McpEntity[] => Array.from(result.mcpEntities?.values() ?? []).filter(e => e.kind === kind)

// assert the built entity count per kind; kinds omitted from `counts` are expected to be absent (0)
const expectEntityCounts = (
  result: { mcpEntities?: McpEntityIndex },
  counts: Partial<Record<McpKind, number>>,
): void => {
  const kinds: McpKind[] = ['init', 'tool', 'resource', 'prompt']
  for (const kind of kinds) {
    expect(entitiesOfKind(result, kind)).toHaveLength(counts[kind] ?? 0)
  }
}

// assert a (possibly undefined) entity exists and matches the given subset of index fields
const expectEntity = (
  entity: PackageMcpEntity | undefined,
  expected: Partial<PackageMcpEntity>,
): void => {
  expect(entity).toBeDefined()
  expect(entity).toMatchObject(expected)
}

function createMcpEditor(registry?: LocalRegistry): Editor {
  const packageId = 'mcp-build'
  const reg = registry ?? LocalRegistry.openPackage(packageId)
  return new Editor(packageId, {
    packageId,
    version: 'v1',
    // draft: these tests are about what is reported, not about whether a release may publish
    status: VERSION_STATUS.DRAFT,
    buildType: BUILD_TYPE.BUILD,
    files: [],
  }, {}, reg)
}

// the full payload of the search_docs tool fixture (tools.json) — asserted both as the entity's `data`
// and as the serialized mcp/{id}.json, so it is defined once here
const SEARCH_DOCS_TOOL_PAYLOAD = {
  tools: [{
    name: 'search_docs',
    description: 'Search through documentation',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  }],
}


// A whole-set MCP check no longer kills the publish: it reports, and every affected document is told.
const expectReportedErrors = (
  result: BuildResult,
  expectedMessage: RegExp,
): void => {
  const errors = errorNotificationsOf(result.notifications)
  expectNotEmpty(errors)
  expect(errors.some(({ message }) => expectedMessage.test(message))).toBe(true)
  expect(errors.every(({ documentId }) => documentId !== undefined)).toBe(true)
}

describe('MCP Build', () => {

  describe('Document types', () => {
    test('should produce init document type from init file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
        ],
      })
      const doc = documentOf(result, 'init.json')
      expect(doc.type).toBe(MCP_DOCUMENT_TYPE.MCP_INIT)
    })

    test('should produce tools document type from tools file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })
      const doc = documentOf(result, 'tools.json')
      expect(doc.type).toBe(MCP_DOCUMENT_TYPE.MCP_TOOLS)
    })

    test('should produce resources document type from resources file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'resources.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })
      const doc = documentOf(result, 'resources.json')
      expect(doc.type).toBe(MCP_DOCUMENT_TYPE.MCP_RESOURCES)
    })

    test('should produce prompts document type from prompts file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'prompts.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })
      const doc = documentOf(result, 'prompts.json')
      expect(doc.type).toBe(MCP_DOCUMENT_TYPE.MCP_PROMPTS)
    })
  })

  describe('Entity extraction', () => {
    test('should extract tool entities from tools file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      expect(result.mcpEntities).toBeDefined()
      expectEntityCounts(result, { init: 1, tool: 2 })

      const searchDocTool = entitiesOfKind(result, 'tool').find(t => t.title === 'search_docs')
      expectEntity(searchDocTool, {
        kind: 'tool',
        mcpEndpoint: MCP_ENDPOINT,
        description: 'Search through documentation',
        search: { useEntityDataAsSearchText: true },
        documentId: 'tools',
      })
    })

    test('should extract resource entities from resources file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'resources.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      expect(result.mcpEntities).toBeDefined()
      expectEntityCounts(result, { init: 1, resource: 2 })

      const readme = entitiesOfKind(result, 'resource').find(r => r.title === 'readme')
      expectEntity(readme, {
        kind: 'resource',
        mcpEndpoint: MCP_ENDPOINT,
        description: 'Project README file',
        search: { useEntityDataAsSearchText: true },
        documentId: 'resources',
      })
    })

    test('should extract prompt entities from prompts file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'prompts.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      expect(result.mcpEntities).toBeDefined()
      expectEntityCounts(result, { init: 1, prompt: 2 })

      const summarize = entitiesOfKind(result, 'prompt').find(p => p.title === 'summarize')
      expectEntity(summarize, {
        kind: 'prompt',
        mcpEndpoint: MCP_ENDPOINT,
        description: 'Summarize the given text',
        search: { useEntityDataAsSearchText: true },
        documentId: 'prompts',
      })
    })

    test('should extract init entity from init file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
        ],
      })

      expect(result.mcpEntities).toBeDefined()
      expectEntityCounts(result, { init: 1 })

      const init = entitiesOfKind(result, 'init').find(i => i.title === 'init')
      // init title is always the fixed 'init' label, even though init.json declares its own `title`
      expectEntity(init, {
        kind: 'init',
        title: 'init',
        description: '',
        mcpEndpoint: MCP_ENDPOINT,
        search: { useEntityDataAsSearchText: true },
        documentId: 'init',
      })
    })

    test('should prefer the source title and default a missing description to empty', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools-title.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })
      expectEntityCounts(result, { init: 1, tool: 2 })

      // source `title` wins over the name fallback
      const withTitle = entitiesOfKind(result, 'tool').find(t => t.mcpEntityId === 'mcp-tool-with_title')
      expect(withTitle?.title).toBe('Nice Title')

      // no title → title falls back to the name; no description → empty string
      const noDesc = entitiesOfKind(result, 'tool').find(t => t.mcpEntityId === 'mcp-tool-no_desc')
      expect(noDesc?.title).toBe('no_desc')
      expect(noDesc?.description).toBe('')
    })
  })

  describe('Entity payload', () => {
    test('should build the tool entity data as a complete tool item wrapped in tools array', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      const tool = entitiesOfKind(result, 'tool').find(t => t.title === 'search_docs')
      expect(tool?.data).toEqual(SEARCH_DOCS_TOOL_PAYLOAD)
    })

    test('should build the resource entity data as a complete resource item wrapped in resources array', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'resources.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      const readme = entitiesOfKind(result, 'resource').find(r => r.title === 'readme')
      expect(readme?.data).toEqual({
        resources: [{
          uri: 'file:///docs/readme.md',
          name: 'readme',
          description: 'Project README file',
          mimeType: 'text/markdown',
        }],
      })
    })

    test('should build the prompt entity data as a complete prompt item wrapped in prompts array', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'prompts.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      const summarize = entitiesOfKind(result, 'prompt').find(p => p.title === 'summarize')
      expect(summarize?.data).toEqual({
        prompts: [{
          name: 'summarize',
          description: 'Summarize the given text',
          arguments: [
            { name: 'text', description: 'Text to summarize', required: true },
            { name: 'max_length', description: 'Maximum length of summary', required: false },
          ],
        }],
      })
    })

    test('should keep the init entity data as the complete raw init object (no wrapper)', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
        ],
      })

      const init = entitiesOfKind(result, 'init').find(i => i.title === 'init')
      expect(init?.data).toEqual({
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true },
          logging: {},
        },
        protocolVersion: '2025-11-25',
        serverInfo: { name: 'test-mcp-server', version: '1.0.0' },
        title: 'Server Display Title',
        instructions: 'This is a test MCP server for unit testing.',
      })
    })
  })

  describe('All four types together', () => {
    test('should build, publish and serialize all MCP entity types', async () => {
      const registry = LocalRegistry.openPackage('mcp-build')
      const editor = createMcpEditor(registry)

      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          { fileId: 'resources.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          { fileId: 'prompts.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      expect(result.documents.size).toBe(4)
      expect(result.mcpEntities).toBeDefined()
      expectEntityCounts(result, { init: 1, tool: 2, resource: 2, prompt: 2 })
      expect(result.operations.size).toBe(0)

      await registry.publishPackage(result, editor.builder.builderContext(editor.config), editor.config)

      // mcp.json — the lightweight index, grouped by kind, with payloads (`data`) stripped out
      const index = await loadJsonFromRegistry(VERSIONS_PATH, 'mcp-build/v1', 'mcp.json')
      expect(index.inits).toHaveLength(1)
      expect(index.tools).toHaveLength(2)
      expect(index.resources).toHaveLength(2)
      expect(index.prompts).toHaveLength(2)

      const searchDocs = index.tools.find((t: PackageMcpEntity) => t.title === 'search_docs')
      expect(searchDocs).toMatchObject({
        mcpEntityId: 'mcp-tool-search_docs',
        kind: 'tool',
        title: 'search_docs',
        description: 'Search through documentation',
        mcpEndpoint: MCP_ENDPOINT,
      })
      expect(searchDocs).not.toHaveProperty('data')

      // mcp/{id}.json — the full element payload lives here, not in the index
      const payload = await loadJsonFromRegistry(VERSIONS_PATH, 'mcp-build/v1/mcp', searchDocs.mcpEntityId)
      expect(payload).toEqual(SEARCH_DOCS_TOOL_PAYLOAD)

      // every documentId is a document slug, never a fileId
      const documents = await loadJsonFromRegistry(VERSIONS_PATH, 'mcp-build/v1', 'documents.json')
      const slugs = documents.documents.map((document: { slug: string }) => document.slug)
      const entities: PackageMcpEntity[] = [...index.inits, ...index.tools, ...index.resources, ...index.prompts]
      for (const entity of entities) {
        expect(slugs).toContain(entity.documentId)
      }
    }, 30000)
  })

  describe('Capabilities validation', () => {
    test('should warn when init declares capability but no entities found', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      const warnings = warningNotificationsOf(result.notifications)
      expect(warnings.some(w => w.message.includes('\'resources\'') && w.message.includes('no resource entities'))).toBe(true)
      expect(warnings.some(w => w.message.includes('\'prompts\'') && w.message.includes('no prompt entities'))).toBe(true)
      expect(warnings.some(w => w.message.includes('\'tools\''))).toBe(false)
    })

    test('should not warn when all capabilities matched', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          { fileId: 'resources.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          { fileId: 'prompts.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      const warnings = warningNotificationsOf(result.notifications)
      expect(warnings).toHaveLength(0)
    })

    test('should report every document of an endpoint that has no init', async () => {
      const editor = createMcpEditor()
      // entities with no init describe an incomplete MCP server → publish must fail, and the endpoint is
      // published by both documents, so both are told
      const result = await editor.run({
          files: [
            { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
            { fileId: 'resources.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          ],
        })
      expectReportedErrors(result, /MCP init is required/)
      expect(result.notifications
        .filter(({ message }) => /MCP init is required/.test(message))
        .map(({ documentId }) => documentId)
        .sort()).toEqual(['resources', 'tools'])
    })

    test('should report an endpoint without an init even when another endpoint has one', async () => {
      const editor = createMcpEditor()
      // /mcp/a has its own init, /mcp/b publishes tools but no init → publish must fail even though
      // another endpoint does have an init (each endpoint needs its own init)
      const result = await editor.run({
          files: [
            initFile('/mcp/a'),
            { fileId: 'tools.json', metadata: { mcpEndpoint: '/mcp/b' } },
          ],
        })
      expectReportedErrors(result, /endpoint '\/mcp\/b' publishes entities but has no init/)
    })
  })

  describe('Duplicate detection', () => {
    test('should report a duplicate name within a single file', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools-duplicate-name.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      // intra-document: caught per entity, so the entity that failed is the only thing lost — the first
      // `search` is built and the document keeps it, and the failure is reported once
      const errors = errorNotificationsOf(result.notifications)
      expect(errors.map(({ category }) => category)).toEqual([MESSAGE_CATEGORY.McpEntityBuild])
      expect(errors[0].message).toMatch(/Duplicate MCP entity ID/)
      expect(entitiesOfKind(result, 'tool').map(({ description }) => description)).toEqual(['First search tool'])

      // the collision is in the document's own content, so the text names the document as DDL's twin does —
      // a `fileId` belongs in a message only when it is the thing the user edits, which here it is not
      const { slug } = documentOf(result, 'tools-duplicate-name.json')
      expect(errors[0].message).toContain(`in document '${slug}'`)
      expect(errors[0].message).not.toContain('tools-duplicate-name.json')
    })

    test('should report a duplicate entity id across files sharing an endpoint', async () => {
      const editor = createMcpEditor()
      // both files declare a tool named "search" → same id under the same endpoint
      const result = await editor.run({
        files: [
          initFile(),
          { fileId: 'tools-same-name.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          { fileId: 'tools-same-name-2.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      // cross-document: one notification per involved document, and both keep their entities
      // exactly two errors, one per involved document — no third copy from another site
      const errors = errorNotificationsOf(result.notifications)
      expect(errors.map(({ category }) => category))
        .toEqual([MESSAGE_CATEGORY.McpDuplicateEntity, MESSAGE_CATEGORY.McpDuplicateEntity])
      expect(errors.map(({ documentId }) => documentId).sort())
        .toEqual(['tools-same-name', 'tools-same-name-2'])
    })

    test('should not collide when the same tool name is under different endpoints', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          initFile('/mcp/a'),
          initFile('/mcp/b', 'init-b.json'),
          { fileId: 'tools-same-name.json', metadata: { mcpEndpoint: '/mcp/a' } },
          { fileId: 'tools-same-name-2.json', metadata: { mcpEndpoint: '/mcp/b' } },
        ],
      })

      expectEntityCounts(result, { init: 2, tool: 2 })
      const ids = entitiesOfKind(result, 'tool').map(t => t.mcpEntityId)
      expect(new Set(ids).size).toBe(2)
    })
  })

  describe('Validation', () => {
    test('should report a document with no mcpEndpoint', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
          files: [
            { fileId: 'tools.json' },
          ],
        })
      expectReportedErrors(result, /mcpEndpoint/)
    })

    // The endpoint is checked twice: `buildMcpEntities` rejects the document, and the whole-set pass checks
    // it again for callers that run alone. A build must still report it once.
    test('should report a missing mcpEndpoint once', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({ files: [{ fileId: 'tools.json' }] })

      const endpointErrors = result.notifications.filter(({ message }) => /missing required metadata.mcpEndpoint/.test(message))
      expect(endpointErrors).toHaveLength(1)
    })

    test('should report a tool that violates the schema (missing inputSchema)', async () => {
      const editor = createMcpEditor()
      // schema conformance is mandatory and fatal — a tool missing the required inputSchema breaks publish
      const result = await editor.run({
          files: [
            initFile(),
            { fileId: 'tools-missing-inputschema.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          ],
        })
      expectReportedErrors(result, /does not conform to protocolVersion/)

      // the document failed against the schema, so the text names it the way the notification does — by slug.
      // A `fileId` belongs in a message only when it points at something other than the attributed document.
      const failure = result.notifications.find(({ message }) => /does not conform to protocolVersion/.test(message))!
      expect(failure.message).toContain(`document '${failure.documentId}'`)
      expect(failure.message).not.toContain('tools-missing-inputschema.json')

      // the check runs after the document's entities are indexed, and nothing un-indexes them: the version
      // publishes what the document built and says what is wrong with it
      expect([...result.mcpEntities.values()].some(({ documentId }) => documentId === failure.documentId)).toBe(true)
    })

    test('should report a list item that violates the schema (item without a name)', async () => {
      const editor = createMcpEditor()
      // one valid tool + one nameless tool: the nameless item violates the schema → the whole publish
      // fails (invalid input is not silently dropped)
      const result = await editor.run({
          files: [
            initFile(),
            { fileId: 'tools-partial-invalid.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          ],
        })
      expectReportedErrors(result, /does not conform to protocolVersion/)
    })

    test('should report a list document whose every item is invalid', async () => {
      const editor = createMcpEditor()
      // every item is dropped at extraction, but the raw document is still schema-validated against its
      // endpoint's protocolVersion — so an all-invalid list breaks publish (invalid input is not silently
      // dropped), independent of whether any entity was extracted.
      const result = await editor.run({
          files: [
            initFile(),
            { fileId: 'tools-all-invalid.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          ],
        })
      expectReportedErrors(result, /does not conform to protocolVersion/)
    })

    test('should report an init that declares an unsupported protocolVersion', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
          files: [
            { fileId: 'init-unsupported-version.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
          ],
        })
      expectReportedErrors(result, /unsupported protocolVersion '9999-01-01'/)
    })
  })

  describe('Multiple endpoints', () => {
    test('should publish entities from different endpoints into one mcp.json', async () => {
      const registry = LocalRegistry.openPackage('mcp-build')
      const editor = createMcpEditor(registry)

      // both files declare a tool named "search" — distinct endpoints keep their ids apart
      const result = await editor.run({
        files: [
          initFile('/mcp/a'),
          initFile('/mcp/b', 'init-b.json'),
          { fileId: 'tools-same-name.json', metadata: { mcpEndpoint: '/mcp/a' } },
          { fileId: 'tools-same-name-2.json', metadata: { mcpEndpoint: '/mcp/b' } },
        ],
      })
      expectEntityCounts(result, { init: 2, tool: 2 })

      await registry.publishPackage(result, editor.builder.builderContext(editor.config), editor.config)

      const index = await loadJsonFromRegistry(VERSIONS_PATH, 'mcp-build/v1', 'mcp.json')
      expect(index.tools).toHaveLength(2)
      const ids = index.tools.map((t: PackageMcpEntity) => t.mcpEntityId)
      expect(new Set(ids).size).toBe(2)
      const endpoints = index.tools.map((t: PackageMcpEntity) => t.mcpEndpoint)
      expect(new Set(endpoints)).toEqual(new Set(['/mcp/a', '/mcp/b']))
    }, 30000)

    test('should validate each endpoint against the protocolVersion its own init declares', async () => {
      const editor = createMcpEditor()
      // /mcp/a runs 2024-11-05, /mcp/b runs 2025-11-25 — both build, each validated against its version
      const result = await editor.run({
        files: [
          initFile('/mcp/a', 'init-v2024.json'),
          initFile('/mcp/b', 'init-b.json'),
          { fileId: 'tools-same-name.json', metadata: { mcpEndpoint: '/mcp/a' } },
          { fileId: 'tools-same-name-2.json', metadata: { mcpEndpoint: '/mcp/b' } },
        ],
      })

      expectEntityCounts(result, { init: 2, tool: 2 })
    })
  })

  describe('Mixed with operations', () => {
    test('should build MCP entities and REST operations from the same package', async () => {
      const editor = createMcpEditor()
      const result = await editor.run({
        files: [
          { fileId: 'simple-rest-api-for-mixed.json' },
          initFile(),
          { fileId: 'tools.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
        ],
      })

      // REST operations and MCP entities coexist, each routed by its own builder
      const operations = Array.from(result.operations.values())
      expect(operations).toHaveLength(1)
      expect(operations[0].apiType).toBe(REST_API_TYPE)
      expectEntityCounts(result, { init: 1, tool: 2 })
    })
  })
})
