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
  ANY_ASYNCAPI_CHANGE,
  ANY_DDL_SPEC,
  ANY_GRAPHQL_CHANGE,
  ANY_REST_CHANGE,
  buildWithApiProcessorVersionOverrides,
  contentEditor,
  DocumentChange,
  Editor,
  LocalRegistry,
  notificationsErrorOf,
  prepareChangelogFromContent,
  publishChangeFromContent,
  rejectionOf,
} from './helpers'
import {
  ASYNCAPI_API_TYPE,
  BUILD_TYPE,
  GRAPHQL_API_TYPE,
  MESSAGE_CATEGORY,
  MESSAGE_SEVERITY,
  REST_API_TYPE,
  VERSION_STATUS,
} from '../src/consts'
import { AdmZipTool } from '../src/components/adm-zip-tool'
import { createVersionPackage, ZipTool } from '../src/components/package'
import { compareVersionsDdl } from '../src/components/compare/compare.ddl'
import { compareDocuments as compareRestDocuments } from '../src/apitypes/rest/rest.changes'
import { compareDocuments as compareGraphqlDocuments } from '../src/apitypes/graphql/graphql.changes'
import { compareDocuments as compareAsyncDocuments } from '../src/apitypes/async/async.changes'
import {
  BuilderContext,
  BuildResult,
  BuildType,
  CompareOperationsPairContext,
  DocumentsCompare,
  OperationsApiType,
  VersionStatus,
} from '../src/types'
import { PackageVersionBuilder } from '../src/processor'
import { NotificationsError } from '../src/errors'

// The other half of tolerant publication: the problems that still abort the build. Every case here used to
// throw and must keep throwing — a notification instead would either publish nothing useful or bury a
// deployment defect that is untraceable afterwards. A `build` or `changelog` that fails after it has started
// carries what it had reported on the error.

const BEFORE = 'v1'
const AFTER = 'v2'

// a build that lists no files, for the checks on the config itself
const configOnlyEditor = (): Editor => contentEditor({ packageId: 'fatal-failures/config-only', version: BEFORE }, {})

/**
 * Publish a before/after pair and compare the two documents against an empty operation index. The index is built
 * by the caller of `compareDocuments`, so an empty one is exactly the internal inconsistency the throw guards: the
 * pair has a changed operation, and the index that drives the comparison does not know it.
 */
async function compareAgainstEmptyIndex(
  packageId: string,
  apiType: OperationsApiType,
  extension: string,
  change: DocumentChange,
  compareDocuments: DocumentsCompare,
): Promise<unknown> {
  const registry = await publishChangeFromContent(packageId, change, { extension })

  const [prevDoc] = (await registry.versionDocumentsResolver(BEFORE, packageId))!.documents
  const [currDoc] = (await registry.versionDocumentsResolver(AFTER, packageId))!.documents

  // only the fields the compare functions read before reaching the lookup; the rest is never touched
  const ctx = {
    apiType,
    notifications: [],
    rawDocumentResolver: registry.rawDocumentResolver.bind(registry),
    previousVersion: BEFORE,
    currentVersion: AFTER,
    previousPackageId: packageId,
    currentPackageId: packageId,
  } as unknown as CompareOperationsPairContext

  return compareDocuments({}, prevDoc, currDoc, ctx)
}

