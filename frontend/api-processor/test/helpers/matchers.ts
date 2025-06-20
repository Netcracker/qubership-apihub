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
  DeprecateItem,
  EMPTY_CHANGE_SUMMARY,
  MESSAGE_SEVERITY,
  NotificationMessage,
  OperationChanges,
  type OperationsApiType,
  OperationType,
  REST_API_TYPE,
  VersionsComparison,
  ZippableDocument,
} from '../../src'
import { JsonPath } from 'json-crawl'
import { ActionType } from '@netcracker/qubership-apihub-api-diff'
import { ArrayContaining, ObjectContaining, RecursiveMatcher } from '../../.jest/jasmin'

export type ApihubComparisonMatcher = ObjectContaining<VersionsComparison> & VersionsComparison
export type ApihubOperationChangesMatcher = ObjectContaining<OperationChanges> & OperationChanges
export type ApihubChangesSummaryMatcher = ObjectContaining<ChangeSummary> & ChangeSummary
export type ApihubNotificationsMatcher = ObjectContaining<BuildResult> & BuildResult
export type ApihubErrorNotificationMatcher = ObjectContaining<NotificationMessage> & NotificationMessage
export type ApihubChangeMessagesMatcher = ArrayContaining<ChangeMessage> & ChangeMessage[]
export type ApihubExportDocumentsMatcher = ObjectContaining<BuildResult> & BuildResult
export type ApihubExportDocumentMatcher = ObjectContaining<ZippableDocument> & ZippableDocument

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

export function errorNotificationMatcher(
  message: string | RegExp,
): ApihubErrorNotificationMatcher {
  return expect.objectContaining({
    message: expect.stringMatching(message),
    severity: MESSAGE_SEVERITY.Error,
  })
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
