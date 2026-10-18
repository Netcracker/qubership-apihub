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
  changelogEditor,
  contentEditor,
  Editor,
  expectNotEmpty,
  LocalRegistry,
  notificationsErrorOf,
  publishChangeFromContent,
} from './helpers'
import { BUILD_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY, PACKAGE, VERSION_STATUS } from '../src/consts'
import * as transformToDto from '../src/utils/transformToDto'
import { toVersionsComparisonDto } from '../src/utils/transformToDto'
import { BuildConfig, BuildResult, VersionStatus } from '../src/types'
import { NotificationMessage } from '../src/types/package/notifications'
import { assertReleaseIsPublishable, comparisonPhaseNotifications } from '../src/components/release-gate'

const error = (message: string, documentId?: string): NotificationMessage => ({
  category: MESSAGE_CATEGORY.BuildDocument,
  severity: MESSAGE_SEVERITY.Error,
  message,
  ...documentId ? { documentId } : {},
})

const warning = (message: string): NotificationMessage => ({
  category: MESSAGE_CATEGORY.DoubleSlashPath,
  severity: MESSAGE_SEVERITY.Warning,
  message,
})

const gate = (status: string, build: NotificationMessage[], changelog: NotificationMessage[] = []): () => void =>
  () => assertReleaseIsPublishable(status, build, changelog)

const HINT = 'You can publish version in draft status for troubleshooting'

// v2 of a package whose v1 is published, built against v1 but not yet packaged. A build compares the
// `after.yaml` it builds with the published `v1`; a standalone changelog reads both versions from the registry,
// so both are published either way
const buildAgainstPrevious = async (
  packageId: string,
  status: VersionStatus,
  buildType: typeof BUILD_TYPE.BUILD | typeof BUILD_TYPE.CHANGELOG = BUILD_TYPE.BUILD,
): Promise<{ editor: Editor; buildResult: BuildResult }> => {
  const registry = await publishChangeFromContent(packageId, ANY_REST_CHANGE)
  const editor = buildType === BUILD_TYPE.CHANGELOG
    ? changelogEditor(packageId, registry)
    : contentEditor(
      { packageId, version: 'v2', previousVersion: 'v1', status, buildType },
      { 'after.yaml': ANY_REST_CHANGE.after },
      registry,
    )
  // a changelog editor is a release by default; the status given here decides for both paths
  return { editor, buildResult: await editor.run({ status }) }
}

describe('Release gate', () => {
  test('should let a draft publish whatever the errors are', () => {
    expect(gate(VERSION_STATUS.DRAFT, [error('broken', 'petstore')], [error('bad changelog')])).not.toThrow()
  })

  test('should not block a release on warnings alone', () => {
    expect(gate(VERSION_STATUS.RELEASE, [warning('double slash')], [warning('risky')])).not.toThrow()
  })

  describe('The message names the specific problem', () => {
    test('should report a single attributed error with its document and the hint', () => {
      expect(gate(VERSION_STATUS.RELEASE, [error('Duplicated operationId', 'orders')]))
        .toThrow(`Duplicated operationId (document: orders). ${HINT}`)
    })

    test('should report a single unattributed error without the document clause', () => {
      expect(gate(VERSION_STATUS.RELEASE, [], [error('No such version')]))
        .toThrow(`No such version. ${HINT}`)
    })

    test('should summarise several document errors with a distinct sorted slug list', () => {
      expect(gate(VERSION_STATUS.RELEASE, [error('a', 'orders'), error('b', 'billing'), error('c', 'orders')]))
        .toThrow(`Cannot publish version in release status: 3 critical errors in following documents: billing, orders. ${HINT}`)
    })

    test('should name the changelog share in a mixed failure', () => {
      expect(gate(VERSION_STATUS.RELEASE, [error('a', 'orders')], [error('b', 'billing'), error('c')]))
        .toThrow(`Cannot publish version in release status: 3 critical errors in following documents: billing, orders, including 2 changelog errors. ${HINT}`)
    })

    // Every build-phase Error is expected to name a document, but nothing in the types enforces it: the
  // wording has to hold when one does not.
  test('should not offer an empty document list when a build error names none', () => {
    expect(() => assertReleaseIsPublishable(VERSION_STATUS.RELEASE, [
      { category: MESSAGE_CATEGORY.BuildDocument, severity: MESSAGE_SEVERITY.Error, message: 'one' },
      { category: MESSAGE_CATEGORY.BuildDocument, severity: MESSAGE_SEVERITY.Error, message: 'two' },
    ], []))
      .toThrow('Cannot publish version in release status: 2 critical errors. You can publish version in draft status for troubleshooting')
  })

  test('should give a changelog-only failure its own wording and no document list', () => {
      expect(gate(VERSION_STATUS.RELEASE, [], [error('a'), error('b')]))
        .toThrow(`Cannot publish version in release status: 2 critical errors in the changelog. ${HINT}`)
    })

    // a comparison error may name a document; the form still turns on which stream failed, not on whether
    // anything was attributed, or the wording reads "in these documents, all of them in the changelog"
    test('should keep the changelog-only wording when a comparison error names a document', () => {
      expect(gate(VERSION_STATUS.RELEASE, [], [error('a', 'orders'), error('b')]))
        .toThrow(`Cannot publish version in release status: 2 critical errors in the changelog. ${HINT}`)
    })
  })
})

