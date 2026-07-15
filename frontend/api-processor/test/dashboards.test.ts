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
