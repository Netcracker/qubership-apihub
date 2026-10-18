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

import { afterEach, describe, expect, jest, test } from '@jest/globals'
import {
  AFTER_VERSION_ID,
  ANY_REST_SPEC,
  BEFORE_VERSION_ID,
  changelogEditor,
  contentEditor,
  documentOf,
  expectNotEmpty,
  exportDocumentMatcher,
  exportDocumentsMatcher,
  loadFileAsStringFromRegistry,
  loadJsonFromRegistry,
  LocalRegistry,
  notificationMatcher,
  notificationOf,
  notificationsMatcher,
  publishVersion,
  VERSIONS_PATH,
} from './helpers'
import { BUILD_TYPE, FILE_FORMAT, MESSAGE_CATEGORY, MESSAGE_SEVERITY, VERSION_STATUS } from '../src/consts'
import { restApiBuilder, textApiBuilder, unknownApiBuilder } from '../src/apitypes'
import { dumpDocument } from '../src/components/document'
import { TEXT_DOCUMENT_TYPE } from '../src/apitypes/text/text.consts'
import { ASYNC_DOCUMENT_TYPE, ASYNC_FILE_FORMAT } from '../src/apitypes/async/async.consts'
import { GRAPHQL_DOCUMENT_TYPE, GRAPHQL_FILE_FORMAT } from '../src/apitypes/graphql/graphql.consts'
import { BuildResult } from '../src/types'
import * as restOperation from '../src/apitypes/rest/rest.operation'

/*
 * A document that could not be built is still published — the design's `Error documents must carry their
 * source`.
 *
 * Every failure on the way to a document reports instead of throwing, and whatever it leaves behind has to
 * survive packaging: the original bytes are the troubleshooting artifact, and a sourceless document must not
 * take the archive down with it.
 *
 * What such a document costs the version is `tolerant-publication.test.ts`; the category and severity of each
 * failure are rows in `notification-catalogue.test.ts`.
 */

describe('Error documents survive packaging', () => {
  test('a version whose only document fails to parse still produces a complete archive', async () => {
    const registry = LocalRegistry.openPackage('broken')
    const result = await registry.publish('broken', {
      packageId: 'broken',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'missing-brace.json', publish: true }],
    })

    const document = documentOf(result, 'missing-brace.json')

    const documents = await loadJsonFromRegistry(VERSIONS_PATH, 'broken/v1', 'documents.json')
    expect(documents.documents.map(({ fileId }: { fileId: string }) => fileId)).toEqual(['missing-brace.json'])

    // the archive carries the broken file itself — that is the troubleshooting artifact
    const raw = await loadFileAsStringFromRegistry(VERSIONS_PATH, 'broken/v1/documents', document.filename)
    expect(raw).toBeTruthy()
    expect(raw).toContain('openapi')
  }, 30000)
})

// The other flavour of error document: nothing was ever fetched, so there are no bytes to carry. It is still
// published — a document missing from the archive would leave the failure invisible to anyone browsing the
// version — and the entry it ships is empty.
describe('A document whose file could not be fetched', () => {
  // a version of two files, one of which the resolver cannot produce
  test('should publish an empty entry rather than skip the document or fail packaging', async () => {
    // its own package id: every publish in the run writes under the same versions root
    const packageId = 'error-documents/unfetchable-file'
    const result = await new LocalRegistry(packageId).publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'rest.json' }, { fileId: 'no-such-file.yaml' }],
    })

    const document = documentOf(result, 'no-such-file.yaml')
    expect(document.source).toBeUndefined()

    const documents = await loadJsonFromRegistry(VERSIONS_PATH, `${packageId}/v1`, 'documents.json')
    expect(documents.documents.map(({ fileId }: { fileId: string }) => fileId)).toContain('no-such-file.yaml')

    const raw = await loadFileAsStringFromRegistry(VERSIONS_PATH, `${packageId}/v1/documents`, document.filename)
    expect(raw).toBe('')
  }, 30000)
})

