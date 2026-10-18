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
import { describe, expect, it, jest } from '@jest/globals'
import { changelogEditor, contentEditor, Editor, LocalRegistry, publishDashboardWithTwoRefs, readJsonFromZip } from './helpers'
import {
  BUILD_TYPE,
  ChangeSummary,
  ComparisonKey,
  PACKAGE,
  PackageCachedComparisons,
  PackageComparisons,
  VERSION_STATUS,
} from '../src'
import { PackageVersionBuilder } from '../src/processor'
import { ResolvedComparisonSummary } from '../src/types/external/comparison'

const REF_CACHED = 'dashboards/pckg1'
const REF_CALCULATED = 'dashboards/pckg2'
const DASHBOARD = 'dashboards/dashboard'

const DDL_REF = 'cached-comparisons/ddl-ref'
const DDL_DASHBOARD = 'cached-comparisons/ddl-dashboard'
const DDL_ONLY = 'cached-comparisons/ddl-only'

const TABLE_V1 = 'CREATE TABLE widgets (id bigint PRIMARY KEY);'
const TABLE_V2 = 'CREATE TABLE widgets (id bigint PRIMARY KEY, label text);'

// The host answers with stored severities - `semi-breaking`, never `risky` - while the response type names
// them in their internal form, exactly as it does for `operationTypes`. Passing them through must not
// translate them a second time.
const DDL_SUMMARY = {
  breaking: 0,
  'semi-breaking': 0,
  deprecated: 0,
  'non-breaking': 1,
  annotation: 0,
  unclassified: 0,
} as unknown as ChangeSummary

// The identity it echoes is ignored: the builder keys the row off the reference.
const storedComparison = (refId: string): ResolvedComparisonSummary => ({
  packageId: refId,
  version: 'v2',
  revision: 1,
  previousVersion: 'v1',
  previousVersionPackageId: refId,
  previousVersionRevision: 1,
  operationTypes: [],
  noContent: false,
  contractsChangesSummary: { ddl: { changesSummary: DDL_SUMMARY, numberOfImpactedEntities: DDL_SUMMARY } },
})

const archiveOf = async (editor: Editor): Promise<JSZip> => {
  await editor.run()
  return await JSZip.loadAsync(await editor.createVersionPackage())
}

// Both dashboard versions carry both references, so every reference is a pair with two sides.
const buildDashboardChangelog = async (
  cachedRefIds: string[],
  answer: (refId: string) => ResolvedComparisonSummary = storedComparison,
): Promise<JSZip> => {
  await publishDashboardWithTwoRefs(REF_CACHED, REF_CALCULATED, DASHBOARD)

  const editor = changelogEditor(DASHBOARD)
  jest.spyOn(editor.builder as PackageVersionBuilder, 'versionComparisonResolver')
    .mockImplementation(async (_version, packageId) => (
      cachedRefIds.includes(packageId) ? answer(packageId) : null
    ))

  return await archiveOf(editor)
}

/** The test registry answers no comparison, so the DDL-bearing reference misses the cache. */
const buildDashboardWithDdlRef = async (): Promise<JSZip> => {
  const ref = LocalRegistry.openPackage(DDL_REF)
  await ref.publishFromContent({ 'shop.sql': TABLE_V1 },
    { packageId: DDL_REF, version: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] })
  await ref.publishFromContent({ 'shop.sql': TABLE_V2 },
    { packageId: DDL_REF, version: 'v2', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] })

  const dashboard = LocalRegistry.openPackage(DDL_DASHBOARD)
  for (const version of ['v1', 'v2']) {
    await dashboard.publishFromContent({},
      { packageId: DDL_DASHBOARD, version, buildType: BUILD_TYPE.BUILD, refs: [{ refId: DDL_REF, version }], files: [] })
  }

  return await archiveOf(changelogEditor(DDL_DASHBOARD))
}

