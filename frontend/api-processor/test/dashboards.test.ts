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
import { describe, expect, jest, test } from '@jest/globals'
import { LocalRegistry } from './helpers/registry'
import { BUILD_TYPE, VERSION_STATUS } from '../src/consts'
import { Editor } from './helpers/editor'
import { PackageVersionBuilder } from '../src/processor'
import { prepareChangelogDashboard } from './helpers'

describe('Dashboard build', () => {
  test('dashboard should have changes', async () => {
    // todo
  }, 100000)
  test('Resolvers should not be called for empty versions when building changelog for dashboard that has added removed packages', async () => {
    const pckg1Id = 'dashboards/pckg1'
    const pckg2Id = 'dashboards/pckg2'

    const editor = await prepareChangelogDashboard(pckg1Id, pckg2Id)
    // spy on the builder's wrapper methods that are actually invoked
    const versionResolverSpy = jest.spyOn(editor.builder as PackageVersionBuilder, 'versionResolver')
    const versionDocumentsResolverSpy = jest.spyOn(editor.builder as PackageVersionBuilder, 'versionDocumentsResolver')
    const rawDocumentResolverSpy = jest.spyOn(editor.builder as PackageVersionBuilder, 'rawDocumentResolver')

    await editor.run()

    // versionResolver(version, packageId) - builder's method signature
    // Should be called for v1 and v2 dashboard versions
    expect(versionResolverSpy).toHaveBeenCalled()
    versionResolverSpy.mock.calls.forEach(args => {
      expect(args[0]).toBeTruthy() // version should not be empty
      expect(args[1]).toBeTruthy() // packageId should not be empty
    })

    // versionDocumentsResolver(version, packageId, apiType?)
    // Should be called for referenced packages (pckg1/v1 and pckg2/v2)
    expect(versionDocumentsResolverSpy).toHaveBeenCalled()
    versionDocumentsResolverSpy.mock.calls.forEach(args => {
      expect(args[0]).toBeTruthy() // version should not be empty
      expect(args[1]).toBeTruthy() // packageId should not be empty
    })

    // rawDocumentResolver(version, packageId, slug)
    // May or may not be called depending on if raw documents are needed
    rawDocumentResolverSpy.mock.calls.forEach(args => {
      expect(args[0]).toBeTruthy() // version should not be empty
      expect(args[1]).toBeTruthy() // packageId should not be empty
    })
  }, 100000)

  test('Should fail changelog build if one of the packages was built using outdated api-processor version', async () => {
    const pckg1Id = 'dashboards/pckg1'
    const pckg2Id = 'dashboards/pckg2'

    await LocalRegistry.openPackage(pckg1Id).publish(pckg1Id, {
      version: 'v1',
      packageId: pckg1Id,
      files: [{ fileId: 'v1.yaml' }],
    })

    await LocalRegistry.openPackage(pckg1Id).publish(pckg1Id, {
      version: 'v2',
      packageId: pckg1Id,
      files: [{ fileId: 'v1.yaml' }],
    })

    await LocalRegistry.openPackage(pckg2Id).publish(pckg2Id, {
      version: 'v1',
      packageId: pckg2Id,
      files: [{ fileId: 'v2.yaml' }],
    })

    await LocalRegistry.openPackage(pckg2Id).publish(pckg2Id, {
      version: 'v2',
      packageId: pckg2Id,
      files: [{ fileId: 'v2.yaml' }],
    })

    const dashboard = LocalRegistry.openPackage('dashboards/dashboard')
    await dashboard.publish(dashboard.packageId, {
      packageId: 'dashboards/dashboard',
      version: 'v1',
      apiType: 'rest',
      refs: [
        { refId: pckg1Id, version: 'v1' },
        { refId: pckg2Id, version: 'v1' },
      ],
    })

    await dashboard.publish(dashboard.packageId, {
      packageId: 'dashboards/dashboard',
      version: 'v2',
      apiType: 'rest',
      refs: [
        { refId: pckg1Id, version: 'v2' },
        { refId: pckg2Id, version: 'v2' },
      ],
    })

    const editor = new Editor(dashboard.packageId, {
      version: 'v2',
      packageId: dashboard.packageId,
      previousVersionPackageId: dashboard.packageId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    })

    // Simulate that previous dashboard version was built with an outdated api-processor
    // Mock the builder's versionResolver method (not the registry's)
    const originalVersionResolver = (editor.builder as PackageVersionBuilder).versionResolver.bind(editor.builder)
    jest.spyOn(editor.builder as PackageVersionBuilder, 'versionResolver').mockImplementation(async (version, packageId) => {
      const resolved = await originalVersionResolver(version, packageId)
      if (resolved && packageId === pckg1Id && version === 'v1') {
        return { ...resolved, apiProcessorVersion: '0.0.0' }
      }
      return resolved
    })

    await expect(editor.run()).rejects.toThrow('Can\'t build the changelog if previous version was built using an outdated api-processor.')
  }, 100000)

  test('dashboard changelog aggregates DDL comparisons from DDL-bearing refs (cache-miss path, D15)', async () => {
    const refId = 'dashboards/ddl-ref'
    const dashboardId = 'dashboards/ddl-dashboard'

    // a DDL ref package with a table that changes between v1 and v2
    const ref = LocalRegistry.openPackage(refId)
    await ref.publishFromContent(
      { 'shop.sql': 'CREATE TABLE widgets (id bigint PRIMARY KEY);' },
      { packageId: refId, version: 'v1', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )
    await ref.publishFromContent(
      { 'shop.sql': 'CREATE TABLE widgets (id bigint PRIMARY KEY, label text);' },
      { packageId: refId, version: 'v2', buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )

    // a dashboard referencing it, across two versions
    const dashboard = LocalRegistry.openPackage(dashboardId)
    await dashboard.publishFromContent(
      {},
      { packageId: dashboardId, version: 'v1', buildType: BUILD_TYPE.BUILD, refs: [{ refId, version: 'v1' }], files: [] },
    )
    const result = await dashboard.publishFromContent(
      {},
      { packageId: dashboardId, version: 'v2', previousVersion: 'v1', buildType: BUILD_TYPE.BUILD, refs: [{ refId, version: 'v2' }], files: [] },
    )

    // the ref's DDL comparison is aggregated into the dashboard changelog (versionComparisonResolver
    // returns null in the test registry → cache-miss → fresh compareVersionsDdl for the ref)
    const refDdl = result.ddlComparisons.find(comparison => comparison.packageId === refId)
    expect(refDdl).toBeDefined()
    expect(refDdl!.contractsChangesSummary).toHaveProperty('ddl')
    expect((refDdl!.data ?? []).map(change => change.ddlEntityId)).toContain('public-table-widgets')
  }, 100000)
})

describe('Dashboard changelog omits intermediate dashboard comparisons', () => {
  // a minimal REST spec whose operation description changes between versions
  const restSpec = (description: string): string => `openapi: "3.0.0"
info:
  title: leaf
  version: 0.1.0
paths:
  /some/path1:
    get:
      summary: some operation summary
      description: ${description}
      responses:
        '200':
          description: some response description
`

  const publishLeaf = (
    reg: LocalRegistry,
    packageId: string,
    version: string,
    description: string,
  ): ReturnType<LocalRegistry['publishFromContent']> =>
    reg.publishFromContent(
      { 'spec.yaml': restSpec(description) },
      { packageId, version, buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'spec.yaml' }] },
    )

  const publishDdlLeaf = (
    reg: LocalRegistry,
    packageId: string,
    version: string,
    sql: string,
  ): ReturnType<LocalRegistry['publishFromContent']> =>
    reg.publishFromContent(
      { 'shop.sql': sql },
      { packageId, version, buildType: BUILD_TYPE.BUILD, files: [{ fileId: 'shop.sql' }] },
    )

  // a dashboard is a package that declares refs and has no files of its own
  const publishDashboard = (
    reg: LocalRegistry,
    packageId: string,
    version: string,
    refs: { refId: string; version: string }[],
  ): ReturnType<LocalRegistry['publishFromContent']> =>
    reg.publishFromContent(
      {},
      { packageId, version, buildType: BUILD_TYPE.BUILD, refs, files: [] },
    )

  // identify which package a comparison entry is about: a changed pair has both sides, an added pair
  // has only the current side (packageId), a removed pair has only the previous side.
  const packageOf = (comparison: { packageId: string; previousVersionPackageId: string }): string =>
    comparison.packageId || comparison.previousVersionPackageId

  test('keeps every leaf package (changed/added/removed, any depth), drops all nested dashboards', async () => {
    const reg = LocalRegistry.openPackage('di/root')

    const rootId = 'di/root'   // main dashboard (built/compared)
    const midId = 'di/mid'     // intermediate dashboard
    const innerId = 'di/inner' // intermediate dashboard (nested inside mid)
    const pkg1 = 'di/pkg1'     // leaf reached only through root → mid → inner (3 dashboard levels), changed
    const pkg2 = 'di/pkg2'     // leaf under mid, changed
    const pkg3 = 'di/pkg3'     // leaf added in v2
    const pkg4 = 'di/pkg4'     // leaf removed in v2

    // leaves first (dashboards aggregate them at build time)
    await publishLeaf(reg, pkg1, 'v1', 'pkg1 description')
    await publishLeaf(reg, pkg1, 'v2', 'pkg1 description changed')
    await publishLeaf(reg, pkg2, 'v1', 'pkg2 description')
    await publishLeaf(reg, pkg2, 'v2', 'pkg2 description changed')
    await publishLeaf(reg, pkg3, 'v2', 'pkg3 description') // added leaf → only v2 exists
    await publishLeaf(reg, pkg4, 'v1', 'pkg4 description') // removed leaf → only v1 exists

    // inner dashboard → pkg1 (disjoint subtree from mid's own leaves)
    await publishDashboard(reg, innerId, 'v1', [{ refId: pkg1, version: 'v1' }])
    await publishDashboard(reg, innerId, 'v2', [{ refId: pkg1, version: 'v2' }])

    // mid dashboard → inner + pkg2 (+ pkg4 in v1, + pkg3 in v2). Always has refs in both versions.
    await publishDashboard(reg, midId, 'v1', [
      { refId: innerId, version: 'v1' },
      { refId: pkg2, version: 'v1' },
      { refId: pkg4, version: 'v1' },
    ])
    await publishDashboard(reg, midId, 'v2', [
      { refId: innerId, version: 'v2' },
      { refId: pkg2, version: 'v2' },
      { refId: pkg3, version: 'v2' },
    ])

    // root dashboard → mid
    await publishDashboard(reg, rootId, 'v1', [{ refId: midId, version: 'v1' }])
    await publishDashboard(reg, rootId, 'v2', [{ refId: midId, version: 'v2' }])

    // changelog build of the root dashboard: the resolver flattens the whole tree (CHANGELOG is not
    // resolvable-locally, so refs are the full descendant set, not just the root's direct children)
    const editor = new Editor(rootId, {
      packageId: rootId,
      version: 'v2',
      previousVersionPackageId: rootId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, reg)
    const result = await editor.run()

    const ids = result.comparisons.map(packageOf)

    // main dashboard is always emitted
    expect(ids).toContain(rootId)
    // every changed/added/removed leaf survives, at every depth (pkg1 is 3 dashboard levels deep)
    expect(ids).toEqual(expect.arrayContaining([pkg1, pkg2, pkg3, pkg4]))
    // intermediate dashboards are gone
    expect(ids).not.toContain(midId)
    expect(ids).not.toContain(innerId)
    // regression guard: the non-main entries are exactly the leaf set — nothing added or lost
    const nonMain = ids.filter(id => id !== rootId)
    expect(new Set(nonMain)).toEqual(new Set([pkg1, pkg2, pkg3, pkg4]))
  }, 100000)

  // ddl-comparisons.json must stay consistent with comparisons.json: no nested-dashboard rows in
  // either. A DDL leaf reached only through two dashboard levels must still be emitted. (An intermediate
  // dashboard never had its OWN DDL entry anyway — compareVersionsDdl looks at own documents only, and a
  // dashboard has none — so this asserts the DDL leaf survives nested-dashboard flattening and that no
  // dashboard id leaks into the DDL index, which the shared skip in compareVersionsReferences guarantees.)
  test('keeps a DDL leaf reached through nested dashboards, with no dashboard rows in ddl-comparisons.json', async () => {
    const reg = LocalRegistry.openPackage('di-ddl/root')

    const rootId = 'di-ddl/root'  // main dashboard
    const midId = 'di-ddl/mid'    // intermediate dashboard
    const leafId = 'di-ddl/leaf'  // DDL leaf whose table gains a column between v1 and v2

    await publishDdlLeaf(reg, leafId, 'v1', 'CREATE TABLE widgets (id bigint PRIMARY KEY);')
    await publishDdlLeaf(reg, leafId, 'v2', 'CREATE TABLE widgets (id bigint PRIMARY KEY, label text);')

    await publishDashboard(reg, midId, 'v1', [{ refId: leafId, version: 'v1' }])
    await publishDashboard(reg, midId, 'v2', [{ refId: leafId, version: 'v2' }])

    await publishDashboard(reg, rootId, 'v1', [{ refId: midId, version: 'v1' }])
    await publishDashboard(reg, rootId, 'v2', [{ refId: midId, version: 'v2' }])

    const editor = new Editor(rootId, {
      packageId: rootId,
      version: 'v2',
      previousVersionPackageId: rootId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, reg)
    const result = await editor.run()

    const ddlIds = result.ddlComparisons.map(packageOf)

    // the DDL leaf's comparison survives two dashboard levels; no intermediate dashboard row appears
    expect(ddlIds).toContain(leafId)
    expect(ddlIds).not.toContain(midId)
  }, 100000)

  // A leaf referenced at CONFLICTING versions through two sub-dashboards: APIHub's
  // first-occurrence-wins conflict resolution marks the loser `excluded: true` on its reference edge.
  // The builder must honour that and emit only the winning version, so the same packageId never
  // appears at two versions in one flattened tree (which would mis-pair prev↔current by refId).
  test('keeps only the winning version of a package referenced at conflicting versions (drops excluded loser)', async () => {
    const reg = LocalRegistry.openPackage('exc/root')

    const rootId = 'exc/root'  // main dashboard
    const subAId = 'exc/subA'  // sub-dashboard declared first → its leaf@v2 wins
    const subBId = 'exc/subB'  // sub-dashboard declared second → its leaf@v3 is the conflict loser
    const leafId = 'exc/leaf'  // leaf referenced at v2 (via subA) and v3 (via subB) in the current tree

    await publishLeaf(reg, leafId, 'v1', 'leaf v1')        // previous tree
    await publishLeaf(reg, leafId, 'v2', 'leaf v2 winner') // current tree, winner
    await publishLeaf(reg, leafId, 'v3', 'leaf v3 loser')  // current tree, conflict loser

    await publishDashboard(reg, subAId, 'v1', [{ refId: leafId, version: 'v1' }])
    await publishDashboard(reg, subAId, 'v2', [{ refId: leafId, version: 'v2' }])
    await publishDashboard(reg, subBId, 'v1', [{ refId: leafId, version: 'v1' }])
    await publishDashboard(reg, subBId, 'v2', [{ refId: leafId, version: 'v3' }])

    await publishDashboard(reg, rootId, 'v1', [{ refId: subAId, version: 'v1' }, { refId: subBId, version: 'v1' }])
    await publishDashboard(reg, rootId, 'v2', [{ refId: subAId, version: 'v2' }, { refId: subBId, version: 'v2' }])

    const editor = new Editor(rootId, {
      packageId: rootId,
      version: 'v2',
      previousVersionPackageId: rootId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, reg)
    const result = await editor.run()

    const leafComparisons = result.comparisons.filter(comparison => packageOf(comparison) === leafId)

    // exactly one comparison for the leaf, pairing prev v1 → winner v2 (never the excluded v3)
    expect(leafComparisons).toHaveLength(1)
    expect(leafComparisons[0].version).toBe('v2')
    expect(leafComparisons[0].previousVersion).toBe('v1')

    // the excluded (loser) version leaks into no comparison entry
    expect(result.comparisons.map(comparison => comparison.version)).not.toContain('v3')

    // intermediate dashboards stay dropped; the main comparison is still present
    const ids = result.comparisons.map(packageOf)
    expect(ids).toContain(rootId)
    expect(ids).not.toContain(subAId)
    expect(ids).not.toContain(subBId)
  }, 100000)

  // Same conflict, exercised through ddl-comparisons.json: one fix covers both files. The winning
  // DDL leaf version is compared (v1→v2, adds column `label`); the excluded v3 (adds `note`) is absent.
  test('keeps only the winning DDL version of a package referenced at conflicting versions', async () => {
    const reg = LocalRegistry.openPackage('exc-ddl/root')

    const rootId = 'exc-ddl/root'
    const subAId = 'exc-ddl/subA' // declared first → winner
    const subBId = 'exc-ddl/subB' // declared second → conflict loser
    const leafId = 'exc-ddl/leaf'

    await publishDdlLeaf(reg, leafId, 'v1', 'CREATE TABLE widgets (id bigint PRIMARY KEY);')
    await publishDdlLeaf(reg, leafId, 'v2', 'CREATE TABLE widgets (id bigint PRIMARY KEY, label text);') // winner
    await publishDdlLeaf(reg, leafId, 'v3', 'CREATE TABLE widgets (id bigint PRIMARY KEY, note text);')  // loser

    await publishDashboard(reg, subAId, 'v1', [{ refId: leafId, version: 'v1' }])
    await publishDashboard(reg, subAId, 'v2', [{ refId: leafId, version: 'v2' }])
    await publishDashboard(reg, subBId, 'v1', [{ refId: leafId, version: 'v1' }])
    await publishDashboard(reg, subBId, 'v2', [{ refId: leafId, version: 'v3' }])

    await publishDashboard(reg, rootId, 'v1', [{ refId: subAId, version: 'v1' }, { refId: subBId, version: 'v1' }])
    await publishDashboard(reg, rootId, 'v2', [{ refId: subAId, version: 'v2' }, { refId: subBId, version: 'v2' }])

    const editor = new Editor(rootId, {
      packageId: rootId,
      version: 'v2',
      previousVersionPackageId: rootId,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, reg)
    const result = await editor.run()

    const leafDdlComparisons = result.ddlComparisons.filter(comparison => packageOf(comparison) === leafId)

    // exactly one DDL comparison for the leaf, pairing prev v1 → winner v2 (never the excluded v3)
    expect(leafDdlComparisons).toHaveLength(1)
    expect(leafDdlComparisons[0].version).toBe('v2')
    expect(leafDdlComparisons[0].previousVersion).toBe('v1')

    // the excluded (loser) version leaks into no DDL comparison entry
    expect(result.ddlComparisons.map(comparison => comparison.version)).not.toContain('v3')
    expect(result.ddlComparisons.map(packageOf)).not.toContain(subAId)
    expect(result.ddlComparisons.map(packageOf)).not.toContain(subBId)
  }, 100000)
})
