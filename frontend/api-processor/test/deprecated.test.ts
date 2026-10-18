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

import { deprecatedItemsOf, Editor, expectSummariesMatchDiffs, LocalRegistry, operationOf, operationTypeOf } from './helpers'
import { BREAKING_CHANGE_TYPE, BUILD_TYPE, RISKY_CHANGE_TYPE, VERSION_STATUS } from '../src'

const portal = new LocalRegistry('deprecated')

describe('Deprecated Items test', () => {
  beforeAll(async () => {
    await portal.publish('deprecated/public-registry', {
      packageId: 'deprecated/public-registry',
      version: 'v1',
      files: [{ fileId: 'v1.yaml' }],
    })

    await portal.publish('deprecated/public-registry', {
      packageId: 'deprecated/public-registry',
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'v2.yaml' }],
    })

    await portal.publish('deprecated/public-registry', {
      packageId: 'deprecated/public-registry',
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'v3.yaml' }],
    })

    await portal.publish('deprecated/template-dictionary', {
      packageId: 'deprecated/template-dictionary',
      version: 'v11',
      files: [{ fileId: 'v1.yaml' }],
    })

    await portal.publish('deprecated/template-dictionary', {
      packageId: 'deprecated/template-dictionary',
      version: 'v12',
      previousVersion: 'v11',
      files: [{ fileId: 'v2.yaml' }],
    })

    await portal.publish('deprecated/template-dictionary', {
      packageId: 'deprecated/template-dictionary',
      version: 'v13',
      previousVersion: 'v12',
      files: [{ fileId: 'v3.yaml' }],
    })
  })

  test('should build deprecated items with correct depth', async () => {
    const editor = new Editor('deprecated/public-registry', {
      packageId: 'deprecated/public-registry',
      version: 'v2',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v1',
      files: [{ fileId: 'v2.yaml' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems.every(item => item?.description?.startsWith('[Deprecated]'))).toBeTruthy()
    expect(operationOf(result, 'auth-saml-post').deprecatedItems?.[0].deprecatedInPreviousVersions).toEqual(['v1', 'v2'])
    expect(Array.from(result.operations.values())).toEqual(expect.toIncludeSameMembers([
      expect.objectContaining({ deprecated: true, deprecatedInfo: 'deprecated reason', deprecatedInPreviousVersions: ['v1', 'v2'] }),
      expect.objectContaining({ deprecated: false }),
      expect.objectContaining({ deprecated: false }),
    ]))
  })

  test('should have 1 semi-breaking changes for removed operation and property according to rules', async () => {
    const editor = new Editor('deprecated/public-registry', {
      packageId: 'deprecated/public-registry',
      version: 'v3',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    const result = await editor.run()
    expect(operationTypeOf(result).changesSummary[RISKY_CHANGE_TYPE]).toBe(1)
    expect(operationTypeOf(result).changesSummary[BREAKING_CHANGE_TYPE]).toBe(0)
    // The version-level summary above counts distinct changes; this checks that each operation's own
    // summary still accounts for the changes it carries, which is where the two used to drift apart
    expectSummariesMatchDiffs(result)
  })

  test('should have 4 semi-breaking changes for removed operations', async () => {
    const editor = new Editor('deprecated/template-dictionary', {
      packageId: 'deprecated/template-dictionary',
      version: 'v13',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v12',
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    const result = await editor.run()
    expect(operationTypeOf(result).changesSummary[RISKY_CHANGE_TYPE]).toBe(4)
    expectSummariesMatchDiffs(result)
  })
})
