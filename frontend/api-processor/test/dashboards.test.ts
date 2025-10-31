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
import { describe, test, expect, jest } from '@jest/globals'
import { LocalRegistry } from './helpers/registry'
import { BUILD_TYPE, VERSION_STATUS } from '../src/consts'
import { Editor } from './helpers/editor'

describe('Dashboard build', () => {
  test('dashboard should have changes', async () => {
    // todo
  }, 100000)
  test('Resolvers should not be called for empty versions when building changelog for dashboard that has added removed packages', async () => {
    const pckg1Id = 'dashboards/pckg1'
    const pckg2Id = 'dashboards/pckg2'

    await LocalRegistry.openPackage(pckg1Id).publish(pckg1Id, {
      version: 'v1',
      packageId: pckg1Id,
      files: [{ fileId: 'v1.yaml' }],
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
      ],
    })

    await dashboard.publish(dashboard.packageId, {
      packageId: 'dashboards/dashboard',
      version: 'v2',
      apiType: 'rest',
      refs: [
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
    const versionResolverSpy = jest.spyOn(editor.registry as LocalRegistry, 'versionResolver')
    const versionDocumentsResolverSpy = jest.spyOn(editor.registry as LocalRegistry, 'versionDocumentsResolver')
    const rawDocumentResolverSpy = jest.spyOn(editor.registry as LocalRegistry, 'rawDocumentResolver')

    await editor.run()

    // versionResolver(version, packageId)
    versionResolverSpy.mock.calls.forEach(args => {
      // args: [packageId = '', version]
      expect(args[1]).toBeTruthy()
    })

    // versionDocumentsResolver(version, packageId)
    versionDocumentsResolverSpy.mock.calls.forEach(args => {
      expect(args[0]).toBeTruthy()
    })

    // rawDocumentResolver(version, packageId, slug)
    rawDocumentResolverSpy.mock.calls.forEach(args => {
      expect(args[0]).toBeTruthy()
    })
  }, 100000)
})