// A migration republishes a historical version with its original status, so it meets the gate on the same
// terms as any other release. The one thing that lets such a version through is that a migration config
// carries no `brokenRefs`, so broken references arrive as `Warning`.
// The gate runs twice: once after the document loop and once after the comparison. The first is the reason a
// doomed release does not pay for a changelog it will never publish, and nothing else in the suite would
// notice if it were removed.
describe('The early checkpoint', () => {
  afterEach(() => { jest.restoreAllMocks() })

  // a release whose documents already carry an Error, with a baseline it would otherwise compare against
  test('should refuse a release with a broken document before any comparison runs', async () => {
    const project = 'tolerant-publication'
    // its own package id: the version directory is shared state, and other suites publish this project too
    const packageId = 'tolerant-publication/early-checkpoint'
    const registry = LocalRegistry.openPackage(project)
    await registry.publish(project, { packageId, version: 'v1', status: VERSION_STATUS.DRAFT })

    // the comparison phase is the only caller of this resolver, so an untouched spy means it never started
    const comparisonWork = jest.spyOn(registry, 'versionOperationsResolver')
    const editor = new Editor(project, {
      packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'rest.json' }, { fileId: 'broken-async.yaml' }],
    }, {}, registry)

    await expect(editor.run()).rejects.toThrow(/You can publish version in draft status/)
    expect(comparisonWork).not.toHaveBeenCalled()
  }, 60000)
})

describe('Release gate and migration builds', () => {
  const migrationConfig = (status: VersionStatus): Partial<BuildConfig> & Record<string, unknown> => ({
    status,
    // api-processor never reads this field — the test states that absence of an exemption is deliberate
    migrationBuild: true,
  })

  // the same broken version republished by a migration, once as a release and once as a draft
  test('should gate a migration release on the same terms as any other release', async () => {
    // its own package id: another suite owns the `tolerant-publication` version directory
    const packageId = 'tolerant-publication/migration'
    const registry = LocalRegistry.openPackage('tolerant-publication')
    await expect(registry.publish('tolerant-publication', { packageId, ...migrationConfig(VERSION_STATUS.RELEASE) }))
      .rejects.toThrow(/You can publish version in draft status/)

    const result = await registry.publish('tolerant-publication', { packageId, ...migrationConfig(VERSION_STATUS.DRAFT) })
    expect(result.notifications.some(({ severity }) => severity === MESSAGE_SEVERITY.Error)).toBe(true)
  }, 30000)

  test('should let a migration release through when its only problems are broken references', async () => {
    // no `validationRulesSeverity` in the config, which is what a migration build arrives with
    const pkg = LocalRegistry.openPackage('reference-bundling/case2')
    const result = await pkg.publish(pkg.packageId, migrationConfig(VERSION_STATUS.RELEASE))

    const refProblems = result.notifications.filter(({ category }) => category.startsWith('ref-'))
    expectNotEmpty(refProblems)
    expect(refProblems.every(({ severity }) => severity === MESSAGE_SEVERITY.Warning)).toBe(true)
    // the build completed and nothing is flagged, so the historical version stays rebuildable
    expect(result.notifications.some(({ severity }) => severity === MESSAGE_SEVERITY.Error)).toBe(false)
  }, 30000)
})

