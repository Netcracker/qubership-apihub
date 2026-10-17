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

import { deprecatedItemsOf, Editor, LocalRegistry } from './helpers'
import { BUILD_TYPE, VERSION_STATUS } from '../src'

const portal = new LocalRegistry('new-deprecated')

describe('Deprecated counting test', () => {
  beforeAll(async () => {

    await portal.publish('new-deprecated', {
      packageId: 'new-deprecated-counting',
      version: 'v1',
      files: [{ fileId: 'properties-inline-same-schema.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: 'new-deprecated-counting',
      version: 'v2',
      files: [{ fileId: 'properties-components-same-schema.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: 'new-deprecated-counting',
      version: 'v3',
      files: [{ fileId: 'deprecated-in-allof.yaml' }],
    })
  })

  test('should build deprecated items for inline schema', async () => {
    const editor = new Editor('new-deprecated', {
      packageId: 'new-deprecated-counting',
      version: 'v1',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'properties-inline-same-schema.yaml' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(2)
  })

  test('should build deprecated for components schema', async () => {
    const editor = new Editor('new-deprecated', {
      packageId: 'new-deprecated-counting',
      version: 'v2',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'properties-components-same-schema.yaml' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(1)
  })

  test('should build deprecated for prop with allof', async () => {
    const editor = new Editor('new-deprecated', {
      packageId: 'new-deprecated-counting',
      version: 'v3',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'deprecated-in-allof.yaml' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(1)
    expect(deprecatedItems[0]?.declarationJsonPaths).toHaveLength(2)
  })
})
