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

import { Editor, LocalRegistry } from './helpers'
import { BREAKING_CHANGE_TYPE, BUILD_TYPE, RISKY_CHANGE_TYPE, VERSION_STATUS } from '../src'

const portal = new LocalRegistry('deprecated')

describe('Deprecated Items test', () => {
  beforeAll(async () => {
    await portal.publish('deprecated', {
      packageId: 'deprecated',
      version: 'v1',
      files: [{ fileId: 'PublicRegistry API(4).yaml' }],
    })

    await portal.publish('deprecated', {
      packageId: 'deprecated',
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'PublicRegistry API(4)v2.yaml' }],
    })

    await portal.publish('deprecated', {
      packageId: 'deprecated',
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'PublicRegistry API(4)v3.yaml' }],
    })

    await portal.publish('deprecated', {
      packageId: 'deprecated',
      version: 'v11',
      files: [{ fileId: 'TemplateDictionary(1).yaml' }],
    })

    await portal.publish('deprecated', {
      packageId: 'deprecated',
      version: 'v12',
      previousVersion: 'v11',
      files: [{ fileId: 'TemplateDictionary(2).yaml' }],
    })

    await portal.publish('deprecated', {
      packageId: 'deprecated',
      version: 'v13',
      previousVersion: 'v12',
      files: [{ fileId: 'TemplateDictionary(3).yaml' }],
    })
  })

  test('should build deprecated items with correct depth', async () => {
    const editor = new Editor('deprecated', {
      packageId: 'deprecated',
      version: 'v2',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v1',
      files: [{ fileId: 'PublicRegistry API(4)v2.yaml' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.every(item => item?.description?.startsWith('[Deprecated]'))).toBeTruthy()
    expect(result.operations.get('auth-saml-post')?.deprecatedItems?.[0].deprecatedInPreviousVersions.length).toBe(2)
    expect(Array.from(result.operations.values())).toEqual(expect.toIncludeSameMembers([
      expect.objectContaining({ deprecated: true }),
      expect.objectContaining({ deprecated: false }),
      expect.objectContaining({ deprecated: false }),
    ]))
  })

  test('should have 1 semi-breaking changes for removed operation and property according to rules', async () => {
    const editor = new Editor('deprecated', {
      packageId: 'deprecated',
      version: 'v3',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    const result = await editor.run()
    expect(result.comparisons[0].operationTypes[0].changesSummary?.[RISKY_CHANGE_TYPE]).toBe(1)
    expect(result.comparisons[0].operationTypes[0].changesSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)
  })

  test('should have 4 semi-breaking changes for removed operations', async () => {
    const editor = new Editor('deprecated', {
      packageId: 'deprecated',
      version: 'v13',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v12',
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    const result = await editor.run()
    expect(result.comparisons[0].operationTypes[0].changesSummary?.[RISKY_CHANGE_TYPE]).toBe(4)
  })
})
