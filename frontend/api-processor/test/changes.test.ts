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

import {
  AFTER_VERSION_ID,
  BEFORE_VERSION_ID,
  buildChangelogPackage,
  Editor,
  expectChangeCounts,
  LocalRegistry,
  operationChangesMatcher,
  operationChangesOf,
  operationTypeOf,
  prepareChangelogPackage,
} from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  BREAKING_CHANGE_TYPE,
  BUILD_TYPE,
  PackageVersionBuilder,
  NON_BREAKING_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../src/processor'
import { jest } from '@jest/globals'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'

let beforePackage: LocalRegistry
let afterPackage: LocalRegistry
const BEFORE_PACKAGE_ID = 'changes/cross-package/previous-package'
const AFTER_PACKAGE_ID = 'changes/cross-package/current-package'

describe('Changelog build type', () => {
  beforeAll(async () => {
    beforePackage = LocalRegistry.openPackage(BEFORE_PACKAGE_ID)
    afterPackage = LocalRegistry.openPackage(AFTER_PACKAGE_ID)

    await beforePackage.publish(BEFORE_PACKAGE_ID, {
      version: 'v1',
      packageId: BEFORE_PACKAGE_ID,
    })
    await afterPackage.publish(AFTER_PACKAGE_ID, {
      version: 'v2',
      packageId: AFTER_PACKAGE_ID,
    })
  })

  test('Comparison should have 1 breaking and 1 annotation changes', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      previousVersionPackageId: BEFORE_PACKAGE_ID,
      previousVersion: BEFORE_VERSION_ID,
      buildType: BUILD_TYPE.CHANGELOG,
    })
    expectChangeCounts(result, {
      changes: {
        [BREAKING_CHANGE_TYPE]: 1,
        [ANNOTATION_CHANGE_TYPE]: 1,
      },
      impacted: {
        [BREAKING_CHANGE_TYPE]: 1,
        [ANNOTATION_CHANGE_TYPE]: 1,
      },
    })
  })

  describe('Added/removed/changed operations handling', () => {
    test('Add operation', async () => {
      const result = await buildChangelogPackage('changelog/add-operation')
      expectChangeCounts(result, {
        changes: { [NON_BREAKING_CHANGE_TYPE]: 1 },
        impacted: { [NON_BREAKING_CHANGE_TYPE]: 1 },
      })
    })

    test('Remove operation', async () => {
      const result = await buildChangelogPackage('changelog/remove-operation')
      expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
    })

    test('Change operation content', async () => {
      const result = await buildChangelogPackage('changelog/change-inside-operation')

      expectChangeCounts(result, {
        changes: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
        impacted: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
      })
    })

    test('Should match moved operations', async () => {
      const result = await buildChangelogPackage(
        'changelog/documents-matching',
        [{ fileId: 'before1.yaml' }, { fileId: 'before2.yaml' }],
        [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }, { fileId: 'evicted.yaml' }],
      )
      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 3 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 3 },
      })
    })

    test('Compare parametrized operations', async () => {
      const result = await buildChangelogPackage('changelog/compare-parametrized-operations')
      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 2 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
    })

    test('Add prefix to server', async () => {
      const result = await buildChangelogPackage('changelog/add-prefix-to-server')

      expectChangeCounts(result, {
        changes: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
        impacted: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
      })
    })

    test('Remove prefix from server', async () => {
      const result = await buildChangelogPackage('changelog/remove-prefix-from-server')

      expectChangeCounts(result, {
        changes: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
        impacted: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
      })
    })

    test('Move prefix from server to path', async () => {
      const result = await buildChangelogPackage('changelog/move-prefix-from-server-to-path')

      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 3 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
    })
  })

  describe('Diffs collecting in the root-level properties', () => {
    test('Add root servers', async () => {
      const result = await buildChangelogPackage('changelog/add-root-servers')

      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 1 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
      // the counts are the same for a removal, so the direction is what tells the two tests apart
      expect(operationChangesOf(result, 'path1-get').diffs?.map(({ action }) => action)).toEqual([DiffAction.add])
    })

    test('Remove root servers', async () => {
      const result = await buildChangelogPackage('changelog/remove-root-servers')

      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 1 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
      expect(operationChangesOf(result, 'path1-get').diffs?.map(({ action }) => action)).toEqual([DiffAction.remove])
    })

    test('Remove server', async () => {
      const result = await buildChangelogPackage('changelog/remove-server')

      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 1 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
    })

    test('Change root servers', async () => {
      const result = await buildChangelogPackage('changelog/change-root-servers')

      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 1 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
    })

    test('Add security', async () => {
      const result = await buildChangelogPackage('changelog/add-security')

      expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 2 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
    })

    test('Remove security', async () => {
      const result = await buildChangelogPackage('changelog/remove-security')

      expectChangeCounts(result, {
        changes: { [NON_BREAKING_CHANGE_TYPE]: 2 },
        impacted: { [NON_BREAKING_CHANGE_TYPE]: 1 },
      })
    })

    test('Add securityScheme', async () => {
      const result = await buildChangelogPackage('changelog/add-security-scheme')

      expectChangeCounts(result, {
        changes: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
        impacted: {
          [BREAKING_CHANGE_TYPE]: 1,
          [NON_BREAKING_CHANGE_TYPE]: 1,
        },
      })
    })

    test('Change securityScheme content', async () => {
      const result = await buildChangelogPackage('changelog/change-inside-security-scheme')

      expectChangeCounts(result, {
        changes: {
          [UNCLASSIFIED_CHANGE_TYPE]: 1,
        },
        impacted: {
          [UNCLASSIFIED_CHANGE_TYPE]: 1,
        },
      })
    })

    test('Change openapi version', async () => {
      const result = await buildChangelogPackage('changelog/change-openapi-version')

      expectChangeCounts(result, {
        changes: { [ANNOTATION_CHANGE_TYPE]: 1 },
        impacted: { [ANNOTATION_CHANGE_TYPE]: 1 },
      })
    })
  })

  test('Operation changes fields are correct', async () => {
    const result = await buildChangelogPackage('changelog/operation-changes-fields')

    expect(result).toEqual(operationChangesMatcher([
      expect.objectContaining({
        previousOperationId: 'order-_id_-post',
        operationId: 'order-_orderId_-post',
        previousMetadata: {
          'title': 'create order 1',
          'tags': ['tag1'],
          'method': 'post',
          'path': '/order/*',
        },
        metadata: {
          'title': 'create order 2',
          'tags': ['tag1', 'tag2'],
          'method': 'post',
          'path': '/order/*',
        },
        // rest of the fields are covered by dedicated tests
      }),
    ]))
  })

  test('Tags are not duplicated', async () => {
    const result = await buildChangelogPackage('changelog/tags')

    expect(operationTypeOf(result).tags).toIncludeSameMembers([
      'sameTagInDifferentPaths1',
      'sameTagInDifferentPaths2',
      'sameTagInDifferentPaths3',
      'sameTagInMethodSiblings1',
      'sameTagInMethodSiblings2',
      'sameTagInMethodSiblings3',
      'tag',
    ])
  })

  test('Should fail changelog build if on of the versions was built using outdated api-processor version', async () => {
    const pckgId = 'changelog/add-operation'

    const editor = await prepareChangelogPackage(pckgId)

    // Simulate that current version was built with an outdated api-processor
    // Mock the builder's versionResolver method (not the registry's)
    const originalVersionResolver = (editor.builder as PackageVersionBuilder).versionResolver.bind(editor.builder)
    jest.spyOn(editor.builder as PackageVersionBuilder, 'versionResolver').mockImplementation(async (notifications, version, packageId) => {
      const resolved = await originalVersionResolver(notifications, version, packageId)
      if (resolved && packageId === pckgId && version === 'v2') {
        return { ...resolved, apiProcessorVersion: '0.0.0' }
      }
      return resolved
    })

    await expect(editor.run()).rejects.toThrow('Can\'t build the changelog if current version was built using an outdated api-processor.')
  }, 100000)
})