describe('An operation missing from the documents pair aborts the comparison', () => {
  test('should stay fatal for rest', async () => {
    await expect(compareAgainstEmptyIndex(
      'fatal-failures/empty-index-rest',
      REST_API_TYPE,
      'yaml',
      ANY_REST_CHANGE,
      compareRestDocuments,
    )).rejects.toThrow(/Can't find the .* operation from documents pair/)
  }, 30000)

  test('should stay fatal for graphql', async () => {
    await expect(compareAgainstEmptyIndex(
      'fatal-failures/empty-index-graphql',
      GRAPHQL_API_TYPE,
      'gql',
      ANY_GRAPHQL_CHANGE,
      compareGraphqlDocuments,
    )).rejects.toThrow(/Can't find the .* operation from documents pair/)
  }, 30000)

  test('should stay fatal for asyncapi', async () => {
    await expect(compareAgainstEmptyIndex(
      'fatal-failures/empty-index-asyncapi',
      ASYNCAPI_API_TYPE,
      'yaml',
      ANY_ASYNCAPI_CHANGE,
      compareAsyncDocuments,
    )).rejects.toThrow(/Can't find the .* operation from documents pair/)
  }, 30000)
})

describe('A missing DDL compare hook aborts the comparison', () => {
  test('should stay fatal when DDL documents have no compareDdlDocuments registered', async () => {
    const packageId = 'fatal-failures/ddl'
    const registry = new LocalRegistry(packageId)
    for (const version of [BEFORE, AFTER]) {
      await registry.publishFromContent(
        { 'widgets.sql': ANY_DDL_SPEC },
        { packageId, version, files: [{ fileId: 'widgets.sql' }] },
      )
    }

    const ctx = {
      notifications: [],
      ...registry.versionResolvers,
      apiBuilders: [],
    } as unknown as Parameters<typeof compareVersionsDdl>[2]

    await expect(compareVersionsDdl([BEFORE, packageId], [AFTER, packageId], ctx))
      .rejects.toThrow(/no DDL compare hook/)
  }, 30000)
})

// The missing `packageId` and `version` halves live in `config.test.ts`; this is the third rule of the same
// check, and the one with nothing to publish even in principle.
describe('An invalid build config aborts the build', () => {
  test('should reject a build with neither files nor refs', async () => {
    const editor = configOnlyEditor()
    await expect(editor.run({ version: BEFORE, buildType: BUILD_TYPE.BUILD, files: [], refs: [] }))
      .rejects.toThrow(/Got no files and refs/)
  })

  // A changelog is the comparison and nothing else: with no baseline there is nothing to compute, so this
  // fails before any work rather than publishing an empty changelog with no explanation.
  test('should reject a changelog build with no previousVersion', async () => {
    const editor = configOnlyEditor()
    await expect(editor.run({ version: AFTER, buildType: BUILD_TYPE.CHANGELOG, previousVersion: undefined } as never))
      .rejects.toThrow(/A changelog build requires previousVersion/)
  })

  // the config failure replaced a notification, so the retired category must not come back with it
  test('should keep previous-version-missing out of the categories', () => {
    expect(Object.values(MESSAGE_CATEGORY)).not.toContain('previous-version-missing')
  })

  // prefix-groups-changelog compares one version against itself across two prefix groups, so it has no
  // baseline by design and the rule above must not reach it
  test('should accept a prefix-groups-changelog build with no previousVersion', async () => {
    const editor = configOnlyEditor()
    await expect(editor.run({
      version: AFTER,
      buildType: BUILD_TYPE.PREFIX_GROUPS_CHANGELOG,
      previousVersion: undefined,
    } as never)).resolves.toBeDefined()
  })

  test('should accept a changelog that has a baseline', async () => {
    const editor = await prepareChangelogFromContent('fatal-failures/changelog-with-baseline', ANY_REST_CHANGE)

    await expect(editor.run({ status: VERSION_STATUS.DRAFT })).resolves.toBeDefined()
  }, 30000)

  // with no build type `validateConfig` lets the config through and the build strategy rejects it; that is still
  // before the build starts, so the error carries no notifications
  test('should throw the plain error for a build with neither files nor refs and no build type', async () => {
    const builder = new PackageVersionBuilder({
      packageId: 'fatal-failures/no-files-no-type',
      version: AFTER,
      status: VERSION_STATUS.DRAFT,
      files: [],
      refs: [],
    } as never, { resolvers: {} })

    const error = await rejectionOf(builder.run())

    expect(error).toEqual(new Error('Incorrect config: No files and refs'))
    expect(error).not.toBeInstanceOf(NotificationsError)
  })
})

// A host that wires no resolver has a deployment defect, not a content one: it breaks identically for every
// build, so a notification would only bury it.
describe('A missing host resolver aborts the build', () => {
  test('should stay fatal for a changelog with no versionResolver', async () => {
    const builder = new PackageVersionBuilder({
      packageId: 'fatal-failures/no-version-resolver',
      version: AFTER,
      previousVersionPackageId: 'fatal-failures/no-version-resolver',
      previousVersion: BEFORE,
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.DRAFT,
    }, { resolvers: { fileResolver: () => Promise.resolve(null) } })

    await expect(builder.run()).rejects.toThrow(/No versionResolver provided/)
  })
})

// v1 and v2 of a REST change under a package of the test's own, for a changelog of v2 against v1
const publishRestPair = (packageId: string): Promise<LocalRegistry> => publishChangeFromContent(packageId, ANY_REST_CHANGE)

// spy on the registry before calling this: the editor binds the registry's resolvers when it is created
const restPairChangelogEditor = (packageId: string, registry: LocalRegistry): Editor => new Editor(packageId, {
  packageId,
  version: AFTER,
  previousVersion: BEFORE,
  status: VERSION_STATUS.DRAFT,
  buildType: BUILD_TYPE.CHANGELOG,
} as never, {}, registry)

describe('A packaging failure aborts the build', () => {
  afterEach(() => { jest.restoreAllMocks() })

  const DISK_FULL = 'disk is full'

  const failArchiveWrites = (): void => {
    jest.spyOn(AdmZipTool.prototype, 'file').mockImplementation(() => {
      throw new Error(DISK_FULL)
    })
  }

  // no partial archive: the error replaces it. No `buildType`, so the packager treats it as a `build`; the draft
  // has a broken document and a baseline that does not resolve, so each stream holds a message
  test('should carry both streams of a build when the archive cannot be written', async () => {
    const project = 'tolerant-publication'
    const editor = new Editor(project, {
      packageId: 'fatal-failures/packaging-failure',
      version: AFTER,
      previousVersion: 'no-such-version',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'rest.json' }, { fileId: 'broken-async.yaml' }],
    } as never, {}, LocalRegistry.openPackage(project))
    await editor.run()
    failArchiveWrites()

    const error = await notificationsErrorOf(editor.createNodeVersionPackage())

    expect(error.notifications).toContainEqual(expect.objectContaining({ severity: MESSAGE_SEVERITY.Error }))
    expect(error.comparisonNotifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.VersionNotResolved }),
    ])
  }, 30000)

  test('should carry the comparison stream of a changelog', async () => {
    const packageId = 'fatal-failures/changelog-packaging-failure'
    const registry = await publishRestPair(packageId)
    // the host lists no references, so the root pair carries a message
    jest.spyOn(registry, 'versionReferencesResolver').mockResolvedValue(null as never)
    const editor = restPairChangelogEditor(packageId, registry)
    await editor.run()
    failArchiveWrites()

    const error = await notificationsErrorOf(editor.createNodeVersionPackage())

    expect(error.comparisonNotifications)
      .toContainEqual(expect.objectContaining({ category: MESSAGE_CATEGORY.VersionRefsNotResolved }))
  }, 30000)

  // two export documents, so the archive is written rather than the single document returned as it is
  test('should throw the plain error of an export', async () => {
    const buildType = BUILD_TYPE.EXPORT_VERSION
    const buildResult = {
      config: { buildType },
      comparisons: [],
      ddlComparisons: [],
      documents: new Map(),
      exportDocuments: [
        { filename: '1.yaml', data: new Blob(['a']) },
        { filename: '2.yaml', data: new Blob(['b']) },
      ],
      notifications: [],
      comparisonNotifications: [],
    } as unknown as BuildResult
    const zip: ZipTool = {
      file: () => Promise.reject(new Error(DISK_FULL)),
      folder: () => zip,
      buildResult: () => Promise.resolve(null),
    }
    const ctx = { config: { buildType } } as unknown as BuilderContext

    const error = await rejectionOf(createVersionPackage(buildResult, zip, ctx))

    expect(error).toEqual(new Error(DISK_FULL))
    expect(error).not.toBeInstanceOf(NotificationsError)
  })
})

