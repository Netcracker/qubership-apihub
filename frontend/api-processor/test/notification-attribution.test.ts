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
import JSZip from 'jszip'
import {
  ANY_REST_CHANGE,
  ANY_REST_SPEC,
  buildChangelogFromContent,
  contentEditor,
  Editor,
  errorNotificationsOf,
  notificationsInCategory,
  loadJsonFromRegistry,
  LocalRegistry,
  publishChangeFromContent,
  publishDashboardWithTwoRefs,
  publishVersion,
  VERSIONS_PATH,
  expectNotEmpty,
} from './helpers'
import { BUILD_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY, PACKAGE, VERSION_STATUS } from '../src/consts'
import { BuildConfig, BuildResult } from '../src/types'
import { buildComparisonNotifications } from '../src/components/build-result-index'
import { toVersionsComparisonDto } from '../src/utils/transformToDto'
import { PackageVersionBuilder } from '../src/builder'

// Whole-result invariants over the notification contract. They hold for every build, so any raising site
// that forgets a category or ships a fileId where a slug belongs fails here rather than in production.
describe('Notification attribution invariants', () => {
  const publish = (projectId: string, files: string[]): Promise<BuildResult> =>
    publishVersion(projectId, 'v1', files)

  // The flag says whether the case raises a build-phase `Error`; none of the three does today, and the
  // attribution test below asserts nothing on a case that raises none, so it pins which is which.
  const CASES: Array<[string, () => Promise<BuildResult>, boolean]> = [
    // a document whose references do not resolve — the `ref-*` family comes from this one site
    ['broken references', () => LocalRegistry.openPackage('reference-bundling/case2').publish('reference-bundling/case2'), false],
    // a path that fails validation — `double-slash-path`
    ['invalid paths', () => publish('operation-id-collisions/double-slash-in-path', ['spec.json']), false],
    // the same operationId in two documents — `duplicate-operation-id`, the one cross-document case today
    ['duplicate operation ids', () => publish('operation-id-collisions/same-path-different-documents', ['spec1.json', 'spec2.json']), false],
  ]

  const KNOWN_CATEGORIES = new Set<string>(Object.values(MESSAGE_CATEGORY))

  test.each(CASES)('should carry a known category on every notification — %s', async (_name, build) => {
    const result = await build()

    expectNotEmpty(result.notifications)
    for (const { category } of result.notifications) {
      expect(KNOWN_CATEGORIES.has(category)).toBe(true)
    }
  })

  test.each(CASES)('should use a document slug for every documentId — %s', async (_name, build) => {
    const result = await build()
    const slugs = new Set([...result.documents.values()].map(({ slug }) => slug))

    // Skipping the unattributed ones inside the loop hid the case this test cares about least but
    // relies on most: with nothing attributed at all, there is no documentId to check against a slug.
    const attributed = result.notifications
      .map(({ documentId }) => documentId)
      .filter((documentId): documentId is string => documentId !== undefined)
    expectNotEmpty(attributed)

    for (const documentId of attributed) {
      expect(slugs.has(documentId)).toBe(true)
    }
  })

  // the release-failure message relies on this: an attributed error always has a document to name
  test.each(CASES)('should attribute every build-phase Error to a document — %s', async (_name, build, raisesError) => {
    const result = await build()

    const errors = errorNotificationsOf(result.notifications)
    expect(errors.length > 0).toBe(raisesError)
    expect(errors.filter(({ documentId }) => documentId === undefined)).toEqual([])
  })
})

// The invariants above run on the in-memory result. The archive is what actually ships, and a message can be
// routed correctly and still never be serialised — so assert them again on the published files.
describe('Notification invariants hold in the published archive', () => {
  test('should categorise every notification in notifications.json and name a real document', async () => {
    const packageId = 'operation-id-collisions/same-path-different-documents'
    await publishVersion(packageId, 'v1', ['spec1.json', 'spec2.json'])

    const versionPath = `${packageId}/v1`
    const notifications = (await loadJsonFromRegistry(VERSIONS_PATH, versionPath, 'notifications.json')).notifications as Array<{ category: string; severity: number; documentId?: string }>
    const documents = (await loadJsonFromRegistry(VERSIONS_PATH, versionPath, 'documents.json')).documents as Array<{ slug: string }>

    const slugs = new Set(documents.map(({ slug }) => slug))
    const known = new Set<string>(Object.values(MESSAGE_CATEGORY))

    expectNotEmpty(notifications)
    for (const notification of notifications) {
      expect(known.has(notification.category)).toBe(true)
      expect(notification).not.toHaveProperty('fileId')
      if (notification.severity === MESSAGE_SEVERITY.Error) {
        expect(notification.documentId).toBeDefined()
      }
      if (notification.documentId !== undefined) {
        expect(slugs.has(notification.documentId)).toBe(true)
      }
    }
  }, 30000)

  test('should keep notifications out of comparisons.json — they live in their own file', async () => {
    const result = await buildChangelogFromContent('attribution/dto-without-notifications', ANY_REST_CHANGE)
    expectNotEmpty(result.comparisons)

    // the DTO deliberately drops the field; a leak would duplicate the dedicated file, unsorted
    const dto = toVersionsComparisonDto(result.comparisons[0], new WeakMap(), () => undefined)
    expect(dto).not.toHaveProperty('notifications')
  })
})

