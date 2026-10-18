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

import { describe, test, expect } from '@jest/globals'
import { buildChangelogPackage, changesSummaryMatcher, noChangesMatcher, numberOfImpactedOperationsMatcher, operationChangesMatcher } from './helpers'
import { BREAKING_CHANGE_TYPE, NON_BREAKING_CHANGE_TYPE, UNCLASSIFIED_CHANGE_TYPE } from '../src/types/external/comparison'

describe('Security Diff Collection', () => {
  describe('Operation Explicit Security Precedence', () => {
    test('Operation with explicit security ignores global security changes', async () => {
      const result = await buildChangelogPackage('changelog/security/operation-security-precedence/global-changes-ignored')

      expect(result).toEqual(noChangesMatcher())
    })

    test('Operation security changes are reported for operation with explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/operation-security-precedence/operation-security-changes')

      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Operation security changes reported, global changes ignored', async () => {
      const result = await buildChangelogPackage('changelog/security/operation-security-precedence/both-change')

      // Both global and operation security change
      // Expected: Only operation security diffs reported
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Add explicit operation security', async () => {
      const result = await buildChangelogPackage('changelog/security/operation-security-precedence/adds-explicit-security')

      // Operation adds explicit security
      // Expected: Diffs for adding operation security
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
    })
  })

  describe('Global Security Fallback', () => {
    test('Global security changes affect operations without explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/global-security-fallback/global-security-changes')

      // Global security changes, operation has no explicit security
      // Expected: Diffs from global security change
      // todo: fix the ER once api-diff classification is changed
      expect(result).toEqual(changesSummaryMatcher({
        [UNCLASSIFIED_CHANGE_TYPE]: 2,
      }))
    })

    test('Adding global security affects operations without explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/global-security-fallback/add-global-security')

      // Global security added
      // Expected: Diffs for adding global security
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Removing global security affects operations without explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/global-security-fallback/remove-global-security')

      // Global security removed
      // Expected: Diffs for removing global security
      expect(result).toEqual(changesSummaryMatcher({
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Removing operation security shows change', async () => {
      const result = await buildChangelogPackage('changelog/security/global-security-fallback/removes-explicit-security')

      // Operation removes explicit security, global exists
      // Expected: Diffs for removing operation security
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
    })
  })

  describe('Empty Security Array', () => {
    test('Operation with explicit empty array as security ignores global changes', async () => {
      const result = await buildChangelogPackage('changelog/security/empty-security-array/empty-array-global-changes')

      expect(result).toEqual(noChangesMatcher())
    })

    test('Adding empty security array to operation', async () => {
      const result = await buildChangelogPackage('changelog/security/empty-security-array/add-empty-array')

      // Operation adds security: []
      // Expected: Diffs for adding empty security
      expect(result).toEqual(changesSummaryMatcher({
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Removing empty security array from operation causes global security to be applied', async () => {
      const result = await buildChangelogPackage('changelog/security/empty-security-array/remove-empty-array')

      // Operation removes security: []
      // Expected: Diffs for removing empty security
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Changing from real security to empty array', async () => {
      const result = await buildChangelogPackage('changelog/security/empty-security-array/change-to-empty-array')

      // Operation security changes to []
      // Expected: Diffs for changing operation security
      expect(result).toEqual(changesSummaryMatcher({
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })
  })

  describe('Security Scheme Relevance', () => {
    test('Security scheme used in operation security changes', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/scheme-used-in-security-changes')

      // Operation uses ApiKeyAuth, ApiKeyAuth scheme changes
      // Expected: Diffs for security scheme change
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Unused scheme removed from components', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/unused-scheme-removed')

      expect(result).toEqual(noChangesMatcher())
    })

    test('Unused scheme added to components', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/unused-scheme-added')

      expect(result).toEqual(noChangesMatcher())
    })

    test('Unused security scheme changes are not reported', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/unused-scheme-changes')

      expect(result).toEqual(noChangesMatcher())
    })

    test('Security scheme used in global security is not reported if operation has explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/global-scheme-changes-ignored')

      expect(result).toEqual(noChangesMatcher())
    })

    test('Operation uses multiple schemes, several schemes changes', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/multiple-schemes-changes')

      // Operation uses ApiKeyAuth and OAuth2, ApiKeyAuth and OAuth2 changes
      // Expected: Diffs for ApiKeyAuth scheme change only
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [UNCLASSIFIED_CHANGE_TYPE]: 1, // todo: fix the ER once api-diff classification is changed
      }))
    })

    test('Security scheme used in global security changes are reported if operation has no explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/used-global-scheme-changes')

      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
    })

    test('Scheme added to components and used by operation', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/add-and-use-schema-in-operation')

      // ApiKeyAuth scheme added, operation adds security using it
      // Expected: Operation has diffs for adding operation security and scheme
      // todo: fix the ER once api-diff classification is changed, adding schema in components should not be breaking
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 2,
      }))
    })

    test('Scheme removed from components, still referenced', async () => {
      const result = await buildChangelogPackage('changelog/security/scheme-relevance/scheme-removed-still-referenced')

      // ApiKeyAuth scheme removed, still referenced by operation
      // Expected: Operation has diffs for removing scheme
      // todo: fix the ER once api-diff classification is changed
      // removing schema from components should be annotation
      // security scheme for which there is not definition should be removed by api-unifier during validation?
      expect(result).toEqual(changesSummaryMatcher({
        [NON_BREAKING_CHANGE_TYPE]: 1,
      }))
    })
  })

  describe('Multiple Operations - Different Security Configurations', () => {
    test('One operation has explicit security, another uses global, global changes', async () => {
      const result = await buildChangelogPackage('changelog/security/multiple-operations/op1-explicit-op2-global')

      //todo: fix the ER once api-diff classification is changed
      // both changes to root security and security scheme definitions in components are reported
      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
        [UNCLASSIFIED_CHANGE_TYPE]: 2,
      }))

      // only operation without explicit security is impacted
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
        [UNCLASSIFIED_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'test2-get',
          previousOperationId: 'test2-get',
        }),
      ]))
    })

    test('Security scheme used by one operation only', async () => {
      const result = await buildChangelogPackage('changelog/security/multiple-operations/explicit-security-schema-used-by-one-operation-changes')

      //todo: fix the ER once api-diff classification is changed
      expect(result).toEqual(changesSummaryMatcher({
        [UNCLASSIFIED_CHANGE_TYPE]: 1,
      }))

      // only operation which uses changed security scheme is reported
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [UNCLASSIFIED_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'test1-get',
          previousOperationId: 'test1-get',
        }),
      ]))
    })

    test('Security scheme used by global, affects only operations without explicit security', async () => {
      const result = await buildChangelogPackage('changelog/security/multiple-operations/scheme-global-affects-subset')

      expect(result).toEqual(changesSummaryMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))

      // only operation which does not have explicit security is affected by security scheme change used in global security
      expect(result).toEqual(numberOfImpactedOperationsMatcher({
        [BREAKING_CHANGE_TYPE]: 1,
      }))
      expect(result).toEqual(operationChangesMatcher([
        expect.objectContaining({
          operationId: 'test2-get',
          previousOperationId: 'test2-get',
        }),
      ]))
    })
  })
})