// A malformed diff breaks api-diff's output contract rather than anything a document says, so
// `comparison-serialization` is a `Warning`: the publisher has nothing to fix, and the version publishes with
// the message on the comparison that produced it.
describe('A malformed diff in a published comparison', () => {
  afterEach(() => { jest.restoreAllMocks() })

  test.each<[string, VersionStatus]>([
    ['release', VERSION_STATUS.RELEASE],
    ['draft', VERSION_STATUS.DRAFT],
  ])('should let a %s publish, reporting the malformed diff as a warning', async (_name, status) => {
    const { editor, buildResult } = await buildAgainstPrevious(`release-gate/malformed-diff/${status}`, status)
    const serialize = toVersionsComparisonDto
    jest.spyOn(transformToDto, 'toVersionsComparisonDto')
      .mockImplementation((comparison, cache, reportProblem) => {
        reportProblem('Add diff has undefined afterValueNormalized')
        return serialize(comparison, cache, reportProblem)
      })

    const zip = await JSZip.loadAsync(await editor.createVersionPackage())
    expect(buildResult.comparisons.flatMap(({ notifications }) => notifications)).toContainEqual({
      category: MESSAGE_CATEGORY.ComparisonSerialization,
      severity: MESSAGE_SEVERITY.Warning,
      message: 'Add diff has undefined afterValueNormalized',
    })

    // the consumer-visible half of Warning: an unflagged comparison is one a dashboard changelog can still be
    // built on, since `assertReferencesAreSound` aborts on a reference whose comparison has errors
    const { comparisons } = JSON.parse(await zip.file(PACKAGE.COMPARISONS_FILE_NAME)!.async('string')) as {
      comparisons: Array<Record<string, unknown>>
    }
    // without it the `every` below passes on an empty list
    expectNotEmpty(comparisons)
    expect(comparisons.every(comparison => !('hasErrors' in comparison))).toBe(true)
  }, 30000)
})

// The gate in `BuildStrategy` runs before the archive is written, so `createVersionPackage` gates the
// comparison stream again. Nothing raised while packaging is an `Error` today, so the mock plays the part of
// the first one that will be. Its category is borrowed from the comparison phase, where that category really
// does carry an `Error`; `comparison-serialization` would state a pair the reporter no longer produces.
describe('An error raised while the archive is written', () => {
  afterEach(() => { jest.restoreAllMocks() })

  const PACKAGING_ERROR = 'Comparison cannot be packaged'

  const raiseErrorWhilePackaging = (): void => {
    const serialize = toVersionsComparisonDto
    jest.spyOn(transformToDto, 'toVersionsComparisonDto')
      .mockImplementation((comparison, cache, reportProblem) => {
        comparison.notifications.push({
          category: MESSAGE_CATEGORY.VersionNotResolved,
          severity: MESSAGE_SEVERITY.Error,
          message: PACKAGING_ERROR,
        })
        return serialize(comparison, cache, reportProblem)
      })
  }

  test('should fail a release', async () => {
    const { editor } = await buildAgainstPrevious('release-gate/packaging-error/release', VERSION_STATUS.RELEASE)
    raiseErrorWhilePackaging()

    const error = await notificationsErrorOf(editor.createNodeVersionPackage())

    // the gate's text, unchanged by the wrap: it is what the client sends to the backend
    expect(`${error}`).toBe(`Error: ${PACKAGING_ERROR}. ${HINT}`)
    expect(error.comparisonNotifications).toContainEqual(expect.objectContaining({ message: PACKAGING_ERROR }))
  }, 30000)

  test('should let a draft publish', async () => {
    const { editor } = await buildAgainstPrevious('release-gate/packaging-error/draft', VERSION_STATUS.DRAFT)
    raiseErrorWhilePackaging()

    const { packageVersion } = await editor.createNodeVersionPackage()
    const zip = await JSZip.loadAsync(packageVersion)
    const { comparisons } = JSON.parse(await zip.file(PACKAGE.COMPARISONS_FILE_NAME)!.async('string'))
    expect(comparisons.map(({ hasErrors }: { hasErrors?: boolean }) => hasErrors)).toEqual([true])
  }, 30000)

  // the standalone changelog's own suite explains why it is never gated; this case pins the packager's side
  test('should not gate a standalone changelog of a release version', async () => {
    const { editor } = await buildAgainstPrevious(
      'release-gate/packaging-error/changelog', VERSION_STATUS.RELEASE, BUILD_TYPE.CHANGELOG)
    raiseErrorWhilePackaging()

    await expect(editor.createNodeVersionPackage()).resolves.toBeDefined()
  }, 30000)
})