// The two streams are separated by which context produced the message, not by a decision at the call site.
describe('Notification stream routing', () => {
  test('should mark the comparison, not the version, when the previous version is missing', async () => {
    const packageId = 'attribution/missing-baseline-routing'
    const registry = new LocalRegistry(packageId)
    await registry.publishFromContent(
      { 'rest.json': ANY_REST_SPEC },
      { packageId, version: 'v1', files: [{ fileId: 'rest.json' }] },
    )

    const editor = new Editor(packageId, {
      packageId,
      version: 'v1',
      previousVersion: 'no-such-version',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.NONE,
    }, {}, registry)
    const result = await editor.run()

    // the baseline could not be resolved — a comparison problem, so it belongs to the comparison stream, and
    // within it to the pair whose baseline it is: the build-level array reaches no file
    const onPairs = result.comparisons.flatMap(({ notifications }) => notifications)
    expect(onPairs.map(({ category }) => category)).toContain(MESSAGE_CATEGORY.VersionNotResolved)
    expect(result.comparisonNotifications).toEqual([])
    // asserted empty rather than free of this one category: a standalone changelog builds no documents, so
    // this array is empty and a category check over it could not fail. The empty array is the contract —
    // `Which notification files a build writes` below asserts the changelog ships no notifications file
    expect(result.notifications).toEqual([])
  })

  test('should empty the arrays in place so a context built earlier keeps writing to the live one', async () => {
    const builder = new PackageVersionBuilder(
      {
        packageId: 'attribution/clear-caches',
        version: 'v1',
        status: VERSION_STATUS.RELEASE,
        buildType: BUILD_TYPE.BUILD,
      },
      { resolvers: {} } as never,
    )

    const { notifications, comparisonNotifications } = builder
    builder.clearCaches()

    expect(builder.notifications).toBe(notifications)
    expect(builder.comparisonNotifications).toBe(comparisonNotifications)
  })
})