describe('Catch points report instead of aborting', () => {
  afterEach(() => { jest.restoreAllMocks() })

  // one healthy file and one the resolver has nothing for
  test('should report a file the resolver cannot produce and keep building the rest', async () => {
    const packageId = 'error-documents/unresolvable-file'
    const result = await new LocalRegistry(packageId).publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'rest.json' }, { fileId: 'no-such-file.yaml' }],
    })

    expect(result).toEqual(notificationsMatcher([
      notificationMatcher(MESSAGE_SEVERITY.Error, 'File was not parsed', {
        category: MESSAGE_CATEGORY.FileNotParsed,
        documentId: 'no-such-file',
      }),
    ]))
    // the healthy document still built
    expectNotEmpty(result.operations)
  }, 30000)

  // The placeholder has to carry the failed file's bytes. `parser.test.ts` proves it when the parser is what
  // failed; this covers the other route, where parsing succeeded and the document build threw, because the
  // placeholder is built from a different call there.
  test('should keep the original bytes when the document build itself throws', async () => {
    jest.spyOn(unknownApiBuilder, 'buildDocument').mockImplementation(() => {
      throw new Error('build exploded')
    })

    const pkg = LocalRegistry.openPackage('tolerant-publication')
    const result = await pkg.publish(pkg.packageId, {
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'broken-async.yaml' }],
    })

    const [document] = [...result.documents.values()]
    expect(document.source).toBeDefined()
    expect(await document.source!.text()).toContain('asyncapi')
  }, 30000)

  // The build failure and the parse complaints are independent diagnostics, and this is the only site that
  // emits the second kind. A build that threw is exactly when the reader needs both.
  test('should keep the parse errors of a document whose build threw', async () => {
    jest.spyOn(restApiBuilder, 'buildDocument').mockImplementation(() => {
      throw new Error('build exploded')
    })

    const packageId = 'reference-bundling/shared-broken-reference'
    const result = await publishVersion(packageId, 'v1', 'shared.yaml', { status: VERSION_STATUS.DRAFT })

    const categories = result.notifications.map(({ category }) => category)
    expect(categories).toContain(MESSAGE_CATEGORY.BuildDocument)
    expect(categories).toContain(MESSAGE_CATEGORY.InvalidTextFile)
    expect(result.notifications.every(({ documentId }) => documentId === 'shared')).toBe(true)
  }, 30000)

  // the api type's operation builder throws for the healthy REST document
  test('should report a document whose operations fail to build and keep the version', async () => {
    jest.spyOn(restApiBuilder, 'buildOperations').mockImplementation(() => {
      throw new Error('operations exploded')
    })

    const packageId = 'error-documents/operations-fail'
    const result = await new LocalRegistry(packageId).publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'rest.json' }],
    })

    const failure = notificationOf(result.notifications, MESSAGE_CATEGORY.BuildOperations)
    expect(failure).toMatchObject({
      severity: MESSAGE_SEVERITY.Error,
      message: expect.stringContaining('operations exploded'),
      documentId: 'rest',
    })
    // the throw cost the document its operations, not the version its documents
    expect(result.documents.has('rest.json')).toBe(true)
  }, 30000)
})

// The catch above the whole document is the outer of two. This one is per item: an operation the builder
// cannot produce is dropped on its own, and the document keeps everything else it built. The failed item also
// never reaches the intra-document duplicate check — an operationId nothing was built for cannot collide.
describe('An item that fails costs the document only that item', () => {
  afterEach(() => { jest.restoreAllMocks() })

  const throwFor = (predicate: (path: string) => boolean): void => {
    const build = restOperation.buildRestOperation
    jest.spyOn(restOperation, 'buildRestOperation').mockImplementation((...args) => {
      if (predicate(args[1])) { throw new Error('operation exploded') }
      return build(...args)
    })
  }

  test('should keep the operations of a document one of whose operations failed', async () => {
    throwFor(path => path === '/api/v1/resource')

    const pkg = LocalRegistry.openPackage('operation-id-collisions/same-operation-id-same-document')
    const result = await pkg.publish(pkg.packageId, {
      packageId: 'per-item/rest',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'spec.json' }],
    })

    expect(result.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: MESSAGE_CATEGORY.BuildOperations,
        severity: MESSAGE_SEVERITY.Error,
        message: expect.stringContaining('operation GET /api/v1/resource'),
        documentId: 'spec',
      }),
    ]))
    // the sibling operation of the same document is still in the version
    expect([...result.operations.values()].map(({ operationId }) => operationId)).toEqual(['api-v1-resource-get'])
  }, 30000)

  test('should not count an operation that failed towards a duplicate operationId', async () => {
    throwFor(path => path === '/api/v1/resource')

    const pkg = LocalRegistry.openPackage('operation-id-collisions/same-operation-id-same-document')
    const result = await pkg.publish(pkg.packageId, {
      packageId: 'per-item/rest-duplicate',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'spec.json' }],
    })

    // both paths derive `api-v1-resource`, but only one operation was built, so nothing collides
    expect(result.notifications.map(({ category }) => category))
      .not.toContain(MESSAGE_CATEGORY.RestDuplicateOperation)
  }, 30000)
})

// A file the version will not publish is not part of it, so its own failures are dropped rather than moved to
// the version. A file reached through a `$ref` is a different case: `reference-bundling.test.ts` covers it,
// and there the message names the document that pulled the file in.
describe('A file that will not be published', () => {
  test('should drop its failure rather than report it against the version', async () => {
    const packageId = 'error-documents/unpublished'
    const result = await new LocalRegistry(packageId).publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'rest.json' }, { fileId: 'no-such-file.yaml', publish: false }],
    })

    // nothing is reported: the file is not part of the version, so its problems cost the version nothing
    expect(result.notifications).toEqual([])

    const published = [...result.documents.values()].filter(({ publish }) => publish)
    expect(published.map(({ slug }) => slug)).toEqual(['rest'])
  }, 30000)

  // and the same file as a release, where a version-level Error would have refused the publication
  test('should let a release publish over it', async () => {
    const packageId = 'error-documents/unpublished-release'

    await expect(new LocalRegistry(packageId).publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'rest.json' }, { fileId: 'no-such-file.yaml', publish: false }],
    })).resolves.toBeDefined()
  }, 30000)
})