// The unit tests above check what the gate decides; this one checks that `BuildStrategy` asks it about the
// comparison stream at all, and that the refusal carries the stream's message.
describe('A release whose comparison phase raises an error', () => {
  test('should fail the build', async () => {
    // a baseline that does not resolve is the cheapest comparison-phase error a document can produce
    const editor = contentEditor({
      packageId: 'release-gate/unresolved-baseline/build',
      version: 'v2',
      previousVersion: 'no-such-version',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
    }, { 'spec.yaml': ANY_REST_SPEC })

    const error = await notificationsErrorOf(editor.run())

    expect(`${error}`).toMatch(/^Error: No such version: .*You can publish version in draft status for troubleshooting$/)
    // with no comparison, the build copies the root pair's array into `comparisonNotifications`, and the error
    // carries the message once
    expect(error.comparisonNotifications).toEqual([
      expect.objectContaining({ category: MESSAGE_CATEGORY.VersionNotResolved }),
    ])
  }, 30000)
})

// A standalone changelog recalculates the changes of a version that is already published, so its `status`
// describes that version rather than a publication being attempted. `ChangelogStrategy` does not gate:
// gating would leave a version with an unreliable changelog impossible to recalculate.
describe('A standalone changelog of a release version', () => {
  test('should recalculate although its comparison stream carries errors', async () => {
    const packageId = 'release-gate/unresolved-baseline/changelog'
    const registry = new LocalRegistry(packageId)
    await registry.publishFromContent(
      { 'spec.yaml': ANY_REST_SPEC },
      { packageId, version: 'v1', files: [{ fileId: 'spec.yaml' }] },
    )

    // a baseline that does not resolve is the cheapest comparison-phase error a document can produce
    const editor = contentEditor({
      packageId,
      version: 'v2',
      previousVersion: 'no-such-version',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.CHANGELOG,
    }, { 'spec.yaml': ANY_REST_SPEC }, registry)
    const buildResult = await editor.run()

    expect(buildResult.comparisons.flatMap(({ notifications }) => notifications)).toContainEqual(
      expect.objectContaining({
        category: MESSAGE_CATEGORY.VersionNotResolved,
        severity: MESSAGE_SEVERITY.Error,
      }),
    )
    await expect(editor.createNodeVersionPackage()).resolves.toBeDefined()
  }, 30000)
})

// A version pair's operation and DDL comparisons share one notifications array (`CompareContext.forPair`), so
// the comparison-phase stream is collected by array identity. Concatenating instead counts one problem twice.
describe('Comparison-phase notifications are collected once per array', () => {
  const message: NotificationMessage = {
    category: MESSAGE_CATEGORY.ComparisonSerialization,
    severity: MESSAGE_SEVERITY.Error,
    message: 'one problem',
  }

  test('should count a shared array once, however many comparisons hold it', () => {
    const shared = [message]
    const collected = comparisonPhaseNotifications({
      comparisonNotifications: [],
      comparisons: [{ notifications: shared }],
      ddlComparisons: [{ notifications: shared }],
    })

    expect(collected).toEqual([message])
  })

  test('should keep the arrays that are genuinely different', () => {
    const other: NotificationMessage = { ...message, message: 'another problem' }
    const collected = comparisonPhaseNotifications({
      comparisonNotifications: [],
      comparisons: [{ notifications: [message] }],
      ddlComparisons: [{ notifications: [other] }],
    })

    expect(collected).toEqual([message, other])
  })
})