// Every comparison-phase message belongs to exactly one version pair, so each comparison owns its array.
describe('Comparison notifications belong to a version pair', () => {
  afterEach(() => { jest.restoreAllMocks() })

  // The changelog strategy and the pair's operation and DDL comparisons each resolve the same baseline, so the
  // failure arrives three times. Each pair still reports independently — what must not happen is the same pair
  // reporting twice, which would double the count in the release-failure message and store two identical rows.
  test('should report one unresolvable baseline once per pair, not once per comparison kind', async () => {
    const packageId = 'attribution/no-duplicate-resolver-failure'
    const registry = new LocalRegistry(packageId)
    await registry.publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId, version: 'v2', files: [{ fileId: 'rest.json' }],
    })

    const result = await new Editor(packageId, {
      packageId,
      version: 'v2',
      previousVersionPackageId: packageId,
      previousVersion: 'no-such-version',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.DRAFT,
    } as never, {}, registry).run()

    // one pair, and it reports the unresolvable baseline exactly once — not once per comparison kind
    expect(result.comparisons.map(({ notifications }) =>
      notificationsInCategory(notifications, MESSAGE_CATEGORY.VersionNotResolved).length))
      .toEqual([1])
  }, 60000)

  // One version reached by several pairs is reported by each of them. This works because the resolvers cache
  // successes only, so the second pair calls the host again instead of inheriting a cached miss.
  //
  // The message has to be a Warning to be observable at all: an `Error` on a reference comparison aborts the
  // dashboard build (`ref-comparison-has-errors`), so a multi-pair `Error` never reaches an archive.
  test('should report the same unresolvable version from every pair that hits it', async () => {
    const dashboard = await publishDashboardWithTwoRefs('dashboards/pckg1', 'dashboards/pckg2')

    // the baseline side of every pair loses its documents at once
    const original = (LocalRegistry.prototype as unknown as { versionDocumentsResolver: unknown }).versionDocumentsResolver
    jest.spyOn(LocalRegistry.prototype, 'versionDocumentsResolver')
      .mockImplementation(async function (this: LocalRegistry, version: string, ...rest: unknown[]) {
        if (version === 'v1') { return null }
        return (original as (...a: unknown[]) => Promise<unknown>).call(this, version, ...rest)
      } as never)

    const result = await new Editor(dashboard.packageId, {
      packageId: dashboard.packageId,
      version: 'v2',
      previousVersionPackageId: dashboard.packageId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.DRAFT,
    } as never, {}, dashboard).run()

    const reporting = result.comparisons.filter(({ notifications }) =>
      notifications.some(({ category }) => category === MESSAGE_CATEGORY.VersionDocumentsMissing))
    expect(reporting.length).toBeGreaterThan(1)

    // each pair carries its own copy rather than sharing one array
    expect(new Set(reporting.map(({ notifications }) => notifications)).size).toBe(reporting.length)
  }, 60000)

  // one pair here, so this proves no comparison aliases the build-level arrays; the dashboard test above covers
  // two pairs
  test('should give each comparison its own array rather than a shared one', async () => {
    const result = await buildChangelogFromContent('attribution/own-arrays', ANY_REST_CHANGE)

    expectNotEmpty(result.comparisons)
    for (const comparison of result.comparisons) {
      expect(Array.isArray(comparison.notifications)).toBe(true)
      // aliasing the build-level array would put another pair's messages on this comparison
      expect(comparison.notifications).not.toBe(result.comparisonNotifications)
      expect(comparison.notifications).not.toBe(result.notifications)
    }
  })

  // Enumerating a pair's references happens before any reference pair exists, but the references being
  // enumerated are this pair's — so the failure belongs to it. Reported on the build-level array instead, the
  // message would reach no file: only per-pair arrays are serialized.
  test('should land a failure to enumerate references on the root pair, not the build-level array', async () => {
    const packageId = 'attribution/refs-not-resolved'
    const registry = new LocalRegistry(packageId)
    for (const version of ['v1', 'v2']) {
      await registry.publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
        packageId, version, files: [{ fileId: 'rest.json' }],
      })
    }

    // the host cannot list this version's references
    jest.spyOn(LocalRegistry.prototype, 'versionReferencesResolver').mockResolvedValue(null as never)

    const editor = new Editor(packageId, {
      packageId,
      version: 'v2',
      previousVersionPackageId: packageId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.DRAFT,
    } as never, {}, registry)
    const result = await editor.run()

    const onPairs = result.comparisons.flatMap(({ notifications }) => notifications)
    expect(onPairs.map(({ category }) => category)).toContain(MESSAGE_CATEGORY.VersionRefsNotResolved)
    expect(result.comparisonNotifications).toEqual([])
  }, 30000)
})

// The file groups by version pair; a flat list could not say which comparison a message belongs to.
describe('comparison-notifications.json', () => {
  test('should group by version pair and keep an entry per pair', () => {
    const pair = {
      packageId: 'shop', version: 'v3', revision: 3,
      previousVersionPackageId: 'shop', previousVersion: 'v2', previousVersionRevision: 7,
    }
    const shared = [{ category: MESSAGE_CATEGORY.VersionNotResolved, severity: MESSAGE_SEVERITY.Error, message: 'no such version' }]

    // the pair's operation and DDL comparisons share one array — they must collapse into one entry
    const grouped = buildComparisonNotifications([
      { ...pair, notifications: shared },
      { ...pair, notifications: shared },
      { ...pair, version: 'v4', notifications: [] },
      // resolved from the backend: no entry at all, or republish would wipe its stored rows
      { ...pair, version: 'v5', fromCache: true, notifications: [] },
    ] as never)

    // one entry per calculated pair, cached ones omitted
    expect(grouped.comparisons.map(({ version }) => version)).toEqual(['v3', 'v4'])
    // the pair identity and its messages, and nothing else: the comparison it came from carries the changelog
    expect(Object.keys(grouped.comparisons[0]).sort())
      .toEqual(['notifications', 'packageId', 'previousVersion', 'previousVersionPackageId', 'previousVersionRevision', 'revision', 'version'])
    expect(grouped.comparisons.find(entry => entry.version === 'v3')).toMatchObject({ ...pair, notifications: shared })
    expect(grouped.comparisons.find(entry => entry.version === 'v4')?.notifications).toEqual([])
  })

  // A baseline that does not resolve skips the changelog, so the failure has no comparison to travel on. It
  // still has a pair — the one the config asked for — and without the row it reaches no file at all.
  test('should row a message under the declared pair when the comparison never ran', async () => {
    // a draft: the unresolvable baseline is an Error, which refuses a release
    const packageId = 'attribution/declared-pair'
    const result = await new LocalRegistry(packageId).publishFromContent({ 'rest.json': ANY_REST_SPEC }, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      previousVersion: 'no-such-version',
      files: [{ fileId: 'rest.json' }],
    })
    expect(result.comparisons).toEqual([])

    const file = await loadJsonFromRegistry(VERSIONS_PATH, `${packageId}/v1`, 'comparison-notifications.json') as { comparisons: Array<{ previousVersion: string; notifications: Array<{ category: string }> }> }

    expect(file.comparisons).toHaveLength(1)
    expect(file.comparisons[0].previousVersion).toBe('no-such-version')
    expect(file.comparisons[0].notifications.map(({ category }) => category))
      .toEqual([MESSAGE_CATEGORY.VersionNotResolved])

    // the version's own file stays clear of it: a baseline is the comparison's problem, not the version's
    const notifications = (await loadJsonFromRegistry(VERSIONS_PATH, `${packageId}/v1`, 'notifications.json')).notifications as Array<{ category: string }>
    expect(notifications.map(({ category }) => category)).not.toContain(MESSAGE_CATEGORY.VersionNotResolved)
  }, 30000)
})


