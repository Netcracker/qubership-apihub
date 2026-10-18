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
  BuildResult,
  ComparisonInternalDocument,
  DeprecateItem,
  MessageSeverity,
  NotificationMessage,
  OperationChanges,
  ZippableDocument,
} from '../../src'
import { Diff, DIFFS_AGGREGATED_META_KEY, DiffType } from '@netcracker/qubership-apihub-api-diff'
import {
  AsymmetricMatcher,
  ExpectedRecursive,
  ObjectContaining,
  RecursiveMatcher,
} from '../../.jest/jasmin'
import { extractSecuritySchemesNames } from '../../src/apitypes/rest/rest.utils'
import { isObject } from '../../src/utils'
import type { OpenAPIV3 } from 'openapi-types'
import { deserializeDocument } from './documents'

type SecuritySchemesObject = OpenAPIV3.ComponentsObject['securitySchemes']

export type ApihubOperationChangesMatcher = ObjectContaining<OperationChanges> & OperationChanges
export type ApihubNotificationsMatcher = ObjectContaining<BuildResult> & BuildResult
export type ApihubNotificationMatcher = ObjectContaining<NotificationMessage> & NotificationMessage
export type ApihubExportDocumentsMatcher = ObjectContaining<BuildResult> & BuildResult
export type ApihubExportDocumentMatcher = ObjectContaining<ZippableDocument> & ZippableDocument
type ApihubComparisonDocumentMatcher = ObjectContaining<ComparisonInternalDocument> & ComparisonInternalDocument

function comparisonDocumentDiffMatcher(
  expected: RecursiveMatcher<{ serializedComparisonDocument: AsymmetricMatcher<string> }>,
): ApihubComparisonDocumentMatcher {
  return expect.objectContaining({
      comparisons: expect.arrayContaining([
        expect.objectContaining({
          comparisonInternalDocuments: expect.arrayContaining([
            expect.objectContaining(expected),
          ]),
        }),
      ]),
    },
  )
}

export function operationChangesMatcher(
  expected: Array<ExpectedRecursive<OperationChanges>>,
): ApihubOperationChangesMatcher {
  return expect.objectContaining({
    comparisons: expect.arrayContaining([
      expect.objectContaining({
        data: expect.toIncludeSameMembers(expected),
      }),
    ]),
  },
  )
}

/**
 * One entry of the list `operationChangesMatcher` expects: an operation compared with its previous version. Both
 * ids are always spelled out, the same one twice when the operation was not renamed.
 */
export function changedOperationMatcher(
  operationId: string,
  previousOperationId: string,
): ApihubOperationChangesMatcher {
  return expect.objectContaining({ operationId, previousOperationId })
}

export function deprecatedItemDescriptionMatcher(
  description: string,
): Matcher {
  return expect.objectContaining({
    description: description,
  })
}

type Matcher = ObjectContaining<DeprecateItem>

/**
 * The whole notification list as a set: every notification the build reported matches one of `expected`, and
 * none is left over. For one notification of a known category use `notificationOf`; to count or filter, use
 * `errorNotificationsOf`, `warningNotificationsOf` or `notificationsInCategory`.
 */
export function notificationsMatcher(
  expected: Array<RecursiveMatcher<NotificationMessage>>,
): ApihubNotificationsMatcher {
  return expect.objectContaining({
    notifications: expect.toIncludeSameMembers(expected),
  },
  )
}

/** One element of the list `notificationsMatcher` expects, matched by severity and message. */
export function notificationMatcher(
  severity: MessageSeverity,
  message: string | RegExp,
  // category and documentId are asserted only where the test is about attribution
  expectedAttribution: Partial<Pick<NotificationMessage, 'category' | 'documentId'>> = {},
): ApihubNotificationMatcher {
  const expected: Partial<NotificationMessage> = {
    message: expect.stringMatching(message),
    severity: severity,
    ...expectedAttribution,
  }

  return expect.objectContaining(expected)
}

export function exportDocumentsMatcher(
  expected: Array<RecursiveMatcher<ZippableDocument>>,
): ApihubExportDocumentsMatcher {
  return expect.objectContaining({
    exportDocuments: expect.toIncludeSameMembers(expected),
  },
  )
}

export function exportDocumentMatcher(
  filename: string,
): ApihubExportDocumentMatcher {
  return expect.objectContaining({
    filename: filename,
  })
}

/**
 * Custom matcher to verify that security schemes in result match exactly the schemes used in security requirements
 */
export function securitySchemesFromRequirementsMatcher(
  securityRequirements: OpenAPIV3.SecurityRequirementObject[],
): AsymmetricMatcher<SecuritySchemesObject> {
  const expectedSchemes = Array.from(extractSecuritySchemesNames(securityRequirements))

  return {
    asymmetricMatch: (actual: SecuritySchemesObject): boolean => {
      if (!actual) {
        return false
      }

      const actualSchemes = Object.keys(actual)

      // Check that all expected schemes are present
      const hasAllExpected = expectedSchemes.every(scheme => actualSchemes.includes(scheme))

      // Check that no extra schemes are present
      const hasOnlyExpected = actualSchemes.every(scheme => expectedSchemes.includes(scheme))

      return hasAllExpected && hasOnlyExpected
    },
    jasmineToString: () => `securitySchemesFromRequirements(${JSON.stringify(expectedSchemes)})`,
  }
}

export function serializedComparisonDocumentMatcher(
  apiKinds: DiffType[],
): AsymmetricMatcher<string> {
  const extractAllDiffsFromDocument = (deserializedDoc: unknown): Diff[] => {
    if (!isObject(deserializedDoc)) {
      return []
    }
    const diffs: Diff[] = []
    if (DIFFS_AGGREGATED_META_KEY in deserializedDoc) {
      const aggregatedDiffs = (deserializedDoc as Record<symbol, unknown>)[DIFFS_AGGREGATED_META_KEY]
      if (aggregatedDiffs instanceof Set) {
        return Array.from(aggregatedDiffs)
      }
    }
    return diffs
  }

  return comparisonDocumentDiffMatcher({
    serializedComparisonDocument: {
      asymmetricMatch: (actual: string): boolean => {
        try {
          const deserializedDoc = deserializeDocument(actual)
          const diffs = extractAllDiffsFromDocument(deserializedDoc)

          // TODO: It works, but it is too specialized (only works if there's exactly one diff). Would be better to do it by diffsMatcher
          const diffTypes = new Set(diffs.map(diff => diff.type))
          return apiKinds.every(apiKind => diffTypes.has(apiKind))
        } catch (error) {
          return false
        }
      },
    },
  })
}
