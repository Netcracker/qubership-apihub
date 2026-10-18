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

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 2).toBeTruthy()
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length === 2).toBeTruthy()
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

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 1).toBeTruthy()
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length === 2).toBeTruthy()
  })

  test('should build deprecation history for step deprecation', async () => {
    const packageId = 'new-deprecated-step'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'properties-inline-same-schema-step-deprecation.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'properties-inline-same-schema-step-deprecation2.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'properties-inline-same-schema-step-deprecation2.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 2).toBeTruthy()
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length === 2).toBeTruthy()
    expect(deprecatedItems?.[1]?.deprecatedInPreviousVersions.length === 1).toBeTruthy()
  })

  test('should build deprecation history for refactoring (extract schema to components)', async () => {
    const packageId = 'new-deprecated-extract-to-components'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'refactor-extract-deprecated-schema-to-components.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'refactor-extract-deprecated-schema-to-components2.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'refactor-extract-deprecated-schema-to-components2.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length).toEqual(1)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length).toEqual(2)
  })

  test('should build deprecation history for refactoring (inline schema from components)', async () => {
    const packageId = 'new-deprecated-extract-from-components'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'refactor-inline-deprecated-schema-from-components.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'refactor-inline-deprecated-schema-from-components2.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'refactor-inline-deprecated-schema-from-components2.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length).toEqual(1)
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length).toEqual(2)
  })

  test('should build deprecation history for refactoring (inline schema from components and add new schema)', async () => {
    const packageId = 'new-deprecated-inline-from-components-add-new'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'refactor-inline-deprecated-schema-add-new-schema-to-components.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'refactor-inline-deprecated-schema-add-new-schema-to-components2.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'refactor-inline-deprecated-schema-add-new-schema-to-components2.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 1).toBeTruthy()
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length === 2).toBeTruthy()
  })

  // We don't support refactoring inside components. Deprecation history will be lost for such cases
  test.skip('should build deprecation history for inlined schema with description', async () => {
    const packageId = 'new-deprecated-inline-with-description'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'properties-inline-add-description.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'properties-inline-add-description2.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'properties-inline-add-description2.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 1).toBeTruthy()
    expect(deprecatedItems?.[0]?.deprecatedInPreviousVersions.length === 2).toBeTruthy()
  })

  // We don't support refactoring inside components. Deprecation history will be lost for such cases
  test.skip('many to one deprecation history relation', async () => {
    const packageId = 'many-to-one-deprecation-history-relation'
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [
        { fileId: 'many-to-one-deprecation-history-relation.yaml' },
      ],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'many-to-one-deprecation-history-relation2.yaml' },
      ],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.BUILD,
      files: [
        { fileId: 'many-to-one-deprecation-history-relation2.yaml' },
      ],
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 3).toBeTruthy()
    expect(deprecatedItems?.every((item) => item?.deprecatedInPreviousVersions.length === 2)).toBeTruthy()
  })
})
