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

import JSZip from 'jszip'
import { Editor, LocalRegistry } from './helpers'
import {
  ApiOperation,
  BUILD_TYPE,
  BuildConfig,
  ChangeMessage,
  ComparisonInternalDocument,
  DiffTypeDto,
  MESSAGE_SEVERITY,
  NotificationMessage,
  PACKAGE,
  PackageComparisonOperation,
  PackageComparisonOperations,
  PackageComparisons,
  PackageDocuments,
  PackageOperations,
  VERSION_STATUS,
  VersionDocument,
} from '../src'
import {
  buildComparisonInternalDocumentsIndex,
  buildComparisonOperations,
  buildComparisonsIndex,
  buildDdlComparisonEntities,
  buildDdlComparisonsIndex,
  buildMcpFile,
  buildNotifications,
  buildPackageOperations,
  buildVersionInternalDocumentsIndex,
} from '../src/components/build-result-index'
import { DdlChangesDto, DdlComparisonDto, VersionsComparisonDto } from '../src/types/internal/compare'
import { MCP_KIND, McpEntity, McpEntityIndex, PackageMcpFile } from '../src/types/package/mcp'
import { PackageDdlFile } from '../src/types/package/ddl'

describe('Build result list ordering', () => {
  const readJsonFromZip = async <T>(zip: JSZip, name: string): Promise<T> => {
    const entry = zip.file(name)
    if (!entry) {
      throw new Error(`Cannot find ${name} in the build result`)
    }
    return JSON.parse(await entry.async('string')) as T
  }

  const buildEditor = (packageId: string, overrides: Partial<BuildConfig> = {}): Editor =>
    new Editor(packageId, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [],
      ...overrides,
    }, {}, LocalRegistry.openPackage(packageId))

  // before: assembly order — zebra-get, mango-get, apple-get / zeta.yaml, alpha.yaml
  // after:  apple-get, mango-get, zebra-get / alpha.yaml, zeta.yaml
  it('should serialize operations sorted by operationId and documents sorted by fileId', async () => {
    const editor = buildEditor('list-ordering')
    await editor.run({ files: [{ fileId: 'zeta.yaml', publish: true }, { fileId: 'alpha.yaml', publish: true }] })
    const zip = await JSZip.loadAsync(await editor.createVersionPackage())

    const { operations } = await readJsonFromZip<PackageOperations>(zip, PACKAGE.OPERATIONS_FILE_NAME)
    expect(operations.map(operation => operation.operationId)).toEqual(['apple-get', 'mango-get', 'zebra-get'])

    const { documents } = await readJsonFromZip<PackageDocuments>(zip, PACKAGE.DOCUMENTS_FILE_NAME)
    expect(documents.map(document => document.fileId)).toEqual(['alpha.yaml', 'zeta.yaml'])
  })

  // before: tools.json declaration order — search_docs, get_weather
  // after:  get_weather, search_docs
  it('should serialize mcp entity lists sorted by mcpEntityId', async () => {
    const editor = buildEditor('mcp-build')
    await editor.run({
      files: [
        { fileId: 'init.json', metadata: { mcpEndpoint: '/mcp' } },
        { fileId: 'tools.json', metadata: { mcpEndpoint: '/mcp' } },
      ],
    })
    const zip = await JSZip.loadAsync(await editor.createVersionPackage())

    const mcp = await readJsonFromZip<PackageMcpFile>(zip, PACKAGE.MCP_FILE_NAME)
    expect(mcp.tools.map(entity => entity.mcpEntityId)).toEqual(['mcp-tool-get_weather', 'mcp-tool-search_docs'])
  })

  // before: tables.sql declaration order — zebra, mango, apple
  // after:  apple, mango, zebra
  it('should serialize ddl tables sorted by ddlEntityId', async () => {
    const editor = buildEditor('list-ordering-ddl')
    await editor.run({ files: [{ fileId: 'tables.sql' }] })
    const zip = await JSZip.loadAsync(await editor.createVersionPackage())

    const ddl = await readJsonFromZip<PackageDdlFile>(zip, PACKAGE.DDL_FILE_NAME)
    expect(ddl.tables.map(entity => entity.ddlEntityId))
      .toEqual(['public-table-apple', 'public-table-mango', 'public-table-zebra'])
  })

  // before: spec.yaml declaration order — zebra-get, apple-get
  // after:  apple-get, zebra-get
  it('should serialize comparison operations ordered by (operationId, previousOperationId)', async () => {
    // ChangelogStrategy resolves BOTH sides from the registry, so both versions must be published first.
    const publish = async (packageId: string, version: string): Promise<void> => {
      await LocalRegistry.openPackage(packageId).publish(packageId, {
        packageId,
        version,
        status: VERSION_STATUS.RELEASE,
        files: [{ fileId: 'spec.yaml', publish: true }],
      })
    }
    await publish('list-ordering-before', 'v1')
    await publish('list-ordering-after', 'v2')

    const editor = buildEditor('list-ordering-after', { version: 'v2', buildType: BUILD_TYPE.CHANGELOG })
    await editor.run({
      files: [{ fileId: 'spec.yaml', publish: true }],
      previousVersionPackageId: 'list-ordering-before',
      previousVersion: 'v1',
    })
    const zip = await JSZip.loadAsync(await editor.createVersionPackage())

    const { comparisons } = await readJsonFromZip<PackageComparisons>(zip, PACKAGE.COMPARISONS_FILE_NAME)
    expect(comparisons).toHaveLength(1)
    const [{ comparisonFileId }] = comparisons
    expect(comparisonFileId).toBeDefined()
    const { operations } = await readJsonFromZip<PackageComparisonOperations>(
      zip,
      `${PACKAGE.COMPARISONS_DIR_NAME}/${comparisonFileId!}`,
    )
    // The after spec adds a 400 to /zebra and /apple → both operations changed, both sides present.
    expect(operations.map(operation => [operation.operationId ?? null, operation.previousOperationId ?? null]))
      .toEqual([['apple-get', 'apple-get'], ['zebra-get', 'zebra-get']])
  })
})