// The two files are not both written every time: a build with no baseline has no comparison to report on, and
// a consumer that replaces a version's rows from the archive must not be handed an empty list to replace them
// with. Which file exists is part of the contract, not an implementation detail.
describe('Which notification files a build writes', () => {
  const PACKAGE_ID = 'attribution/file-shapes'

  const entriesOf = async (editor: Editor): Promise<string[]> => {
    const zip = await JSZip.loadAsync(await editor.createVersionPackage())
    return Object.keys(zip.files).filter(name => !zip.files[name].dir)
  }

  // a changelog builds nothing and never reads these contents
  const build = (registry: LocalRegistry, config: Partial<BuildConfig> & Pick<BuildConfig, 'version'>): Editor =>
    contentEditor(
      { packageId: PACKAGE_ID, status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD, ...config },
      { 'after.yaml': ANY_REST_CHANGE.after },
      registry,
    )

  // a standalone changelog compares two versions that exist; a build rebuilds `v2` over the published one
  const publishBothVersions = (): Promise<LocalRegistry> => publishChangeFromContent(PACKAGE_ID, ANY_REST_CHANGE)

  test('should write no comparison file for a build with no baseline', async () => {
    const editor = build(new LocalRegistry(PACKAGE_ID), { version: 'v1' })
    await editor.run()

    const entries = await entriesOf(editor)
    expect(entries).toContain(PACKAGE.NOTIFICATIONS_FILE_NAME)
    expect(entries).not.toContain(PACKAGE.COMPARISON_NOTIFICATIONS_FILE_NAME)
  }, 60000)

  test('should write both files for a build that declares a previous version', async () => {
    const registry = await publishBothVersions()

    const editor = build(registry, { version: 'v2', previousVersion: 'v1' })
    await editor.run()

    const entries = await entriesOf(editor)
    expect(entries).toContain(PACKAGE.NOTIFICATIONS_FILE_NAME)
    expect(entries).toContain(PACKAGE.COMPARISON_NOTIFICATIONS_FILE_NAME)
  }, 60000)

  test('should write the comparison file for a standalone changelog', async () => {
    const registry = await publishBothVersions()

    const editor = build(registry, { version: 'v2', previousVersion: 'v1', buildType: BUILD_TYPE.CHANGELOG })
    const result = await editor.run()
    // both versions resolve, so the file carries a clean pair rather than an unresolvable baseline
    expect(result.comparisons.map(({ notifications }) => notifications)).toEqual([[]])

    const entries = await entriesOf(editor)
    expect(entries).toContain(PACKAGE.COMPARISON_NOTIFICATIONS_FILE_NAME)
    // and only that one: a changelog has no documents of its own, so an empty build stream must not ship —
    // the backend would take it for "this version has no notifications" and drop what a build recorded
    expect(entries).not.toContain(PACKAGE.NOTIFICATIONS_FILE_NAME)
  }, 60000)

  // The same argument covers the version's own content: a changelog recalculates the changes of a version
  // already published, so an empty index of documents or operations would describe that version as empty.
  test('should write no version content for a standalone changelog', async () => {
    const registry = await publishBothVersions()

    const editor = build(registry, { version: 'v2', previousVersion: 'v1', buildType: BUILD_TYPE.CHANGELOG })
    await editor.run()

    const entries = await entriesOf(editor)
    for (const name of [
      PACKAGE.DOCUMENTS_FILE_NAME,
      PACKAGE.OPERATIONS_FILE_NAME,
      PACKAGE.VERSION_INTERNAL_FILE_NAME,
    ]) {
      expect(entries).not.toContain(name)
    }
    // what the changelog does describe is still there
    expect(entries).toContain(PACKAGE.INFO_FILE_NAME)
  }, 60000)
})
