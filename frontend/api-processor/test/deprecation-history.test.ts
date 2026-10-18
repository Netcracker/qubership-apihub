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

describe('Deprecated history test', () => {
  test('should build deprecation history for inline schema', async () => {
    const packageId = 'new-deprecated-inline'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'properties-inline-same-schema.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'properties-inline-same-schema.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'properties-inline-same-schema.yaml' }],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(2)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions).toHaveLength(2)
  })

  test('should build deprecation history for components schema', async () => {
    const packageId = 'new-deprecated-component'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'properties-components-same-schema.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'properties-components-same-schema.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'properties-components-same-schema.yaml' }],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(1)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions).toHaveLength(2)
  })

  test('should build deprecation history for step deprecation', async () => {
    const packageId = 'new-deprecated-step'
    await portal.publish('new-deprecated/properties-inline-same-schema-step-deprecation', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'before.yaml' },
      ],
    })
    await portal.publish('new-deprecated/properties-inline-same-schema-step-deprecation', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'after.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated/properties-inline-same-schema-step-deprecation', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'after.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(2)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions).toHaveLength(2)
    expect(deprecatedItems?.[1]?.deprecatedInPreviousVersions).toHaveLength(1)
  })

  test('should build deprecation history for refactoring (extract schema to components)', async () => {
    const packageId = 'new-deprecated-extract-to-components'
    await portal.publish('new-deprecated/refactor-extract-deprecated-schema-to-components', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'before.yaml' },
      ],
    })
    await portal.publish('new-deprecated/refactor-extract-deprecated-schema-to-components', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'after.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated/refactor-extract-deprecated-schema-to-components', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'after.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems.length).toEqual(1)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length).toEqual(2)
  })

  test('should build deprecation history for refactoring (inline schema from components)', async () => {
    const packageId = 'new-deprecated-extract-from-components'
    await portal.publish('new-deprecated/refactor-inline-deprecated-schema-from-components', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'before.yaml' },
      ],
    })
    await portal.publish('new-deprecated/refactor-inline-deprecated-schema-from-components', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'after.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated/refactor-inline-deprecated-schema-from-components', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'after.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems.length).toEqual(1)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length).toEqual(2)
  })

  test('should build deprecation history for refactoring (inline schema from components and add new schema)', async () => {
    const packageId = 'new-deprecated-inline-from-components-add-new'
    await portal.publish('new-deprecated/refactor-inline-deprecated-schema-add-new-schema-to-components', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'before.yaml' },
      ],
    })
    await portal.publish('new-deprecated/refactor-inline-deprecated-schema-add-new-schema-to-components', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'after.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated/refactor-inline-deprecated-schema-add-new-schema-to-components', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'after.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(1)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions).toHaveLength(2)
  })
})