const buildDdlOnlyChangelog = async (): Promise<JSZip> => {
  const pkg = LocalRegistry.openPackage(DDL_ONLY)
  await pkg.publishFromContent({ 'shop.sql': TABLE_V1 },
    { packageId: DDL_ONLY, version: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] })
  await pkg.publishFromContent({ 'shop.sql': TABLE_V2 },
    { packageId: DDL_ONLY, version: 'v2', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] })

  return await archiveOf(changelogEditor(DDL_ONLY))
}

/** A plain build has no previous version, so it compares nothing at all. */
const buildWithoutPreviousVersion = async (): Promise<JSZip> => {
  const editor = contentEditor(
    { packageId: 'cached-comparisons/plain', version: 'v1', buildType: BUILD_TYPE.BUILD, status: VERSION_STATUS.RELEASE },
    { 'shop.sql': TABLE_V1 },
  )
  return await archiveOf(editor)
}

const readCachedComparisons = async (zip: JSZip): Promise<ComparisonKey[]> =>
  (await readJsonFromZip<PackageCachedComparisons>(zip, PACKAGE.CACHED_COMPARISONS_FILE_NAME)).cachedComparisons

const pairsIn = async (zip: JSZip, fileName: string): Promise<string[]> =>
  (await readJsonFromZip<{ comparisons: Array<{ packageId: string }> }>(zip, fileName))
    .comparisons.map(({ packageId }) => packageId).sort()

describe('The list of comparisons reused from the host', () => {
  it('should record every reused pair and no others', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED])

    const cached = await readCachedComparisons(zip)
    expect(cached.map(({ packageId }) => packageId)).toEqual([REF_CACHED])
  })

  // The host keys the build's own pair off the build config, not off the row, so a key naming it matches
  // nothing there.
  it('should never record the pair the build was started for', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED, REF_CALCULATED])

    const cached = await readCachedComparisons(zip)
    expect(cached.map(({ packageId }) => packageId)).not.toContain(DASHBOARD)
    expect(cached).toHaveLength(2)
  })

  it('should key every record exactly as the matching comparison keys itself', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED])

    const cached = await readCachedComparisons(zip)
    const { comparisons } = await readJsonFromZip<PackageComparisons>(zip, PACKAGE.COMPARISONS_FILE_NAME)
    expect(cached).not.toHaveLength(0)

    for (const key of cached) {
      const matching = comparisons.filter(comparison =>
        comparison.packageId === key.packageId &&
        comparison.version === key.version &&
        comparison.revision === key.revision &&
        comparison.previousVersionPackageId === key.previousVersionPackageId &&
        comparison.previousVersion === key.previousVersion &&
        comparison.previousVersionRevision === key.previousVersionRevision)
      expect(matching).toHaveLength(1)
    }
  })

  // The host refuses to call such a row a valid comparison result, so neither may the builder.
  it('should treat a placeholder answer as no comparison at all', async () => {
    const placeholder = (refId: string): ResolvedComparisonSummary => ({ ...storedComparison(refId), noContent: true })
    const zip = await buildDashboardChangelog([REF_CACHED], placeholder)

    expect(await readCachedComparisons(zip)).toEqual([])
  })

  // A missing file must mean "built before this file existed", so an empty result still writes one.
  it('should write an empty list when nothing was reused', async () => {
    const zip = await buildDashboardChangelog([])

    expect(await readCachedComparisons(zip)).toEqual([])
  })
})

describe('What a comparison row carries', () => {
  // Recorded once for the pair; a copy on each entry is how the two would come to disagree.
  it('should not mark reuse on the comparisons themselves', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED])

    const { comparisons } = await readJsonFromZip<PackageComparisons>(zip, PACKAGE.COMPARISONS_FILE_NAME)
    expect(comparisons).not.toHaveLength(0)
    expect(comparisons.flatMap(comparison => Object.keys(comparison))).not.toContain('fromCache')
  })

  // Spreading the answer would put host-only fields in comparisons.json, where no consumer declares them.
  it('should keep host-only fields out of a reused row', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED])

    const { comparisons } = await readJsonFromZip<PackageComparisons>(zip, PACKAGE.COMPARISONS_FILE_NAME)
    const row = comparisons.find(({ packageId }) => packageId === REF_CACHED)
    expect(row).toBeDefined()
    expect(Object.keys(row!).sort()).toEqual([
      'operationTypes',
      'packageId',
      'previousVersion',
      'previousVersionPackageId',
      'previousVersionRevision',
      'revision',
      'version',
    ])
  })
})