// A parser that recognized the file before it threw has already said what the file is. The placeholder keeps
// that type and format, so the version lists the document under its own API type rather than as `unknown`,
// and the archive still carries the bytes the publisher has to fix.
describe('A file its parser recognized and could not parse', () => {
  const FOLDER = 'tolerant-publication'

  const publishWithHealthyRest = (packageId: string, fileId: string): Promise<BuildResult> =>
    LocalRegistry.openPackage(FOLDER).publish(FOLDER, {
      packageId,
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'rest.json' }, { fileId }],
    })

  test.each([
    // the schema is syntactically sound and declares one field twice
    ['broken-graphql.graphql', 'graphql', GRAPHQL_DOCUMENT_TYPE.SCHEMA, GRAPHQL_FILE_FORMAT.GRAPHQL],
    // the YAML itself does not parse
    ['unparsable-async.yaml', 'asyncapi', ASYNC_DOCUMENT_TYPE.AAS3, ASYNC_FILE_FORMAT.YAML],
  ])('should publish %s as a %s document', async (fileId, apiType, type, format) => {
    const packageId = `error-documents/recognized-${apiType}`
    const result = await publishWithHealthyRest(packageId, fileId)

    const document = documentOf(result, fileId)
    expect(document).toMatchObject({ type, format, operationIds: [] })

    expect(result).toEqual(notificationsMatcher([
      notificationMatcher(MESSAGE_SEVERITY.Error, `Cannot parse file ${fileId}`, {
        category: MESSAGE_CATEGORY.ParseFile,
        documentId: document.slug,
      }),
    ]))

    const { documents } = await loadJsonFromRegistry<{ documents: Array<{ fileId: string }> }>(
      VERSIONS_PATH, `${packageId}/v1`, 'documents.json',
    )
    expect(documents.find((entry) => entry.fileId === fileId)).toMatchObject({ type, format, hasErrors: true })

    // the typed dumper has no model to print, so the archive entry has to be the file as it was uploaded
    const archived = await loadFileAsStringFromRegistry(VERSIONS_PATH, `${packageId}/v1/documents`, document.filename)
    expect(archived).toBe(await document.source!.text())

    // the healthy document still built
    expectNotEmpty(result.operations)
  }, 30000)

  // The document now sits in an API type that the comparison walks. It has no operations, so there is nothing
  // of it to compare, and both the inline comparison and a changelog build over the published pair complete.
  test.each([
    ['broken-graphql.graphql', 'graphql'],
    ['unparsable-async.yaml', 'asyncapi'],
  ])('should still compare a version that carries %s', async (fileId, apiType) => {
    const packageId = `error-documents/recognized-${apiType}-changelog`
    const registry = LocalRegistry.openPackage(FOLDER)
    await registry.publish(FOLDER, { packageId, version: BEFORE_VERSION_ID, files: [{ fileId: 'rest.json' }] })
    const published = await registry.publish(FOLDER, {
      packageId,
      version: AFTER_VERSION_ID,
      status: VERSION_STATUS.DRAFT,
      previousVersion: BEFORE_VERSION_ID,
      previousVersionPackageId: packageId,
      files: [{ fileId: 'rest.json' }, { fileId }],
    })
    expectNotEmpty(published.comparisons)

    const changelog = await changelogEditor(packageId, registry).run({ status: VERSION_STATUS.DRAFT })
    expectNotEmpty(changelog.comparisons)
  }, 60000)

  // The fallback is stored as the file it was read from, so an export must not give it the extension of the
  // JSON dump a built AsyncAPI document is stored as.
  test('should export an unparsable AsyncAPI YAML file under its own name', async () => {
    const packageId = 'error-documents/recognized-asyncapi-export'
    const registry = LocalRegistry.openPackage(FOLDER)
    await registry.publish(FOLDER, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'unparsable-async.yaml' }],
    })

    // no folder declares this package, and the export asks for its name to name the archive; the editor binds
    // the resolvers when it is created, so the spy comes first
    jest.spyOn(registry, 'packageResolver').mockResolvedValue({ packageId, name: 'Tolerant' })
    const editor = contentEditor({ packageId, version: 'v1' }, {}, registry)
    const result = await editor.run({ buildType: BUILD_TYPE.EXPORT_VERSION, format: FILE_FORMAT.JSON })

    expect(result).toEqual(exportDocumentsMatcher([exportDocumentMatcher('unparsable-async.yaml')]))
  }, 30000)
})

describe('A document without a model', () => {
  // A text document has no model by design and keeps its text in `description`; only a document whose parser
  // threw is dumped as the bytes it was read from.
  test('should still dump a text document with its own dumper', async () => {
    const document = {
      fileId: 'readme.md',
      filename: 'readme.md',
      type: TEXT_DOCUMENT_TYPE.MARKDOWN,
      data: '',
      description: '# Title',
      source: new Blob(['the file as it was read']),
    }

    const dumped = dumpDocument(document, textApiBuilder)

    expect(await dumped.text()).toBe('# Title')
  })
})