// The stored api-processor version is what the host holds for a published version. A mismatch means the
// changelog would be computed across two different processors and quietly come out partial, so it aborts —
// the same for a changelog and for a build that carries `previousVersion`, released or draft.
describe('An api-processor version mismatch aborts the build whatever it is building', () => {
  const cases: Array<[string, BuildType, VersionStatus]> = [
    ['changelog', BUILD_TYPE.CHANGELOG, VERSION_STATUS.RELEASE],
    ['release-build', BUILD_TYPE.BUILD, VERSION_STATUS.RELEASE],
    ['draft-build', BUILD_TYPE.BUILD, VERSION_STATUS.DRAFT],
  ]

  test.each(cases)('should stay fatal for a %s', async (name, buildType, status) => {
    await expect(buildWithApiProcessorVersionOverrides(`fatal-failures/mismatch-${name}`, { v1: '99.0.0' }, { buildType, status }))
      .rejects.toThrow(/previous version was built using an outdated api-processor/)
  }, 30000)
})

// A failed build writes no archive, so the error is the only way the messages collected before the failure
// reach the client
describe('A fatal failure carries what the build reported before it', () => {
  afterEach(() => { jest.restoreAllMocks() })

  const STORAGE_FAILURE = 'file storage is unreachable'

  // the build copies the root pair's array into `comparisonNotifications` only after the document loop, so a
  // fatal inside the loop leaves the baseline's message in that array alone
  test('should carry both streams when the document loop fails', async () => {
    // `missing.yaml` resolves to nothing, which the build reports and survives; `unreachable.yaml` rejects, which
    // aborts the build once every file has settled
    const builder = new PackageVersionBuilder({
      packageId: 'fatal-failures/storage-failure',
      version: AFTER,
      previousVersion: 'no-such-version',
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'missing.yaml' }, { fileId: 'unreachable.yaml' }],
    }, {
      resolvers: {
        versionResolver: () => Promise.resolve(null),
        fileResolver: (fileId: string) => (fileId === 'missing.yaml'
          ? Promise.resolve(null)
          : Promise.reject(new Error(STORAGE_FAILURE))),
      },
    })

    const error = await notificationsErrorOf(builder.run())

    expect(error.notifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.FileNotParsed, documentId: 'missing' }),
    ])
    expect(error.comparisonNotifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.VersionNotResolved }),
    ])
  })

  // `compareVersions` throws before it returns the root pair, so the changelog's own array is the only holder
  // of the baseline's messages
  test('should carry the messages of the baseline when a changelog fails inside the comparison', async () => {
    const packageId = 'fatal-failures/changelog-comparison-failure'
    const registry = await publishRestPair(packageId)
    // the host lists no references, then goes down
    jest.spyOn(registry, 'versionReferencesResolver').mockResolvedValue(null as never)
    jest.spyOn(registry, 'versionOperationsResolver').mockRejectedValue(new Error(STORAGE_FAILURE))

    const error = await notificationsErrorOf(restPairChangelogEditor(packageId, registry).run())

    // one message per side of the pair: neither version has a reference list
    expect(error.comparisonNotifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.VersionRefsNotResolved }),
      expect.objectContaining({ category: MESSAGE_CATEGORY.VersionRefsNotResolved }),
    ])
  }, 30000)

  // the failing file rejects first and a slower file reports afterwards; the build waits for every file, so the
  // report is on the failure whatever the timing
  test('should carry what a slower file reports after another file failed', async () => {
    const builder = new PackageVersionBuilder({
      packageId: 'fatal-failures/storage-failure-race',
      version: AFTER,
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'unreachable.yaml' }, { fileId: 'late.yaml' }],
    }, {
      resolvers: {
        fileResolver: (fileId: string) => (fileId === 'late.yaml'
          ? new Promise(resolve => setTimeout(() => resolve(null), 20))
          : Promise.reject(new Error(STORAGE_FAILURE))),
      },
    })

    const error = await notificationsErrorOf(builder.run())

    expect(error.notifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.FileNotParsed, documentId: 'late' }),
    ])
  })

  // a parse problem is reported only after every file has built, once the version knows which documents it
  // publishes; a failing file must not drop the problems of the files that did build
  test('should carry the parse problems of the files that built when another file failed', async () => {
    const builder = new PackageVersionBuilder({
      packageId: 'fatal-failures/storage-failure-parse',
      version: AFTER,
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'broken.json' }, { fileId: 'unreachable.yaml' }],
    }, {
      resolvers: {
        fileResolver: (fileId: string) => (fileId === 'broken.json'
          ? Promise.resolve(new File(['{ "openapi": "3.0.0", "info": '], 'broken.json', { type: 'application/json' }))
          : Promise.reject(new Error(STORAGE_FAILURE))),
      },
    })

    const error = await notificationsErrorOf(builder.run())

    expect(error.message).toBe(STORAGE_FAILURE)
    expect(error.notifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.ParseFile, documentId: 'broken' }),
    ])
  })
})