describe('The DDL comparison index', () => {
  // A pair earns an entry by having schema changes, not by being in the operation index: the dashboard's own
  // pair and a schema-less reference are named there and absent here.
  it('should name a reused pair that carries schemas, and only it', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED])

    expect(await pairsIn(zip, PACKAGE.DDL_COMPARISONS_FILE_NAME)).toEqual([REF_CACHED])
    expect(await pairsIn(zip, PACKAGE.COMPARISONS_FILE_NAME))
      .toEqual([DASHBOARD, REF_CACHED, REF_CALCULATED].sort())
  })

  it('should name a calculated pair that carries schemas, and only it', async () => {
    const zip = await buildDashboardWithDdlRef()

    expect(await pairsIn(zip, PACKAGE.DDL_COMPARISONS_FILE_NAME)).toEqual([DDL_REF])
    expect(await pairsIn(zip, PACKAGE.COMPARISONS_FILE_NAME)).toEqual([DDL_DASHBOARD, DDL_REF].sort())
  })

  it('should name the pair of a changelog that has schemas and no operations', async () => {
    const zip = await buildDdlOnlyChangelog()

    expect(await pairsIn(zip, PACKAGE.DDL_COMPARISONS_FILE_NAME)).toEqual([DDL_ONLY])
    expect(await pairsIn(zip, PACKAGE.COMPARISONS_FILE_NAME)).toEqual([DDL_ONLY])

    const { comparisons } = await readJsonFromZip<PackageComparisons>(zip, PACKAGE.COMPARISONS_FILE_NAME)
    expect(comparisons[0].operationTypes).toEqual([])
  })

  it('should carry the schema changes the host reported for a reused pair', async () => {
    const zip = await buildDashboardChangelog([REF_CACHED])

    const { comparisons } = await readJsonFromZip<{
      comparisons: Array<{ packageId: string; contractsChangesSummary: unknown }>
    }>(zip, PACKAGE.DDL_COMPARISONS_FILE_NAME)

    const reused = comparisons.find(({ packageId }) => packageId === REF_CACHED)
    expect(reused!.contractsChangesSummary).toEqual({
      ddl: { changesSummary: DDL_SUMMARY, numberOfImpactedEntities: DDL_SUMMARY },
    })
  })

  // The one place where presence in cached-comparisons.json says nothing about this index: the pair was
  // reused, but the host holds no schemas for it.
  it('should not be written when a reused pair carries no schemas', async () => {
    const withoutSchemas = (refId: string): ResolvedComparisonSummary => ({
      ...storedComparison(refId),
      contractsChangesSummary: undefined,
    })
    const zip = await buildDashboardChangelog([REF_CACHED], withoutSchemas)

    expect(zip.file(PACKAGE.DDL_COMPARISONS_FILE_NAME)).toBeNull()
    expect((await readCachedComparisons(zip)).map(({ packageId }) => packageId)).toEqual([REF_CACHED])
  })

  it('should not be written when the build has no schemas at all', async () => {
    const zip = await buildDashboardChangelog([])

    expect(zip.file(PACKAGE.COMPARISONS_FILE_NAME)).not.toBeNull()
    expect(zip.file(PACKAGE.DDL_COMPARISONS_FILE_NAME)).toBeNull()
  })

  // No previous version, no comparison, and so none of the three files - not even an empty one.
  it('should not be written by a build that compares nothing', async () => {
    const zip = await buildWithoutPreviousVersion()

    expect(zip.file(PACKAGE.COMPARISONS_FILE_NAME)).toBeNull()
    expect(zip.file(PACKAGE.DDL_COMPARISONS_FILE_NAME)).toBeNull()
    expect(zip.file(PACKAGE.CACHED_COMPARISONS_FILE_NAME)).toBeNull()
  })
})
