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
  ChangeMessage,
  ChangeSummary,
  ComparisonInternalDocument,
  DeprecateItem,
  EMPTY_CHANGE_SUMMARY,
  MessageSeverity,
  NotificationMessage,
  OperationChanges,
  type OperationsApiType,
  OperationType,
  REST_API_TYPE,
  VersionsComparison,
  ZippableDocument,
} from '../../src'
import { JsonPath } from 'json-crawl'
import { ActionType, Diff, DIFFS_AGGREGATED_META_KEY, DiffType } from '@netcracker/qubership-apihub-api-diff'
import {
  ArrayContaining,
  AsymmetricMatcher,
  ExpectedRecursive,
  ObjectContaining,
  RecursiveMatcher,
} from '../../.jest/jasmin'
import { extractSecuritySchemesNames } from '../../src/apitypes/rest/rest.utils'
import { isObject } from '../../src/utils'
import type { OpenAPIV3 } from 'openapi-types'
import { deserializeDocument } from './utils'

type SecuritySchemesObject = OpenAPIV3.ComponentsObject['securitySchemes']

export type ApihubComparisonMatcher = ObjectContaining<VersionsComparison> & VersionsComparison
export type ApihubOperationChangesMatcher = ObjectContaining<OperationChanges> & OperationChanges
export type ApihubChangesSummaryMatcher = ObjectContaining<ChangeSummary> & ChangeSummary
export type ApihubNotificationsMatcher = ObjectContaining<BuildResult> & BuildResult
export type ApihubNotificationMatcher = ObjectContaining<NotificationMessage> & NotificationMessage
export type ApihubChangeMessagesMatcher = ArrayContaining<ChangeMessage> & ChangeMessage[]
export type ApihubExportDocumentsMatcher = ObjectContaining<BuildResult> & BuildResult
export type ApihubExportDocumentMatcher = ObjectContaining<ZippableDocument> & ZippableDocument
export type ApihubComparisonDocumentMatcher = ObjectContaining<ComparisonInternalDocument> & ComparisonInternalDocument

export function apihubComparisonMatcher(
  expected: RecursiveMatcher<VersionsComparison>,
): ApihubComparisonMatcher {
  return expect.arrayContaining([
    expect.objectContaining(expected),
  ])
}

export function apihubOperationChangesMatcher(
  expected: RecursiveMatcher<OperationChanges>,
): ApihubOperationChangesMatcher {
  return expect.arrayContaining([
    expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining(expected),
      ]),
    }),
  ])
}

export function noChangesMatcher(
  apiType: OperationsApiType = REST_API_TYPE,
): ApihubChangesSummaryMatcher {
  return operationTypeMatcher({
    apiType: apiType,
    changesSummary: EMPTY_CHANGE_SUMMARY,
    numberOfImpactedOperations: EMPTY_CHANGE_SUMMARY,
  })
}

export function changesSummaryMatcher(
  expected: Partial<ChangeSummary>,
  apiType: OperationsApiType = REST_API_TYPE,
): ApihubChangesSummaryMatcher {
  return operationTypeMatcher({
    apiType: apiType,
    changesSummary: expect.objectContaining({
      ...EMPTY_CHANGE_SUMMARY,
      ...expected,
    }),
  })
}

export function numberOfImpactedOperationsMatcher(
  expected: Partial<ChangeSummary>,
  apiType: OperationsApiType = REST_API_TYPE,
): ApihubChangesSummaryMatcher {
  return operationTypeMatcher({
    apiType: apiType,
    numberOfImpactedOperations: expect.objectContaining({
      ...EMPTY_CHANGE_SUMMARY,
      ...expected,
    }),
  })
}

export function operationTypeMatcher(
  expected: RecursiveMatcher<OperationType>,
): ApihubChangesSummaryMatcher {
  return expect.objectContaining({
    comparisons: expect.arrayContaining([
      expect.objectContaining({
        operationTypes: expect.arrayContaining([
          expect.objectContaining(expected),
        ]),
      }),
    ]),
  },
  )
}

export function comparisonDocumentDiffMatcher(
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

export function apihubChangeMessageMatcher(
  path: JsonPath,
  action: ActionType,
): ApihubChangeMessagesMatcher {
  return apihubChangeMessagesMatcher([
    expect.objectContaining({
      jsonPath: path,
      action: action,
    }),
  ])
}

export function apihubChangeMessagesMatcher(
  expected: Array<RecursiveMatcher<ChangeMessage>>,
): ApihubChangeMessagesMatcher {
  return expect.arrayContaining([
    expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({
          changes: expect.toIncludeSameMembers(expected),
        }),
      ]),
    }),
  ])
}

export function deprecatedItemDescriptionMatcher(
  description: string,
): Matcher {
  return expect.objectContaining({
    description: description,
  })
}

type Matcher = ObjectContaining<DeprecateItem>

export function notificationsMatcher(
  expected: Array<RecursiveMatcher<NotificationMessage>>,
): ApihubNotificationsMatcher {
  return expect.objectContaining({
    notifications: expect.toIncludeSameMembers(expected),
  },
  )
}

export function notificationMatcher(
  severity: MessageSeverity,
  message: string | RegExp,
): ApihubNotificationMatcher {
  const expected: Partial<NotificationMessage> = {
    message: expect.stringMatching(message),
    severity: severity,
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