describe('Build result builders: deterministic sort', () => {
  // before: zzz(warning), aaa(warning), mmm(error) → after: mmm, aaa, zzz
  it('should sort notifications by (severity, message)', () => {
    const input: NotificationMessage[] = [
      { severity: MESSAGE_SEVERITY.Warning, message: 'zzz' },
      { severity: MESSAGE_SEVERITY.Warning, message: 'aaa' },
      { severity: MESSAGE_SEVERITY.Error, message: 'mmm' }, // Error=0 < Warning=1 → sorts first
    ]
    expect(buildNotifications(input).notifications.map(n => n.message)).toEqual(['mmm', 'aaa', 'zzz'])
  })

  // The key spans every field of NotificationMessage, so equal keys mean byte-identical rows.
  // before: b/-, a/z, a/a → after: a/a, a/z, b/-
  it('should fall through to fileId and operationId when severity and message match', () => {
    const input: NotificationMessage[] = [
      { severity: MESSAGE_SEVERITY.Warning, message: 'same', fileId: 'b' },
      { severity: MESSAGE_SEVERITY.Warning, message: 'same', fileId: 'a', operationId: 'z' },
      { severity: MESSAGE_SEVERITY.Warning, message: 'same', fileId: 'a', operationId: 'a', previousOperationId: 'p' },
    ]
    expect(buildNotifications(input).notifications.map(n => [n.fileId, n.operationId ?? null]))
      .toEqual([['a', 'a'], ['a', 'z'], ['b', null]])
  })

  // before: z, a → after: a, z
  it('should sort version internal documents index by id', () => {
    const docs = [
      { publish: true, versionInternalDocument: { versionDocumentId: 'z', serializedVersionDocument: '{}' } },
      { publish: true, versionInternalDocument: { versionDocumentId: 'a', serializedVersionDocument: '{}' } },
    ] as unknown as VersionDocument[]
    expect(buildVersionInternalDocumentsIndex(docs).documents.map(d => d.id)).toEqual(['a', 'z'])
  })

  // before: z, a → after: a, z
  it('should sort comparison internal documents index by id', () => {
    const docs = [
      { comparisonDocumentId: 'z', comparisonFileId: 'zf', serializedComparisonDocument: '{}' },
      { comparisonDocumentId: 'a', comparisonFileId: 'af', serializedComparisonDocument: '{}' },
    ] as unknown as ComparisonInternalDocument[]
    expect(buildComparisonInternalDocumentsIndex(docs).documents.map(d => d.id)).toEqual(['a', 'z'])
  })

  // Index row and data file share one filter, so an index entry can't point at a skipped file.
  // before: a, b (no content), c (not published) → after: a
  it('should skip internal documents that have no serialized content', () => {
    const versionDocs = [
      { publish: true, versionInternalDocument: { versionDocumentId: 'a', serializedVersionDocument: '{}' } },
      { publish: true, versionInternalDocument: { versionDocumentId: 'b' } },
      { publish: false, versionInternalDocument: { versionDocumentId: 'c', serializedVersionDocument: '{}' } },
    ] as unknown as VersionDocument[]
    expect(buildVersionInternalDocumentsIndex(versionDocs).documents.map(d => d.id)).toEqual(['a'])

    const comparisonDocs = [
      { comparisonDocumentId: 'a', comparisonFileId: 'af', serializedComparisonDocument: '{}' },
      { comparisonDocumentId: 'b', comparisonFileId: 'bf' },
    ] as unknown as ComparisonInternalDocument[]
    expect(buildComparisonInternalDocumentsIndex(comparisonDocs).documents.map(d => d.id)).toEqual(['a'])
  })

  // before: z, a (both with data) → after: a, z (data stripped)
  it('should sort comparisons index by comparison key and strip data', () => {
    const input = [
      { packageId: 'z', version: 'v1', previousVersionPackageId: 'p', previousVersion: 'v0', data: [{}] },
      { packageId: 'a', version: 'v1', previousVersionPackageId: 'p', previousVersion: 'v0', data: [{}] },
    ] as unknown as VersionsComparisonDto[]
    const out = buildComparisonsIndex(input)
    expect(out.comparisons.map(c => c.packageId)).toEqual(['a', 'z'])
    expect((out.comparisons[0] as { data?: unknown }).data).toBeUndefined()
  })

  // Rows sharing packageId fall through to version, then revision — revisions in numeric order.
  // before: v2@1, v1@10, v1@2 → after: v1@2, v1@10, v2@1
  it('should sort comparisons index by the later fields of the comparison key', () => {
    const row = (version: string, revision: number): VersionsComparisonDto =>
      ({ packageId: 'p', version, revision, previousVersionPackageId: 'p', previousVersion: 'v0' }) as unknown as VersionsComparisonDto
    const input = [row('v2', 1), row('v1', 10), row('v1', 2)]
    expect(buildComparisonsIndex(input).comparisons.map(c => `${c.version}@${c.revision}`))
      .toEqual(['v1@2', 'v1@10', 'v2@1'])
  })

  // Ids with separator-like chars order by code unit (`-` 0x2D < `.` 0x2E < `_` 0x5F). The encoded key
  // inverts that only for parts below 0x22 (a space), which ids don't carry.
  // before: a_b, a.b, a-b → after: a-b, a.b, a_b
  it('should order ids with special characters by code unit', () => {
    const input = ['a_b', 'a.b', 'a-b'].map(operationId =>
      ({ operationId, previousOperationId: operationId, changes: [] }) as unknown as PackageComparisonOperation)
    expect(buildComparisonOperations(input).operations.map(o => o.operationId)).toEqual(['a-b', 'a.b', 'a_b'])
  })

  // before: z, a → after: a, z
  it('should sort ddl comparisons index by comparison key', () => {
    const input = [
      { packageId: 'z', version: 'v1', previousVersionPackageId: 'p', previousVersion: 'v0', data: [{}] },
      { packageId: 'a', version: 'v1', previousVersionPackageId: 'p', previousVersion: 'v0', data: [{}] },
    ] as unknown as DdlComparisonDto[]
    expect(buildDdlComparisonsIndex(input).comparisons.map(c => c.packageId)).toEqual(['a', 'z'])
  })

  // before: z-get, a-get → after: a-get, z-get
  it('should sort comparison operations by (operationId, previousOperationId)', () => {
    const input = [
      { operationId: 'z-get', previousOperationId: 'z-get', changes: [] },
      { operationId: 'a-get', previousOperationId: 'a-get', changes: [] },
    ] as unknown as PackageComparisonOperation[]
    expect(buildComparisonOperations(input).operations.map(o => o.operationId)).toEqual(['a-get', 'z-get'])
  })

  // before: response/bbb, request/bbb, request/aaa → after: request/aaa, request/bbb, response/bbb
  it('should sort each comparison operation changes by calculateChangeId', () => {
    const change = (scope: string, currentValueHash: string): ChangeMessage<DiffTypeDto> =>
      ({ scope, severity: 'x', currentValueHash }) as unknown as ChangeMessage<DiffTypeDto>
    // Hashes come before scope in the id, so the pairs below prove both parts are part of the key.
    const changes = [change('response', 'bbb'), change('request', 'bbb'), change('request', 'aaa')]
    const op = { operationId: 'op', previousOperationId: 'op', changes } as unknown as PackageComparisonOperation
    const sorted = buildComparisonOperations([op]).operations[0].changes as { scope: string; currentValueHash: string }[]
    expect(sorted.map(c => [c.currentValueHash, c.scope]))
      .toEqual([['aaa', 'request'], ['bbb', 'request'], ['bbb', 'response']])
  })

  // Not sorted on purpose: the field keeps its source order (sorting versions as text gives v10 < v2).
  // before: v10, v2, v9 → after: v10, v2, v9 (unchanged)
  it('should keep deprecatedInPreviousVersions in source order', () => {
    const operations = new Map([
      ['op', { operationId: 'op', deprecatedInPreviousVersions: ['v10', 'v2', 'v9'] } as unknown as ApiOperation],
    ])
    expect(buildPackageOperations(operations).operations[0].deprecatedInPreviousVersions)
      .toEqual(['v10', 'v2', 'v9'])
  })

  // before: z, a — and the entity's own changes bbb, aaa → after: a, z with changes aaa, bbb
  it('should sort ddl comparison entities by ddlEntityId and their changes by calculateChangeId', () => {
    const change = (currentValueHash: string): unknown => ({ scope: 'ddl', severity: 'x', currentValueHash })
    const input = [
      { ddlEntityData: { ddlEntityId: 'z' }, changeSummary: {}, changes: [change('bbb'), change('aaa')] },
      { ddlEntityData: { ddlEntityId: 'a' }, changeSummary: {}, changes: [] },
    ] as unknown as DdlChangesDto[]
    const { entities } = buildDdlComparisonEntities(input)
    expect(entities.map(e => e.ddlEntityData?.ddlEntityId)).toEqual(['a', 'z'])
    expect((entities[1].changes as { currentValueHash: string }[]).map(c => c.currentValueHash)).toEqual(['aaa', 'bbb'])
  })

  // before: mcp-prompt-z, mcp-prompt-a → after: mcp-prompt-a, mcp-prompt-z
  it('should sort a non-tools mcp kind (prompts) by mcpEntityId', () => {
    const prompt = (mcpEntityId: string): McpEntity =>
      ({ mcpEntityId, kind: MCP_KIND.PROMPT, data: {} }) as unknown as McpEntity
    const index: McpEntityIndex = new Map([
      ['z', prompt('mcp-prompt-z')],
      ['a', prompt('mcp-prompt-a')],
    ])
    expect(buildMcpFile(index).prompts.map(e => e.mcpEntityId)).toEqual(['mcp-prompt-a', 'mcp-prompt-z'])
  })
})
