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
  buildChangelogPackage,
  changesSummaryMatcher,
  Editor,
  LocalRegistry,
  numberOfImpactedOperationsMatcher,
  operationChangesMatcher,
} from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  BREAKING_CHANGE_TYPE,
  BUILD_TYPE,
  NON_BREAKING_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
} from '../src'

let beforePackage: LocalRegistry
let afterPackage: LocalRegistry
const BEFORE_PACKAGE_ID = 'changes_test_before'
const AFTER_PACKAGE_ID = 'changes_test_after'
const BEFORE_VERSION_ID = 'v1'
const AFTER_VERSION_ID = 'v2'

describe('Changes test', () => {
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
    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
  })

  describe('Added/removed/changed operations handling', () => {
    test('Add method', async () => {
      const result = await buildChangelogPackage('changelog/add-method')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }))
    })

    test('Remove method', async () => {
      const result = await buildChangelogPackage('changelog/remove-method')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    })

    test('Change method content', async () => {
      const result = await buildChangelogPackage('changelog/change-method')

      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Should match moved operations', async () => {
      const result = await buildChangelogPackage(
        'changelog/documents-matching',
        [{ fileId: 'before/spec1.yaml' }, { fileId: 'before/spec2.yaml' }],
        [{ fileId: 'after/spec1.yaml' }, { fileId: 'after/spec2.yaml' }, { fileId: 'after/evicted.yaml' }],
      )
      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 3 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 3 }))
    })

    test('Compare parametrized operations', async () => {
      const result = await buildChangelogPackage('changelog/compare-parametrized-operations')
      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
    })

    test('Remove prefix from server', async () => {
      const result = await buildChangelogPackage('changelog/remove-prefix-from-server')

      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })
  })

  describe('Diffs collecting in the root-level properties', () => {
    test('Add root servers', async () => {
      const result = await buildChangelogPackage('changelog/add-root-servers')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
    })

    test('Change root servers', async () => {
      const result = await buildChangelogPackage('changelog/change-root-servers')

      expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
    })

    test('Add security', async () => {
      const result = await buildChangelogPackage('changelog/add-security')

      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    })

    test('Add securityScheme', async () => {
      const result = await buildChangelogPackage('changelog/add-securityScheme')

      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Change securityScheme content', async () => {
      const result = await buildChangelogPackage('changelog/change-inside-securityScheme')

      expect(result).toEqual(changesSummaryMatcher({
        [UNCLASSIFIED_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [UNCLASSIFIED_CHANGE_TYPE]: 1,
      }))
    })
  })

  test('Operation changes fields are correct (REST)', async () => {
    const result = await buildChangelogPackage('changelog/operation-changes-fields-rest')

    expect(result).toEqual(operationChangesMatcher([
      expect.objectContaining({
        previousOperationId: 'order-id-post',
        operationId: 'order-orderid-post',
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

  test('Operation changes fields are correct (GQL)', async () => {
    const result = await buildChangelogPackage('changelog/operation-changes-fields-gql', [{ fileId: 'before.graphql' }], [{ fileId: 'after.graphql' }])

    expect(result).toEqual(operationChangesMatcher([
      expect.objectContaining({
        previousOperationId: 'query-fruits',
        operationId: 'query-fruits',
        previousMetadata: {
          'title': 'Fruits',
          'tags': ['queries'],
          'method': 'fruits',
          'type': 'query',
        },
        metadata: {
          'title': 'Fruits',
          'tags': ['queries'],
          'method': 'fruits',
          'type': 'query',
        },
        // rest of the fields are covered by dedicated tests
      }),
    ]))
  })
})
